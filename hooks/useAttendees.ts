


import { useState, useCallback, useEffect, useMemo } from 'react';
import { Attendee } from '../types';
import { BillettoApiClient, BillettoApiError, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';

const ALL_ATTENDEES_PER_PAGE = 100;

export const useAttendees = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [allAttendees, setAllAttendees] = useState<Attendee[]>([]);
    const [loadingAllAttendees, setLoadingAllAttendees] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [allAttendeesError, setAllAttendeesError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });
    const [lastUpdatedAllAttendees, setLastUpdatedAllAttendees] = useState<Date | null>(null);
    
    // For Global Search
    const [allAttendeesForSearch, setAllAttendeesForSearch] = useState<Attendee[] | null>(null);
    const [loadingAllAttendeesForSearch, setLoadingAllAttendeesForSearch] = useState(false);

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    const { items: sortedAttendees, requestSort: requestAllAttendeeSort, sortConfig: allAttendeeSortConfig } = useSortableData(allAttendees, { key: 'created_at', direction: 'descending' });

    const paginatedAttendees = useMemo(() => {
        const start = (pagination.currentPage - 1) * ALL_ATTENDEES_PER_PAGE;
        const end = start + ALL_ATTENDEES_PER_PAGE;
        return sortedAttendees.slice(start, end);
    }, [sortedAttendees, pagination.currentPage]);

    const fetchAndCacheAllAttendees = useCallback(async (isBackgroundRefresh = false) => {
        if (!apiClient) return;

        if (isBackgroundRefresh) {
            setIsRefreshing(true);
        } else {
            setLoadingAllAttendees(true);
        }
        setAllAttendeesError(null);

        try {
            const response = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, undefined, undefined, onRateLimit);
            setAllAttendees(response);
            await db.setAttendeesCache(response);
            setLastUpdatedAllAttendees(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast('Attendees are up to date.', 'info');
                setLastUpdatedAllAttendees(new Date());
            } else if (err instanceof BillettoApiError) {
                setAllAttendeesError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setAllAttendeesError('An unknown error occurred while fetching attendees.');
            }
        } finally {
             if (isBackgroundRefresh) {
                setIsRefreshing(false);
            } else {
                setLoadingAllAttendees(false);
            }
        }
    }, [apiClient, onRateLimit, addToast]);

    useEffect(() => {
        const loadAttendees = async () => {
            if (!apiClient) {
                setLoadingAllAttendees(false);
                return;
            };

            const { attendees: cachedAttendees, lastUpdated } = await db.getAttendeesCache();
            if (cachedAttendees && cachedAttendees.length > 0) {
                setAllAttendees(cachedAttendees);
                if (lastUpdated) setLastUpdatedAllAttendees(new Date(lastUpdated));
                setLoadingAllAttendees(false);
                fetchAndCacheAllAttendees(true); // stale-while-revalidate
            } else {
                fetchAndCacheAllAttendees(false); // initial full load
            }
        };
        loadAttendees();
    }, [apiClient, fetchAndCacheAllAttendees]);
    
    const fetchAllAttendeesForSearchCallback = useCallback(async () => {
        if (!apiClient || loadingAllAttendeesForSearch) return;
        setLoadingAllAttendeesForSearch(true);
        try {
            const { attendees: cached } = await db.getAttendeesCache();
            if (cached) {
                setAllAttendeesForSearch(cached);
                setLoadingAllAttendeesForSearch(false);
                return;
            }
            const data = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, undefined, undefined, onRateLimit);
            setAllAttendeesForSearch(data);
            await db.setAttendeesCache(data); // Also cache it
            setAllAttendees(data); // Update main view too
            setLastUpdatedAllAttendees(new Date());
        } catch (e) {
            console.error("Failed to fetch all attendees for search:", e);
            addToast('Failed to load attendees for search', 'error');
        } finally {
            setLoadingAllAttendeesForSearch(false);
        }
    }, [apiClient, loadingAllAttendeesForSearch, onRateLimit, addToast]);

    const handleAllAttendeesPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };

    return {
        attendees: paginatedAttendees,
        fullSortedAttendees: sortedAttendees,
        loadingAllAttendees,
        isRefreshingAttendees: isRefreshing,
        allAttendeesError,
        lastUpdatedAllAttendees,
        refreshAttendees: () => fetchAndCacheAllAttendees(false),
        allAttendeesPagination: { currentPage: pagination.currentPage, total: sortedAttendees.length },
        handleAllAttendeesPageChange,
        requestAllAttendeeSort,
        allAttendeeSortConfig,
        allAttendeesForSearch,
        loadingAllAttendeesForSearch,
        fetchAllAttendeesForSearch: fetchAllAttendeesForSearchCallback,
    };
};