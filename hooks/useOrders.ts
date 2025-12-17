
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Order, BillettoEvent } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { AddToastFn } from '../types';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { OrderSchema, BillettoEventSchema } from '../schemas';

const ORDERS_PER_PAGE = 100;

export interface OrderFilters {
  event: string;
  q: string; // Search query for buyer name/email
}

export const useOrders = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [pagination, setPagination] = useState({ currentPage: 1 });
    
    const [filters, setFilters] = useState<OrderFilters>({ event: '', q: '' });

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    // 1. Fetch Events for Filter Dropdown
    const { 
        data: events = [], 
        isPending: loadingEvents 
    } = useQuery({
        queryKey: ['events'], // Reuse the same key as useEvents for deduplication
        queryFn: async () => {
            if (!apiClient) return [];
            return await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient, 5, undefined, undefined, onRateLimit, BillettoEventSchema);
        },
        enabled: !!apiClient,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Fetch Orders (All Orders)
    const {
        data: allOrders = [],
        isPending: loadingOrders,
        isFetching: isRefreshingOrders,
        error: ordersErrorObject,
        dataUpdatedAt: lastUpdatedOrdersTimestamp,
        refetch: refreshOrders
    } = useQuery({
        queryKey: ['orders', 'all'],
        queryFn: async () => {
            if (!apiClient) return [];
            return await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient, 5, undefined, undefined, onRateLimit, OrderSchema);
        },
        enabled: !!apiClient,
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData,
    });

    const ordersError = ordersErrorObject instanceof Error ? ordersErrorObject.message : null;
    const lastUpdatedOrders = lastUpdatedOrdersTimestamp ? new Date(lastUpdatedOrdersTimestamp) : null;

    // Client-side filtering
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

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData<Order>(filteredOrders, { key: 'created_at', direction: 'descending' });

    const paginatedOrders = useMemo(() => {
        const start = (pagination.currentPage - 1) * ORDERS_PER_PAGE;
        const end = start + ORDERS_PER_PAGE;
        return sortedOrders.slice(start, end);
    }, [sortedOrders, pagination.currentPage]);

    const handleOrderPageChange = (page: number) => {
        setPagination({ currentPage: page });
    };

    const applyFilters = (newFilters: OrderFilters) => {
        if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
            setFilters(newFilters);
            setPagination({ currentPage: 1 });
        }
    };
    
    // For Global Search Hook consumption
    const fetchAllOrdersForSearch = useCallback(async () => {
        return refreshOrders();
    }, [refreshOrders]);

    return {
        orders: paginatedOrders, 
        fullSortedOrders: sortedOrders,
        loadingOrders, 
        isRefreshingOrders,
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
        allOrders, // Exposed for global search
        loadingAllOrders: loadingOrders,
        fetchAllOrdersForSearch,
    };
};