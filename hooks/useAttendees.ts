

import { useState, useCallback, useEffect } from 'react';
import { Attendee } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const ALL_ATTENDEES_PER_PAGE = 100;
const ALL_ATTENDEES_CACHE_KEY = 'all_attendees_for_search';

export const useAttendees = (apiClient: BillettoApiClient | null) => {
    const [allAttendees, setAllAttendees] = useState<Attendee[]>([]);
    const [loadingAllAttendees, setLoadingAllAttendees] = useState<boolean>(false);
    const [allAttendeesError, setAllAttendeesError] = useState<string | null>(null);
    const [allAttendeesPagination, setAllAttendeesPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedAllAttendees, setLastUpdatedAllAttendees] = useState<Date | null>(null);
    const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
    const [attendeeDetails, setAttendeeDetails] = useState<Attendee | null>(null);
    const [loadingAttendeeDetails, setLoadingAttendeeDetails] = useState<boolean>(false);
    const [attendeeDetailsError, setAttendeeDetailsError] = useState<string | null>(null);

    // State for global search
    const [allAttendeesForSearch, setAllAttendeesForSearch] = useState<Attendee[] | null>(null);
    const [loadingAllAttendeesForSearch, setLoadingAllAttendeesForSearch] = useState(false);

    const { items: sortedAllAttendees, requestSort: requestAllAttendeeSort, sortConfig: allAttendeeSortConfig } = useSortableData(allAttendees, { key: 'created_at', direction: 'descending' });

    const fetchAndCacheAllAttendees = useCallback(async (page = 1) => {
        if (!apiClient) return;
        setLoadingAllAttendees(true);
        setAllAttendeesError(null);
        try {
            const response = await apiClient.getAttendees(page, ALL_ATTENDEES_PER_PAGE, ['event']);
            setAllAttendees(response.data);
            setAllAttendeesPagination({ currentPage: page, total: response.total });
            await db.setAttendeesCache(page, response);
            const { lastUpdated } = await db.getAttendeesCache(page);
            if (lastUpdated) setLastUpdatedAllAttendees(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setAllAttendeesError(err.message);
            else setAllAttendeesError('An unknown error occurred while fetching attendees.');
        } finally {
            setLoadingAllAttendees(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedAttendees = async () => {
            const { attendeesData: cachedAttendees, lastUpdated: luAttendees } = await db.getAttendeesCache(1);
            if(cachedAttendees) {
                setAllAttendees(cachedAttendees.data);
                setAllAttendeesPagination({ currentPage: 1, total: cachedAttendees.total });
                if(luAttendees) setLastUpdatedAllAttendees(new Date(luAttendees));
            } else {
                fetchAndCacheAllAttendees(1);
            }
        };
        if (apiClient) {
            loadCachedAttendees();
        }
    }, [apiClient, fetchAndCacheAllAttendees]);
    
    useEffect(() => {
        const fetchAttendeeDetails = async () => {
            if (!selectedAttendeeId || !apiClient) return;
            setLoadingAttendeeDetails(true);
            setAttendeeDetailsError(null);
            const cachedAttendee = await db.getAttendeeDetailsCache(selectedAttendeeId);
            if (cachedAttendee) {
                setAttendeeDetails(cachedAttendee);
                setLoadingAttendeeDetails(false);
                return;
            }
            try {
                const attendee = await apiClient.getAttendee(selectedAttendeeId, ['event', 'booking_question_responses', 'scannings', 'ticket_buyer', 'space', 'membership', 'subscription']);
                setAttendeeDetails(attendee);
                await db.setAttendeeDetailsCache(attendee);
            } catch (err) {
                if (err instanceof BillettoApiError) setAttendeeDetailsError(err.message);
                else setAttendeeDetailsError('An unknown error occurred fetching attendee details.');
            } finally {
                setLoadingAttendeeDetails(false);
            }
        };
        fetchAttendeeDetails();
    }, [selectedAttendeeId, apiClient]);

    const fetchAllAttendeesForSearch = useCallback(async () => {
        if (!apiClient || loadingAllAttendeesForSearch) return;
        setLoadingAllAttendeesForSearch(true);
        try {
            const cached = await db.getAttendeesCache(-1); // Use a special page number for "all"
            if (cached.attendeesData) {
                setAllAttendeesForSearch(cached.attendeesData.data);
                setLoadingAllAttendeesForSearch(false);
                return;
            }

            const data = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient);
            setAllAttendeesForSearch(data);
            await db.setAttendeesCache(-1, { data, total: data.length } as any);
        } catch (e) {
            console.error("Failed to fetch all attendees for search:", e);
        } finally {
            setLoadingAllAttendeesForSearch(false);
        }
    }, [apiClient, loadingAllAttendeesForSearch]);

    const handleAllAttendeesPageChange = async (page: number) => {
        setAllAttendeesPagination(prev => ({...prev, currentPage: page}));
        const { attendeesData } = await db.getAttendeesCache(page);
        if(attendeesData) {
            setAllAttendees(attendeesData.data);
            setAllAttendeesPagination({currentPage: page, total: attendeesData.total});
        } else {
            fetchAndCacheAllAttendees(page);
        }
    };

    return {
        sortedAllAttendees, loadingAllAttendees, allAttendeesError, lastUpdatedAllAttendees,
        fetchAndCacheAllAttendees, allAttendeesPagination, handleAllAttendeesPageChange,
        requestAllAttendeeSort, allAttendeeSortConfig,
        selectedAttendeeId, setSelectedAttendeeId, attendeeDetails, loadingAttendeeDetails, attendeeDetailsError,
        // For global search
        allAttendeesForSearch,
        loadingAllAttendeesForSearch,
        fetchAllAttendeesForSearch
    };
};
