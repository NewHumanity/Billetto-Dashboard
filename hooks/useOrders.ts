import { useState, useCallback, useEffect } from 'react';
import { Order, BillettoEvent } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const ORDERS_PER_PAGE = 100;
const ALL_ORDERS_CACHE_KEY = 'all_orders_for_search';

export interface OrderFilters {
  event: string;
  q: string; // Search query for buyer name/email
}

const getCacheKey = (page: number, filters: OrderFilters) => {
    const filterParts = Object.entries(filters)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    return `page=${page}&${filterParts || 'all'}`;
};

export const useOrders = (apiClient: BillettoApiClient | null) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [ordersPagination, setOrdersPagination] = useState({ currentPage: 1, total: 0 });
    const [lastUpdatedOrders, setLastUpdatedOrders] = useState<Date | null>(null);
    
    // State for global search
    const [allOrders, setAllOrders] = useState<Order[] | null>(null);
    const [loadingAllOrders, setLoadingAllOrders] = useState(false);
    
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [loadingOrderDetails, setLoadingOrderDetails] = useState<boolean>(false);
    const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);

    const [filters, setFilters] = useState<OrderFilters>({ event: '', q: '' });
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(orders, { key: 'created_at', direction: 'descending' });

    // Effect to fetch events for the filter dropdown
    useEffect(() => {
        const fetchEventsForFilter = async () => {
            if (!apiClient) return;
            setLoadingEvents(true);
            try {
                const { events: cachedEvents } = await db.getEventsCache();
                if (cachedEvents && cachedEvents.length > 0) {
                    setEvents(cachedEvents);
                } else {
                    const allEvents = await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient);
                    setEvents(allEvents);
                    await db.setEventsCache(allEvents);
                }
            } catch (err) {
                console.error("Failed to fetch events for filter dropdown:", err);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEventsForFilter();
    }, [apiClient]);
    
    // The main data fetching function
    const fetchAndCacheOrders = useCallback(async (page: number, currentFilters: OrderFilters) => {
        if (!apiClient) return;
        setLoadingOrders(true);
        setOrdersError(null);
        try {
            const response = await apiClient.getOrders(page, ORDERS_PER_PAGE, ['data.event'], currentFilters as unknown as Record<string, string>);
            setOrders(response.data);
            setOrdersPagination({ currentPage: page, total: response.total });

            const cacheKey = getCacheKey(page, currentFilters);
            await db.setOrdersCache(cacheKey, response);
            const { lastUpdated } = await db.getOrdersCache(cacheKey);
            if (lastUpdated) setLastUpdatedOrders(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setOrdersError(err.message);
            else setOrdersError('An unknown error occurred while fetching orders.');
        } finally {
            setLoadingOrders(false);
        }
    }, [apiClient]);

    // Central effect for loading orders based on page or filters
    useEffect(() => {
        const loadOrders = async () => {
            if (!apiClient) return;
            setLoadingOrders(true);
            const cacheKey = getCacheKey(ordersPagination.currentPage, filters);
            const { ordersData, lastUpdated } = await db.getOrdersCache(cacheKey);
            if (ordersData) {
                setOrders(ordersData.data);
                setOrdersPagination(p => ({ ...p, total: ordersData.total }));
                if (lastUpdated) setLastUpdatedOrders(new Date(lastUpdated));
                setLoadingOrders(false);
            } else {
                await fetchAndCacheOrders(ordersPagination.currentPage, filters);
            }
        };
        loadOrders();
    }, [apiClient, ordersPagination.currentPage, filters, fetchAndCacheOrders]);

    // Effect for fetching details of a selected order
    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!selectedOrderId || !apiClient) return;
            setLoadingOrderDetails(true);
            setOrderDetailsError(null);
            const cachedOrder = await db.getOrderDetailsCache(selectedOrderId);
            if (cachedOrder && cachedOrder.order_transactions) {
                setOrderDetails(cachedOrder);
                setLoadingOrderDetails(false);
                return;
            }
            try {
                const order = await apiClient.getOrder(selectedOrderId, ['event', 'order_lines', 'order_transactions']);
                setOrderDetails(order);
                await db.setOrderDetailsCache(order);
            } catch (err) {
                if (err instanceof BillettoApiError) setOrderDetailsError(err.message);
                else setOrderDetailsError('An unknown error occurred fetching order details.');
            } finally {
                setLoadingOrderDetails(false);
            }
        };
        fetchOrderDetails();
    }, [selectedOrderId, apiClient]);

    const fetchAllOrdersForSearch = useCallback(async () => {
        if (!apiClient || loadingAllOrders) return;
        setLoadingAllOrders(true);
        try {
            const cached = await db.getOrdersCache(ALL_ORDERS_CACHE_KEY);
            if(cached.ordersData) {
                setAllOrders(cached.ordersData.data);
                setLoadingAllOrders(false);
                return;
            }

            const data = await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient);
            setAllOrders(data);
            await db.setOrdersCache(ALL_ORDERS_CACHE_KEY, { data, total: data.length } as any);
        } catch (e) {
            console.error("Failed to fetch all orders for search:", e);
        } finally {
            setLoadingAllOrders(false);
        }
    }, [apiClient, loadingAllOrders]);


    const handleOrderPageChange = (page: number) => {
        setOrdersPagination(p => ({ ...p, currentPage: page }));
    };

    const applyFilters = (newFilters: OrderFilters) => {
        if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
            setFilters(newFilters);
            setOrdersPagination({ currentPage: 1, total: 0 }); // Reset page, triggers useEffect
        }
    };
    
    const refreshOrders = () => {
        const initialFilters = { event: '', q: '' };
        if (filters.event !== '' || filters.q !== '') {
            setFilters(initialFilters);
        }
        setOrdersPagination({ currentPage: 1, total: 0 });
        fetchAndCacheOrders(1, initialFilters);
    }

    return {
        sortedOrders, loadingOrders, ordersError, lastUpdatedOrders,
        refreshOrders, ordersPagination, handleOrderPageChange,
        selectedOrderId, setSelectedOrderId, orderDetails, loadingOrderDetails, orderDetailsError,
        requestOrderSort, orderSortConfig,
        events,
        loadingEvents,
        filters,
        applyFilters,
        // For global search
        allOrders,
        loadingAllOrders,
        fetchAllOrdersForSearch
    };
};
