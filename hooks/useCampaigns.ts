

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Campaign, Order, LedgerEntry, ProcessedCampaign } from '../types';
import { BillettoApiClient, BillettoApiError, BillettoErrorType } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const getCampaignScopeName = (event: Campaign['event']): string => {
    if (!event) return 'Global (Account-wide)';
    if (typeof event === 'object' && event !== null && event.name) return event.name;
    if (typeof event === 'string') return `Event-specific`;
    return 'Unknown Scope';
};

// Helper to process a single campaign for display and sorting
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
    // FIX: Correctly access usage_limit from the 'data' property of the campaign effect.
    usageLimit: discountEffectData?.usage_limit ?? null,
  };
};

export const useCampaigns = (apiClient: BillettoApiClient | null) => {
    const [campaigns, setCampaigns] = useState<ProcessedCampaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);
    const [lastUpdatedCampaigns, setLastUpdatedCampaigns] = useState<Date | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<{ message: string; value: number } | null>(null);

    // State for global search
    const [allCampaignsForSearch, setAllCampaignsForSearch] = useState<ProcessedCampaign[] | null>(null);
    const [loadingAllCampaigns, setLoadingAllCampaigns] = useState(false);

    const { items: sortedCampaigns, requestSort: requestCampaignSort, sortConfig: campaignSortConfig } = useSortableData<ProcessedCampaign>(campaigns, { key: 'usageCount', direction: 'descending' });

    const performFinancialAnalysis = useCallback(async (force = false) => {
        if (!apiClient) return;
        setLoadingCampaigns(true);
        setCampaignsError(null);

        if (!force) {
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
            const allCampaignsData = await fetchAllPaginatedData<Campaign>('/campaigns?expand=event', apiClient);
            
            setAnalysisProgress({ message: 'Fetching all financial records...', value: 10 });
            const allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient);
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
                    campaignOrders = await fetchAllPaginatedData<Order>(`/campaigns/${campaign.id}/orders?expand=order_lines`, apiClient);
                } catch (e) {
                    if (e instanceof BillettoApiError && e.type === BillettoErrorType.NOT_FOUND) {
                        console.warn(`Campaign ${campaign.id} (${campaign.name}) seems to have no orders endpoint or is invalid. Assuming 0 orders.`);
                        campaignOrders = [];
                    } else {
                        // For other errors, re-throw to be caught by the main catch block
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
                // ROI is undefined if there was no investment (no discounts)
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
             if (err instanceof BillettoApiError) setCampaignsError(err.message);
             else setCampaignsError('An unknown error occurred during financial analysis.');
        } finally {
            setLoadingCampaigns(false);
            setAnalysisProgress(null);
        }
    }, [apiClient]);

    const fetchAllCampaignsForSearch = useCallback(async () => {
        if (!apiClient || loadingAllCampaigns) return;
        setLoadingAllCampaigns(true);
        try {
            // Re-use fully analyzed data if available, it's the most complete list.
            const { campaigns: cached } = await db.getProcessedCampaignsCache();
            if(cached) {
                setAllCampaignsForSearch(cached);
                setLoadingAllCampaigns(false);
                return;
            }

            const data = await fetchAllPaginatedData<Campaign>('/campaigns?expand=event', apiClient);
            setAllCampaignsForSearch(data.map(processCampaign));
            // Note: We don't cache this basic list to avoid stale data conflicts with the full analysis.
            // The search will simply trigger a live fetch if the analyzed data isn't cached.
        } catch (e) {
            console.error("Failed to fetch all campaigns for search:", e);
        } finally {
            setLoadingAllCampaigns(false);
        }
    }, [apiClient, loadingAllCampaigns]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!apiClient) return;
            setLoadingCampaigns(true);
            const { campaigns: processed, lastUpdated } = await db.getProcessedCampaignsCache();
            if (processed) {
                setCampaigns(processed);
                if (lastUpdated) setLastUpdatedCampaigns(new Date(lastUpdated));
            } else {
                 const { campaignsData: basic, lastUpdated: luBasic } = await db.getCampaignsCache(1);
                 if (basic) {
                    setCampaigns(basic.data.map(processCampaign));
                    if (luBasic) setLastUpdatedCampaigns(new Date(luBasic));
                 } else {
                    try {
                        const response = await apiClient.getCampaigns(1, 100, ['event']);
                        setCampaigns(response.data.map(processCampaign));
                        await db.setCampaignsCache(1, response);
                        setLastUpdatedCampaigns(new Date());
                    } catch (err) {
                        if (err instanceof BillettoApiError) setCampaignsError(err.message);
                        else setCampaignsError('An unknown error occurred while fetching campaigns.');
                    }
                 }
            }
            setLoadingCampaigns(false);
        };

        loadInitialData();
    }, [apiClient]);

    return {
        sortedCampaigns, 
        loadingCampaigns, 
        campaignsError, 
        lastUpdatedCampaigns,
        requestCampaignSort, 
        campaignSortConfig,
        performFinancialAnalysis,
        analysisProgress,
        // For global search
        allCampaigns: allCampaignsForSearch,
        fetchAllCampaignsForSearch,
        loadingAllCampaigns,
    };
};
