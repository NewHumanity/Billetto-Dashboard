
import { useState, useCallback, useEffect } from 'react';
import { Campaign, Order } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';

const CAMPAIGNS_PER_PAGE = 100;
const CAMPAIGN_ORDERS_PER_PAGE = 100;

export const useCampaigns = (apiClient: BillettoApiClient | null) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(false);
    const [campaignsError, setCampaignsError] = useState<string | null>(null);
    const [campaignsPagination, setCampaignsPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedCampaigns, setLastUpdatedCampaigns] = useState<Date | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const [campaignDetails, setCampaignDetails] = useState<{ campaign: Campaign | null, orders: Order[] }>({ campaign: null, orders: [] });
    const [campaignOrdersPage, setCampaignOrdersPage] = useState(1);
    const [campaignOrdersTotal, setCampaignOrdersTotal] = useState(0);
    const [loadingCampaignDetails, setLoadingCampaignDetails] = useState<boolean>(false);
    const [campaignDetailsError, setCampaignDetailsError] = useState<string | null>(null);

    const { items: sortedCampaigns, requestSort: requestCampaignSort, sortConfig: campaignSortConfig } = useSortableData(campaigns, { key: 'name', direction: 'ascending' });

    const fetchAndCacheCampaigns = useCallback(async (page = 1) => {
        if (!apiClient) return;
        setLoadingCampaigns(true);
        setCampaignsError(null);
        try {
            const response = await apiClient.getCampaigns(page, CAMPAIGNS_PER_PAGE, ['event']);
            setCampaigns(response.data);
            setCampaignsPagination({ currentPage: page, total: response.total });
            await db.setCampaignsCache(page, response);
            const { lastUpdated } = await db.getCampaignsCache(page);
            if (lastUpdated) setLastUpdatedCampaigns(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setCampaignsError(err.message);
            else setCampaignsError('An unknown error occurred while fetching campaigns.');
        } finally {
            setLoadingCampaigns(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedCampaigns = async () => {
            const { campaignsData: cachedCampaigns, lastUpdated: luCampaigns } = await db.getCampaignsCache(1);
            if (cachedCampaigns) {
                setCampaigns(cachedCampaigns.data);
                setCampaignsPagination({ currentPage: 1, total: cachedCampaigns.total });
                if (luCampaigns) setLastUpdatedCampaigns(new Date(luCampaigns));
            } else {
                fetchAndCacheCampaigns(1);
            }
        };
        if (apiClient) {
            loadCachedCampaigns();
        }
    }, [apiClient, fetchAndCacheCampaigns]);

    useEffect(() => {
        const fetchCampaignOrders = async () => {
            if (!selectedCampaignId || !apiClient) return;
            setLoadingCampaignDetails(true);
            setCampaignDetailsError(null);
            
            try {
                const cached = await db.getCampaignOrdersCache(selectedCampaignId, campaignOrdersPage);
                if (cached) {
                    setCampaignDetails(prev => ({ ...prev, orders: cached.data }));
                    setCampaignOrdersTotal(cached.total);
                    setLoadingCampaignDetails(false);
                    return;
                }
                
                const response = await apiClient.getCampaignOrders(selectedCampaignId, campaignOrdersPage, CAMPAIGN_ORDERS_PER_PAGE, ['event']);
                setCampaignDetails(prev => ({ ...prev, orders: response.data }));
                setCampaignOrdersTotal(response.total);
                await db.setCampaignOrdersCache(selectedCampaignId, campaignOrdersPage, response);
            } catch (err) {
                if (err instanceof BillettoApiError) setCampaignDetailsError(err.message);
                else setCampaignDetailsError('An unknown error occurred while fetching campaign orders.');
            } finally {
                setLoadingCampaignDetails(false);
            }
        };

        if (selectedCampaignId) {
            fetchCampaignOrders();
        }
    }, [selectedCampaignId, campaignOrdersPage, apiClient]);

    const handleCampaignPageChange = async (page: number) => {
        setCampaignsPagination(prev => ({ ...prev, currentPage: page }));
        const { campaignsData } = await db.getCampaignsCache(page);
        if (campaignsData) {
            setCampaigns(campaignsData.data);
            setCampaignsPagination({ currentPage: page, total: campaignsData.total });
        } else {
            fetchAndCacheCampaigns(page);
        }
    };
    
    const handleSelectCampaign = (campaignId: string) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign && campaign.usage_count > 0) {
            setCampaignDetails({ campaign, orders: [] });
            setCampaignOrdersPage(1);
            setCampaignOrdersTotal(0);
            setSelectedCampaignId(campaignId);
        }
    };

    return {
        sortedCampaigns, loadingCampaigns, campaignsError, lastUpdatedCampaigns,
        fetchAndCacheCampaigns, campaignsPagination, handleCampaignPageChange,
        requestCampaignSort, campaignSortConfig,
        handleSelectCampaign, selectedCampaignId, setSelectedCampaignId,
        campaignDetails, loadingCampaignDetails, campaignDetailsError,
        campaignOrdersPage, setCampaignOrdersPage, campaignOrdersTotal
    };
};