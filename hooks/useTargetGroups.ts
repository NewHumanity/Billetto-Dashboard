import { useState, useCallback, useEffect } from 'react';
import { TargetGroup, TargetGroupMember } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const TARGET_GROUPS_PER_PAGE = 100;
const MEMBERS_PER_PAGE = 100;

export const useTargetGroups = (apiClient: BillettoApiClient | null) => {
    const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
    const [loadingTargetGroups, setLoadingTargetGroups] = useState<boolean>(false);
    const [targetGroupsError, setTargetGroupsError] = useState<string | null>(null);
    const [targetGroupsPagination, setTargetGroupsPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedTargetGroups, setLastUpdatedTargetGroups] = useState<Date | null>(null);
    const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string | null>(null);
    
    const [targetGroupMembers, setTargetGroupMembers] = useState<TargetGroupMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [membersPagination, setMembersPagination] = useState({ currentPage: 1, total: 0 });

    // State for global search
    const [allTargetGroups, setAllTargetGroups] = useState<TargetGroup[] | null>(null);
    const [loadingAllTargetGroups, setLoadingAllTargetGroups] = useState(false);

    const { items: sortedTargetGroups, requestSort: requestTargetGroupSort, sortConfig: targetGroupSortConfig } = useSortableData(targetGroups, { key: 'name', direction: 'ascending' });
    const { items: sortedTargetGroupMembers, requestSort: requestMemberSort, sortConfig: memberSortConfig } = useSortableData(targetGroupMembers, null);

    const fetchAndCacheTargetGroups = useCallback(async (page = 1) => {
        if (!apiClient) return;
        setLoadingTargetGroups(true);
        setTargetGroupsError(null);
        try {
            const response = await apiClient.getTargetGroups(page, TARGET_GROUPS_PER_PAGE);
            setTargetGroups(response.data);
            setTargetGroupsPagination({ currentPage: page, total: response.total });
            await db.setTargetGroupsCache(page, response);
            const { lastUpdated } = await db.getTargetGroupsCache(page);
            if (lastUpdated) setLastUpdatedTargetGroups(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setTargetGroupsError(err.message);
            else setTargetGroupsError('An unknown error occurred while fetching target groups.');
        } finally {
            setLoadingTargetGroups(false);
        }
    }, [apiClient]);

    const fetchAndCacheTargetGroupMembers = useCallback(async (groupId: string, page = 1) => {
        if (!apiClient) return;
        setLoadingMembers(true);
        setMembersError(null);

        const cached = await db.getTargetGroupMembersCache(groupId, page);
        if (cached) {
          setTargetGroupMembers(cached.data);
          setMembersPagination({ currentPage: page, total: cached.total });
          setLoadingMembers(false);
          return;
        }
        
        try {
            const response = await apiClient.getTargetGroupMembers(groupId, page, MEMBERS_PER_PAGE);
            setTargetGroupMembers(response.data);
            setMembersPagination({ currentPage: page, total: response.total });
            await db.setTargetGroupMembersCache(groupId, page, response);
        } catch (err) {
            if (err instanceof BillettoApiError) setMembersError(err.message);
            else setMembersError('An unknown error occurred while fetching group members.');
        } finally {
            setLoadingMembers(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedTargetGroups = async () => {
            const { groupsData: cachedGroups, lastUpdated: luGroups } = await db.getTargetGroupsCache(1);
            if (cachedGroups) {
                setTargetGroups(cachedGroups.data);
                setTargetGroupsPagination({ currentPage: 1, total: cachedGroups.total });
                if (luGroups) setLastUpdatedTargetGroups(new Date(luGroups));
            } else {
                fetchAndCacheTargetGroups(1);
            }
        };
        if (apiClient) {
            loadCachedTargetGroups();
        }
    }, [apiClient, fetchAndCacheTargetGroups]);
    
    useEffect(() => {
        if (selectedTargetGroupId) {
            setMembersPagination({ currentPage: 1, total: 0 }); // Reset pagination
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

            const data = await fetchAllPaginatedData<TargetGroup>('/target_groups', apiClient);
            setAllTargetGroups(data);
            await db.setTargetGroupsCache(-1, { data, total: data.length } as any);
        } catch (e) {
            console.error("Failed to fetch all target groups for search:", e);
        } finally {
            setLoadingAllTargetGroups(false);
        }
    }, [apiClient, loadingAllTargetGroups]);

    const handleTargetGroupPageChange = async (page: number) => {
        setTargetGroupsPagination(prev => ({ ...prev, currentPage: page }));
        const { groupsData } = await db.getTargetGroupsCache(page);
        if (groupsData) {
            setTargetGroups(groupsData.data);
            setTargetGroupsPagination({ currentPage: page, total: groupsData.total });
        } else {
            fetchAndCacheTargetGroups(page);
        }
    };
      
    const handleMemberPageChange = async (page: number) => {
        if (selectedTargetGroupId) {
            setMembersPagination(prev => ({ ...prev, currentPage: page }));
            await fetchAndCacheTargetGroupMembers(selectedTargetGroupId, page);
        }
    };

    return {
        sortedTargetGroups, loadingTargetGroups, targetGroupsError, lastUpdatedTargetGroups,
        fetchAndCacheTargetGroups, targetGroupsPagination, handleTargetGroupPageChange,
        requestTargetGroupSort, targetGroupSortConfig, selectedTargetGroupId, setSelectedTargetGroupId,
        sortedTargetGroupMembers, loadingMembers, membersError, membersPagination, handleMemberPageChange,
        requestMemberSort, memberSortConfig,
        // For global search
        allTargetGroups,
        loadingAllTargetGroups,
        fetchAllTargetGroupsForSearch
    };
};
