
import { useState, useCallback, useEffect } from 'react';
import { Order } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';

const ORDERS_PER_PAGE = 20;

export const useOrders = (apiClient: BillettoApiClient | null) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [ordersPagination, setOrdersPagination] = useState({ currentPage: 1, total: 0 });
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [loadingOrderDetails, setLoadingOrderDetails] = useState<boolean>(false);
    const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
    const [lastUpdatedOrders, setLastUpdatedOrders] = useState<Date | null>(null);

    const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(orders, { key: 'created_at', direction: 'descending' });

    const fetchAndCacheOrders = useCallback(async (page = 1) => {
        if (!apiClient) return;
        setLoadingOrders(true);
        setOrdersError(null);
        try {
            const response = await apiClient.getOrders(page, ORDERS_PER_PAGE, ['data.event']);
            setOrders(response.data);
            setOrdersPagination({ currentPage: page, total: response.total });
            await db.setOrdersCache(page, response);
            const { lastUpdated } = await db.getOrdersCache(page);
            if (lastUpdated) setLastUpdatedOrders(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setOrdersError(err.message);
            else setOrdersError('An unknown error occurred while fetching orders.');
        } finally {
            setLoadingOrders(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedOrders = async () => {
            const { ordersData: cachedOrders, lastUpdated: luOrders } = await db.getOrdersCache(1);
            if (cachedOrders) {
                setOrders(cachedOrders.data);
                setOrdersPagination({ currentPage: 1, total: cachedOrders.total });
                if (luOrders) setLastUpdatedOrders(new Date(luOrders));
            } else {
                fetchAndCacheOrders(1);
            }
        };
        if (apiClient) {
            loadCachedOrders();
        }
    }, [apiClient, fetchAndCacheOrders]);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!selectedOrderId || !apiClient) return;
            setLoadingOrderDetails(true);
            setOrderDetailsError(null);
            const cachedOrder = await db.getOrderDetailsCache(selectedOrderId);
            if (cachedOrder) {
                setOrderDetails(cachedOrder);
                setLoadingOrderDetails(false);
                return;
            }
            try {
                const order = await apiClient.getOrder(selectedOrderId, ['event', 'order_lines']);
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

    const handleOrderPageChange = async (page: number) => {
        setOrdersPagination(prev => ({ ...prev, currentPage: page }));
        const { ordersData } = await db.getOrdersCache(page);
        if (ordersData) {
            setOrders(ordersData.data);
            setOrdersPagination({ currentPage: page, total: ordersData.total });
        } else {
            fetchAndCacheOrders(page);
        }
    };
    
    return {
        sortedOrders, loadingOrders, ordersError, lastUpdatedOrders,
        fetchAndCacheOrders, ordersPagination, handleOrderPageChange,
        selectedOrderId, setSelectedOrderId, orderDetails, loadingOrderDetails, orderDetailsError,
        requestOrderSort, orderSortConfig
    };
};
