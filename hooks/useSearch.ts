
import { useMemo, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { EventListItemType, Order, Attendee, Campaign, TargetGroup } from '../types';

export type SearchResultItem = {
    id: string;
    type: 'Event' | 'Order' | 'Attendee' | 'Campaign' | 'Target Group';
    title: string;
    subtitle?: string;
    object: EventListItemType | Order | Attendee | Campaign | TargetGroup;
};

export type SearchResultAction = {
    id: string;
    type: 'Action';
    title: string;
    subtitle: string;
    action: () => void;
    isLoading: boolean;
};

export type SearchResult = SearchResultItem | SearchResultAction;

export interface SearchResultGroup {
    label: string;
    results: SearchResult[];
}

export const useSearch = (query: string) => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("useSearch must be used within an AppContextProvider");
    }

    const {
        filteredEventListItems,
        allOrders, fetchAllOrdersForSearch, loadingAllOrders,
        allAttendeesForSearch, fetchAllAttendeesForSearch, loadingAllAttendeesForSearch,
        allCampaigns, fetchAllCampaignsForSearch, loadingAllCampaigns,
        allTargetGroups, fetchAllTargetGroupsForSearch, loadingAllTargetGroups,
    } = context;

    const lowerCaseQuery = query.toLowerCase().trim();

    return useMemo(() => {
        if (!lowerCaseQuery) {
            return [];
        }

        const groups: SearchResultGroup[] = [];

        // 1. Search Events (uses already loaded list)
        const eventResults = filteredEventListItems
            .filter(event => (event.name || '').toLowerCase().includes(lowerCaseQuery))
            .slice(0, 5)
            .map((event): SearchResultItem => ({
                id: event.id,
                type: 'Event',
                title: event.name || 'Untitled Event',
                subtitle: event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'N/A',
                object: event
            }));
        if (eventResults.length > 0) {
            groups.push({ label: 'Events', results: eventResults });
        }

        // 2. Search Orders
        const orderGroup: SearchResultGroup = { label: 'Orders', results: [] };
        if (allOrders) {
            orderGroup.results = allOrders
                .filter(order => order.buyer_name.toLowerCase().includes(lowerCaseQuery) || order.email.toLowerCase().includes(lowerCaseQuery) || order.id.includes(lowerCaseQuery))
                .slice(0, 5)
                .map((order): SearchResultItem => ({
                    id: order.id,
                    type: 'Order',
                    title: order.buyer_name,
                    subtitle: `Order #${order.id.split('-')[0]}... on ${new Date(order.created_at).toLocaleDateString()}`,
                    object: order
                }));
        } else {
            orderGroup.results.push({
                id: 'fetch-all-orders',
                type: 'Action',
                title: 'Search All Orders',
                subtitle: `Find any order by buyer name, email, or ID`,
                action: fetchAllOrdersForSearch,
                isLoading: loadingAllOrders,
            });
        }
        if (orderGroup.results.length > 0) {
            groups.push(orderGroup);
        }

        // 3. Search Attendees
        const attendeeGroup: SearchResultGroup = { label: 'Attendees', results: [] };
        if (allAttendeesForSearch) {
            attendeeGroup.results = allAttendeesForSearch
                .filter(attendee => attendee.name.toLowerCase().includes(lowerCaseQuery) || attendee.email.toLowerCase().includes(lowerCaseQuery))
                .slice(0, 5)
                .map((attendee): SearchResultItem => ({
                    id: attendee.id,
                    type: 'Attendee',
                    title: attendee.name,
                    subtitle: `Attendee at ${typeof attendee.event === 'object' ? (attendee.event.name || 'Untitled') : ''}`,
                    object: attendee
                }));
        } else {
            attendeeGroup.results.push({
                id: 'fetch-all-attendees',
                type: 'Action',
                title: 'Search All Attendees',
                subtitle: 'Find any attendee by name or email across all events',
                action: fetchAllAttendeesForSearch,
                isLoading: loadingAllAttendeesForSearch,
            });
        }
        if (attendeeGroup.results.length > 0) {
            groups.push(attendeeGroup);
        }

        // 4. Search Campaigns
        const campaignGroup: SearchResultGroup = { label: 'Campaigns', results: [] };
        if (allCampaigns) {
            campaignGroup.results = allCampaigns
                .filter(campaign => campaign.name.toLowerCase().includes(lowerCaseQuery))
                .slice(0, 5)
                .map((campaign): SearchResultItem => ({
                    id: campaign.id,
                    type: 'Campaign',
                    title: campaign.name,
                    subtitle: `State: ${campaign.state}`,
                    object: campaign
                }));
        } else {
            campaignGroup.results.push({
                id: 'fetch-all-campaigns',
                type: 'Action',
                title: 'Search All Campaigns',
                subtitle: 'Find any marketing campaign by name',
                action: fetchAllCampaignsForSearch,
                isLoading: loadingAllCampaigns,
            });
        }
        if (campaignGroup.results.length > 0) {
            groups.push(campaignGroup);
        }

        // 5. Search Target Groups
        const targetGroupGroup: SearchResultGroup = { label: 'Target Groups', results: [] };
        if (allTargetGroups) {
            targetGroupGroup.results = allTargetGroups
                .filter(tg => tg.name.toLowerCase().includes(lowerCaseQuery))
                .slice(0, 5)
                .map((tg): SearchResultItem => ({
                    id: tg.id,
                    type: 'Target Group',
                    title: tg.name,
                    subtitle: `Kind: ${tg.kind}`,
                    object: tg
                }));
        } else {
            targetGroupGroup.results.push({
                id: 'fetch-all-target-groups',
                type: 'Action',
                title: 'Search All Target Groups',
                subtitle: 'Find any target group by name',
                action: fetchAllTargetGroupsForSearch,
                isLoading: loadingAllTargetGroups,
            });
        }
        if (targetGroupGroup.results.length > 0) {
            groups.push(targetGroupGroup);
        }


        return groups;

    }, [
        lowerCaseQuery, 
        filteredEventListItems, 
        allOrders, fetchAllOrdersForSearch, loadingAllOrders,
        allAttendeesForSearch, fetchAllAttendeesForSearch, loadingAllAttendeesForSearch,
        allCampaigns, fetchAllCampaignsForSearch, loadingAllCampaigns,
        allTargetGroups, fetchAllTargetGroupsForSearch, loadingAllTargetGroups
    ]);
};
