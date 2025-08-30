

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Order, BillettoEvent } from '../types';
import { BillettoApiClient, BillettoApiError, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';

const ORDERS_PER_PAGE = 100;

export interface OrderFilters {
  event: string;
  q: string; // Search query for buyer name/email
}

export const useOrders = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });
    const [lastUpdatedOrders, setLastUpdatedOrders] = useState<Date | null>(null);
    
    const [filters, setFilters] = useState<OrderFilters>({ event: '', q: '' });
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    useEffect(() => {
        const fetchEventsForFilter = async () => {
            if (!apiClient) return;
            setLoadingEvents(true);
            try {
                const { events: cachedEvents } = await db.getEventsCache();
                if (cachedEvents && cachedEvents.length > 0) {
                    setEvents(cachedEvents);
                } else {
                    const allEventsData = await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient, 5, undefined, undefined, onRateLimit);
                    setEvents(allEventsData);
                    await db.setEventsCache(allEventsData);
                }
            } catch (err) {
                console.error("Failed to fetch events for filter dropdown:", err);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEventsForFilter();
    }, [apiClient, onRateLimit]);
    
    const filteredOrders = useMemo(() => {
        const lowerCaseQuery = filters.q.toLowerCase();
        return allOrders.filter(order => {
            const eventMatch = filters.event ? (typeof order.event === 'object' ? order.event.id === filters.event : order.event === filters.event) : true;
            const queryMatch = filters.q ? (
                order.buyer_name.toLowerCase().includes(lowerCaseQuery) ||
                order.email.toLowerCase().includes(lowerCaseQuery) ||
                order.id.toLowerCase().includes(lowerCaseQuery)
            ) : true;
            return eventMatch && queryMatch;
        });
    }, [allOrders, filters]);

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(filteredOrders, { key: 'created_at', direction: 'descending' });

    const paginatedOrders = useMemo(() => {
        const start = (pagination.currentPage - 1) * ORDERS_PER_PAGE;
        const end = start + ORDERS_PER_PAGE;
        return sortedOrders.slice(start, end);
    }, [sortedOrders, pagination.currentPage]);
    
    const fetchAndCacheOrders = useCallback(async (isBackgroundRefresh = false) => {
        if (!apiClient) return;

        if (isBackgroundRefresh) {
            setIsRefreshing(true);
        } else {
            setLoadingOrders(true);
        }
        setOrdersError(null);

        try {
            const response = await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient, 5, undefined, undefined, onRateLimit);
            setAllOrders(response);
            await db.setOrdersCache(response);
            setLastUpdatedOrders(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast('Orders are up to date.', 'info');
                setLastUpdatedOrders(new Date());
            } else if (err instanceof BillettoApiError) {
                setOrdersError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setOrdersError('An unknown error occurred while fetching orders.');
            }
        } finally {
            if (isBackgroundRefresh) {
                setIsRefreshing(false);
            } else {
                setLoadingOrders(false);
            }
        }
    }, [apiClient, onRateLimit, addToast]);

    useEffect(() => {
        const loadOrders = async () => {
            if (!apiClient) {
                setLoadingOrders(false);
                return;
            };
            
            const { orders: cachedOrders, lastUpdated } = await db.getOrdersCache();
            if (cachedOrders && cachedOrders.length > 0) {
                setAllOrders(cachedOrders);
                if (lastUpdated) setLastUpdatedOrders(new Date(lastUpdated));
                setLoadingOrders(false);
                fetchAndCacheOrders(true); // stale-while-revalidate
            } else {
                fetchAndCacheOrders(false); // initial full load
            }
        };
        loadOrders();
    }, [apiClient, fetchAndCacheOrders]);

    const handleOrderPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };

    const applyFilters = (newFilters: OrderFilters) => {
        if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
            setFilters(newFilters);
            setPagination({ currentPage: 1 });
        }
    };
    
    const refreshOrders = () => {
        fetchAndCacheOrders(false);
    }

    return {
        orders: paginatedOrders, 
        fullSortedOrders: sortedOrders,
        loadingOrders, 
        isRefreshingOrders: isRefreshing,
        ordersError, 
        lastUpdatedOrders,
        refreshOrders, 
        ordersPagination: { currentPage: pagination.currentPage, total: filteredOrders.length },
        handleOrderPageChange,
        requestOrderSort, 
        orderSortConfig,
        events,
        loadingEvents,
        filters,
        applyFilters,
        allOrders,
        loadingAllOrders: loadingOrders,
        fetchAllOrdersForSearch: () => fetchAndCacheOrders(false),
    };
};