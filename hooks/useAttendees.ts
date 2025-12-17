
import { useState, useCallback, useMemo } from 'react';
import { Attendee } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { AddToastFn } from '../types';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AttendeeSchema } from '../schemas';

const ALL_ATTENDEES_PER_PAGE = 100;

export const useAttendees = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [pagination, setPagination] = useState({ currentPage: 1 });
    
    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    const {
        data: allAttendees = [],
        isPending: loadingAllAttendees,
        isFetching: isRefreshingAttendees,
        error: allAttendeesErrorObject,
        dataUpdatedAt: lastUpdatedAllAttendeesTimestamp,
        refetch: refreshAttendees
    } = useQuery({
        queryKey: ['attendees'],
        queryFn: async () => {
            if (!apiClient) return [];
            return await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, undefined, undefined, onRateLimit, AttendeeSchema);
        },
        enabled: !!apiClient,
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData,
    });

    const allAttendeesError = allAttendeesErrorObject instanceof Error ? allAttendeesErrorObject.message : null;
    const lastUpdatedAllAttendees = lastUpdatedAllAttendeesTimestamp ? new Date(lastUpdatedAllAttendeesTimestamp) : null;

    const { items: sortedAttendees, requestSort: requestAllAttendeeSort, sortConfig: allAttendeeSortConfig } = useSortableData<Attendee>(allAttendees, { key: 'created_at', direction: 'descending' });

    const paginatedAttendees = useMemo(() => {
        const start = (pagination.currentPage - 1) * ALL_ATTENDEES_PER_PAGE;
        const end = start + ALL_ATTENDEES_PER_PAGE;
        return sortedAttendees.slice(start, end);
    }, [sortedAttendees, pagination.currentPage]);

    const handleAllAttendeesPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };

    // For Global Search
    const fetchAllAttendeesForSearch = useCallback(async () => {
        return refreshAttendees();
    }, [refreshAttendees]);

    return {
        attendees: paginatedAttendees,
        fullSortedAttendees: sortedAttendees,
        loadingAllAttendees,
        isRefreshingAttendees,
        allAttendeesError,
        lastUpdatedAllAttendees,
        refreshAttendees,
        allAttendeesPagination: { currentPage: pagination.currentPage, total: sortedAttendees.length },
        handleAllAttendeesPageChange,
        requestAllAttendeeSort,
        allAttendeeSortConfig,
        allAttendeesForSearch: allAttendees, // Reuse the same dataset
        loadingAllAttendeesForSearch: loadingAllAttendees,
        fetchAllAttendeesForSearch,
    };
};