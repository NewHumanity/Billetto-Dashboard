
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Campaign, Order, LedgerEntry, ProcessedCampaign } from '../types';
import { BillettoApiClient, BillettoApiError, BillettoErrorType, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';
import { CampaignSchema, OrderSchema, LedgerEntrySchema } from '../schemas';

const getCampaignScopeName = (event: Campaign['event']): string => {
    if (!event) return 'Global (Account-wide)';
    if (typeof event === 'object' && event !== null && event.name) return event.name;
    if (typeof event === 'string') return `Event-specific`;
    return 'Unknown Scope';
};

const processCampaign = (campaign: Campaign): ProcessedCampaign => {
  const firstEffect = campaign.effects?.data?.[0];
  const discountEffectData = firstEffect?.data;

  let discountDisplay = 'N/A';
  let discountValueForSort = 0;
  if (firstEffect?.type === 'percentage-discount-ticket-type-price' && discountEffectData?.percentage_discount) {
    const discount = Number(discountEffectData.percentage_discount);
    discountDisplay = `${discount}% OFF`;
    discountValueForSort = discount;
  }

  const eventName = getCampaignScopeName(campaign.event);

  return {
    ...campaign,
    eventName,
    discountDisplay,
    discountValueForSort,
    usageCount: campaign.applications_count,
    usageLimit: firstEffect?.usage_limit ?? null,
  };
};

export const useCampaigns = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [campaigns, setCampaigns] = useState<ProcessedCampaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);
    const [lastUpdatedCampaigns, setLastUpdatedCampaigns] = useState<Date | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<{ message: string; value: number } | null>(null);

    const [allCampaignsForSearch, setAllCampaignsForSearch] = useState<ProcessedCampaign[] | null>(null);
    const [loadingAllCampaigns, setLoadingAllCampaigns] = useState(false);

    const { items: sortedCampaigns, requestSort: requestCampaignSort, sortConfig: campaignSortConfig } = useSortableData<ProcessedCampaign>(campaigns, { key: 'usageCount', direction: 'descending' });

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    const fetchBasicCampaigns = useCallback(async (isBackgroundRefresh = false) => {
        if (!apiClient) return;

        if (isBackgroundRefresh) {
            setIsRefreshing(true);
        } else {
            setLoadingCampaigns(true);
        }
        setCampaignsError(null);
        try {
            const response = await apiClient.getCampaigns(1, 100, ['event']);
            setCampaigns(response.data.map(processCampaign));
            await db.setCampaignsCache(1, response);
            setLastUpdatedCampaigns(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast('Campaign list is up to date.', 'info');
                setLastUpdatedCampaigns(new Date());
            } else if (err instanceof BillettoApiError) {
                setCampaignsError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setCampaignsError('An unknown error occurred while fetching campaigns.');
            }
        } finally {
            if (isBackgroundRefresh) {
                setIsRefreshing(false);
            } else {
                setLoadingCampaigns(false);
            }
        }
    }, [apiClient, addToast]);

    const performFinancialAnalysis = useCallback(async (forceRefresh = false) => {
        if (!apiClient) return;
        setLoadingCampaigns(true);
        setCampaignsError(null);

        if (!forceRefresh) {
            const { campaigns: cached, lastUpdated } = await db.getProcessedCampaignsCache();
            if (cached) {
                setCampaigns(cached);
                if (lastUpdated) setLastUpdatedCampaigns(new Date(lastUpdated));
                setLoadingCampaigns(false);
                return;
            }
        }
        
        try {
            setAnalysisProgress({ message: 'Fetching all campaigns...', value: 0 });
            const allCampaignsData = await fetchAllPaginatedData<Campaign>('/campaigns', apiClient, 5, undefined, undefined, onRateLimit, CampaignSchema);
            
            setAnalysisProgress({ message: 'Fetching all financial records...', value: 10 });
            const allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, undefined, undefined, onRateLimit, LedgerEntrySchema);
            const ledgerMapByOrder = allLedgerEntries.reduce((map, entry) => {
                if (entry.order_id) {
                    const orderId = String(entry.order_id);
                    if (!map.has(orderId)) map.set(orderId, []);
                    map.get(orderId)!.push(entry);
                }
                return map;
            }, new Map<string, LedgerEntry[]>());

            const processedCampaignsWithFinance: ProcessedCampaign[] = [];
            
            for (let i = 0; i < allCampaignsData.length; i++) {
                const campaign = allCampaignsData[i];
                const progressValue = 20 + (i / allCampaignsData.length) * 80;
                setAnalysisProgress({ message: `Analyzing campaign ${i + 1} of ${allCampaignsData.length}: ${campaign.name}`, value: progressValue });

                if (campaign.applications_count === 0) {
                    processedCampaignsWithFinance.push({
                        ...processCampaign(campaign),
                        usageCount: 0,
                        generatedRevenue: 0,
                        totalDiscounts: 0,
                        netRevenue: 0,
                        averageOrderValue: 0,
                        currency: undefined,
                        roi: undefined,
                    });
                    continue;
                }

                let campaignOrders: Order[] = [];
                try {
                    campaignOrders = await fetchAllPaginatedData<Order>(`/campaigns/${campaign.id}/orders?expand=order_lines`, apiClient, 5, undefined, undefined, onRateLimit, OrderSchema);
                } catch (e) {
                    if (e instanceof BillettoApiError && e.type === BillettoErrorType.NOT_FOUND) {
                        console.warn(`Campaign ${campaign.id} (${campaign.name}) seems to have no orders endpoint or is invalid. Assuming 0 orders.`);
                        campaignOrders = [];
                    } else {
                        throw e;
                    }
                }
                
                let generatedRevenue = 0;
                let totalDiscounts = 0;
                let totalPayout = 0;
                const ticketPerformance: { [key: string]: number } = {};

                for (const order of campaignOrders) {
                    const orderLedger = ledgerMapByOrder.get(order.id);
                    let hasDiscount = false;
                    if (orderLedger) {
                        for (const entry of orderLedger) {
                            if (entry.entry_type === 'ORDER_REVENUE') generatedRevenue += entry.amount;
                            if (entry.entry_type === 'DISCOUNTS') {
                                totalDiscounts += entry.amount;
                                hasDiscount = true;
                            }
                        }
                    }
                    totalPayout += order.payout;

                    if (hasDiscount) {
                        order.order_lines.data.forEach(line => {
                            ticketPerformance[line.name] = (ticketPerformance[line.name] || 0) + line.quantity;
                        });
                    }
                }

                const ticketTypePerformance = Object.entries(ticketPerformance)
                    .map(([name, count]) => ({ text: name, count }))
                    .sort((a, b) => b.count - a.count);

                const netRevenue = generatedRevenue + totalDiscounts;
                const averageOrderValue = campaignOrders.length > 0 ? totalPayout / campaignOrders.length : 0;
                const currency = campaignOrders[0]?.currency;
                const investment = Math.abs(totalDiscounts);
                const roi = investment > 0 ? (netRevenue / investment) * 100 : undefined;

                processedCampaignsWithFinance.push({
                    ...processCampaign(campaign),
                    usageCount: campaignOrders.length, 
                    generatedRevenue,
                    totalDiscounts,
                    netRevenue,
                    averageOrderValue,
                    currency,
                    roi,
                    ticketTypePerformance: ticketTypePerformance.length > 0 ? ticketTypePerformance : undefined,
                });
            }

            setCampaigns(processedCampaignsWithFinance);
            await db.setProcessedCampaignsCache(processedCampaignsWithFinance);
            setLastUpdatedCampaigns(new Date());

        } catch (err) {
             if (err instanceof NotModifiedError) {
                console.log("Campaign financial analysis data is fresh (304).");
                setLastUpdatedCampaigns(new Date());
             } else if (err instanceof BillettoApiError) {
                 setCampaignsError(err.message);
             } else if (err instanceof Error && err.name !== 'CancellationError') {
                 setCampaignsError('An unknown error occurred during financial analysis.');
             }
        } finally {
            setLoadingCampaigns(false);
            setAnalysisProgress(null);
        }
    }, [apiClient, onRateLimit]);

    const fetchAllCampaignsForSearch = useCallback(async () => {
        if (!apiClient || loadingAllCampaigns) return;
        setLoadingAllCampaigns(true);
        try {
            const { campaigns: cached } = await db.getProcessedCampaignsCache();
            if(cached) {
                setAllCampaignsForSearch(cached);
                setLoadingAllCampaigns(false);
                return;
            }

            const data = await fetchAllPaginatedData<Campaign>('/campaigns', apiClient, 5, undefined, undefined, onRateLimit, CampaignSchema);
            setAllCampaignsForSearch(data.map(processCampaign));
        } catch (e) {
            console.error("Failed to fetch all campaigns for search:", e);
        } finally {
            setLoadingAllCampaigns(false);
        }
    }, [apiClient, loadingAllCampaigns, onRateLimit]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!apiClient) {
                setLoadingCampaigns(false);
                return;
            };

            setLoadingCampaigns(true);
            const { campaigns: processed, lastUpdated } = await db.getProcessedCampaignsCache();
            if (processed) {
                setCampaigns(processed);
                if (lastUpdated) setLastUpdatedCampaigns(new Date(lastUpdated));
                setLoadingCampaigns(false);
                // No auto-refresh for this heavy view, user must trigger it.
            } else {
                 const { campaignsData: basic, lastUpdated: luBasic } = await db.getCampaignsCache(1);
                 if (basic) {
                    setCampaigns(basic.data.map(processCampaign));
                    if (luBasic) setLastUpdatedCampaigns(new Date(luBasic));
                    setLoadingCampaigns(false);
                    fetchBasicCampaigns(true); // stale-while-revalidate for basic data
                 } else {
                    fetchBasicCampaigns(false); // initial full load
                 }
            }
        };

        loadInitialData();
    }, [apiClient, fetchBasicCampaigns]);

    return {
        sortedCampaigns, 
        loadingCampaigns,
        isRefreshingCampaigns: isRefreshing,
        campaignsError, 
        lastUpdatedCampaigns,
        requestCampaignSort, 
        campaignSortConfig,
        performFinancialAnalysis,
        analysisProgress,
        allCampaigns: allCampaignsForSearch,
        fetchAllCampaignsForSearch,
        loadingAllCampaigns,
    };
};
