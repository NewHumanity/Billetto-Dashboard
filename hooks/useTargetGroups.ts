
import { useState, useCallback, useEffect } from 'react';
import { TargetGroup, TargetGroupMember } from '../types';
import { BillettoApiClient, BillettoApiError, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';
import { TargetGroupSchema } from '../schemas';

const TARGET_GROUPS_PER_PAGE = 100;
const MEMBERS_PER_PAGE = 100;

export const useTargetGroups = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
    const [loadingTargetGroups, setLoadingTargetGroups] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [targetGroupsError, setTargetGroupsError] = useState<string | null>(null);
    const [targetGroupsPagination, setTargetGroupsPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedTargetGroups, setLastUpdatedTargetGroups] = useState<Date | null>(null);
    const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string | null>(null);
    
    const [targetGroupMembers, setTargetGroupMembers] = useState<TargetGroupMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [membersPagination, setMembersPagination] = useState({ currentPage: 1, total: 0 });

    const [allTargetGroups, setAllTargetGroups] = useState<TargetGroup[] | null>(null);
    const [loadingAllTargetGroups, setLoadingAllTargetGroups] = useState(false);

    const { items: sortedTargetGroups, requestSort: requestTargetGroupSort, sortConfig: targetGroupSortConfig } = useSortableData(targetGroups, { key: 'name', direction: 'ascending' });
    const { items: sortedTargetGroupMembers, requestSort: requestMemberSort, sortConfig: memberSortConfig } = useSortableData(targetGroupMembers, null);
    
    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    const fetchAndCacheTargetGroups = useCallback(async (page = 1, isBackgroundRefresh = false) => {
        if (!apiClient) return;
        
        if(isBackgroundRefresh) {
            setIsRefreshing(true);
        } else {
            setLoadingTargetGroups(true);
        }
        setTargetGroupsError(null);

        try {
            const response = await apiClient.getTargetGroups(page, TARGET_GROUPS_PER_PAGE);
            setTargetGroups(response.data);
            setTargetGroupsPagination({ currentPage: page, total: response.total });
            await db.setTargetGroupsCache(page, response);
            setLastUpdatedTargetGroups(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast(`Target groups page ${page} is up to date.`, 'info');
                setLastUpdatedTargetGroups(new Date());
            } else if (err instanceof BillettoApiError) {
                setTargetGroupsError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setTargetGroupsError('An unknown error occurred while fetching target groups.');
            }
        } finally {
            if (isBackgroundRefresh) {
                setIsRefreshing(false);
            } else {
                setLoadingTargetGroups(false);
            }
        }
    }, [apiClient, addToast]);

    const fetchAndCacheTargetGroupMembers = useCallback(async (groupId: string, page = 1) => {
        if (!apiClient) return;
        setLoadingMembers(true);
        setMembersError(null);

        const cached = await db.getTargetGroupMembersCache(groupId, page);
        if (cached) {
          setTargetGroupMembers(cached.data);
          setMembersPagination({ currentPage: page, total: cached.total });
          setLoadingMembers(false);
          // Still try to refresh in the background
        }
        
        try {
            const response = await apiClient.getTargetGroupMembers(groupId, page, MEMBERS_PER_PAGE);
            setTargetGroupMembers(response.data);
            setMembersPagination({ currentPage: page, total: response.total });
            await db.setTargetGroupMembersCache(groupId, page, response);
        } catch (err) {
            if (err instanceof NotModifiedError) {
                console.log(`Members for group ${groupId} page ${page} are fresh (304).`);
                // If we had cached data, this is a silent success.
                if (!cached) setMembersError("Data is fresh, but not in cache. Please refresh the page.");
            } else if (err instanceof BillettoApiError) {
                setMembersError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setMembersError('An unknown error occurred while fetching group members.');
            }
        } finally {
            setLoadingMembers(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!apiClient) {
                setLoadingTargetGroups(false);
                return;
            };
            const { groupsData: cachedGroups, lastUpdated: luGroups } = await db.getTargetGroupsCache(1);
            if (cachedGroups) {
                setTargetGroups(cachedGroups.data);
                setTargetGroupsPagination({ currentPage: 1, total: cachedGroups.total });
                if (luGroups) setLastUpdatedTargetGroups(new Date(luGroups));
                setLoadingTargetGroups(false);
                fetchAndCacheTargetGroups(1, true); // stale-while-revalidate
            } else {
                fetchAndCacheTargetGroups(1, false); // initial full load
            }
        };
        loadInitialData();
    }, [apiClient, fetchAndCacheTargetGroups]);
    
    useEffect(() => {
        if (selectedTargetGroupId) {
            setMembersPagination({ currentPage: 1, total: 0 });
            fetchAndCacheTargetGroupMembers(selectedTargetGroupId, 1);
        } else {
            setTargetGroupMembers([]);
        }
    }, [selectedTargetGroupId, fetchAndCacheTargetGroupMembers]);

    const fetchAllTargetGroupsForSearch = useCallback(async () => {
        if (!apiClient || loadingAllTargetGroups) return;
        setLoadingAllTargetGroups(true);
        try {
            const cached = await db.getTargetGroupsCache(-1);
            if(cached.groupsData) {
                setAllTargetGroups(cached.groupsData.data);
                setLoadingAllTargetGroups(false);
                return;
            }

            const data = await fetchAllPaginatedData<TargetGroup>('/target_groups', apiClient, 5, undefined, undefined, onRateLimit, TargetGroupSchema);
            setAllTargetGroups(data);
            await db.setTargetGroupsCache(-1, { data, total: data.length } as any);
        } catch (e) {
            console.error("Failed to fetch all target groups for search:", e);
        } finally {
            setLoadingAllTargetGroups(false);
        }
    }, [apiClient, loadingAllTargetGroups, onRateLimit]);

    const handleTargetGroupPageChange = async (page: number) => {
        setTargetGroupsPagination(prev => ({ ...prev, currentPage: page }));
        const { groupsData } = await db.getTargetGroupsCache(page);
        if (groupsData) {
            setTargetGroups(groupsData.data);
            setTargetGroupsPagination({ currentPage: page, total: groupsData.total });
        } else {
            fetchAndCacheTargetGroups(page, false);
        }
    };
      
    const handleMemberPageChange = async (page: number) => {
        if (selectedTargetGroupId) {
            setMembersPagination(prev => ({ ...prev, currentPage: page }));
            await fetchAndCacheTargetGroupMembers(selectedTargetGroupId, page);
        }
    };
    
    const refreshTargetGroups = () => {
        fetchAndCacheTargetGroups(targetGroupsPagination.currentPage, false);
    }

    return {
        sortedTargetGroups, loadingTargetGroups, isRefreshingTargetGroups: isRefreshing, targetGroupsError, lastUpdatedTargetGroups,
        refreshTargetGroups, targetGroupsPagination, handleTargetGroupPageChange,
        requestTargetGroupSort, targetGroupSortConfig, selectedTargetGroupId, setSelectedTargetGroupId,
        sortedTargetGroupMembers, loadingMembers, membersError, membersPagination, handleMemberPageChange,
        requestMemberSort, memberSortConfig,
        allTargetGroups,
        loadingAllTargetGroups,
        fetchAllTargetGroupsForSearch
    };
};
