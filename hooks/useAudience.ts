
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AudienceMember, Order, Attendee, LedgerEntry } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

export const useAudience = (apiClient: BillettoApiClient | null) => {
    const [audience, setAudience] = useState<AudienceMember[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [progress, setProgress] = useState<{ message: string; value: number } | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });

    const { items: sortedAudience, requestSort, sortConfig } = useSortableData(audience, { key: 'totalSpent', direction: 'descending' });

    const paginatedAudience = useMemo(() => {
        const start = (pagination.currentPage - 1) * AUDIENCE_MEMBERS_PER_PAGE;
        const end = start + AUDIENCE_MEMBERS_PER_PAGE;
        return sortedAudience.slice(start, end);
    }, [sortedAudience, pagination.currentPage]);

    const performAnalysis = useCallback(async (forceRefresh = false) => {
        if (!apiClient) return;
        setLoading(true);
        setError(null);
        setProgress({ message: 'Checking cache...', value: 0 });

        if (!forceRefresh) {
            const { audienceData, lastUpdated: cachedLastUpdated } = await db.getAudienceCache();
            if (audienceData) {
                setAudience(audienceData);
                if (cachedLastUpdated) setLastUpdated(new Date(cachedLastUpdated));
                setLoading(false);
                setProgress(null);
                return;
            }
        }

        try {
            setProgress({ message: 'Fetching all orders...', value: 0 });
            const allOrders = await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient, 5, p => setProgress({ message: `Fetching orders... (${p}%)`, value: (p / 100) * 33 }));

            setProgress({ message: 'Fetching all attendees...', value: 33 });
            const allAttendees = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, p => setProgress({ message: `Fetching attendees... (${p}%)`, value: 33 + (p / 100) * 33 }));

            setProgress({ message: 'Fetching all financial records...', value: 66 });
            const allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, p => setProgress({ message: `Fetching financials... (${p}%)`, value: 66 + (p / 100) * 33 }));

            
            setProgress({ message: 'Analyzing data...', value: 99 });

            const customerData: { [email: string]: Partial<AudienceMember> & { nameSet: Set<string> } } = {};
            const orderMap = new Map<string, Order>(allOrders.map(o => [o.id, o]));

            allAttendees.forEach(attendee => {
                const email = attendee.email.toLowerCase();
                if (!customerData[email]) {
                    customerData[email] = { attendees: [], nameSet: new Set() };
                }
                customerData[email].attendees!.push(attendee);
                if (attendee.name) {
                    customerData[email].nameSet!.add(attendee.name);
                }
            });
            
            allOrders.forEach(order => {
                const email = order.email.toLowerCase();
                 if (!customerData[email]) {
                    customerData[email] = { attendees: [], nameSet: new Set() };
                }
                if (!customerData[email].orders) customerData[email].orders = [];
                customerData[email].orders!.push(order);
                if (order.buyer_name) {
                    customerData[email].nameSet!.add(order.buyer_name);
                }
            });
            
            allLedgerEntries.forEach(entry => {
                if (entry.entry_type === 'ORDER_REVENUE' && entry.order_id) {
                    const order = orderMap.get(String(entry.order_id));
                    if (order) {
                        const email = order.email.toLowerCase();
                        if (customerData[email]) {
                            customerData[email].totalSpent = (customerData[email].totalSpent || 0) + entry.amount;
                            if (!customerData[email].currency) {
                                customerData[email].currency = entry.currency;
                            }
                        }
                    }
                }
            });

            const finalAudience: AudienceMember[] = Object.entries(customerData).map(([email, data]) => {
                const attendees = data.attendees || [];
                const uniqueEventIds = new Set(attendees
                    .map(a => typeof a.event === 'object' ? a.event.id : a.event)
                    .filter(Boolean));

                const lastAttendedDate = attendees.length > 0 ? attendees.reduce((latest, current) => {
                    const latestDate = latest && typeof latest.event === 'object' ? new Date(latest.event.starts_at) : new Date(0);
                    const currentDate = current && typeof current.event === 'object' ? new Date(current.event.starts_at) : new Date(0);
                    return currentDate > latestDate ? current : latest;
                }).event : null;

                return {
                    id: email,
                    email: email,
                    name: Array.from(data.nameSet!)[0] || 'Unknown',
                    totalSpent: data.totalSpent || 0,
                    currency: data.currency || 'N/A',
                    eventsAttended: uniqueEventIds.size,
                    lastAttendedDate: (lastAttendedDate && typeof lastAttendedDate === 'object') ? lastAttendedDate.starts_at : null,
                    orders: data.orders || [],
                    attendees: attendees,
                };
            });

            setAudience(finalAudience);
            await db.setAudienceCache(finalAudience);
            setLastUpdated(new Date());

        } catch (err) {
            if (err instanceof BillettoApiError) setError(err.message);
            else setError('An unknown error occurred during analysis.');
        } finally {
            setLoading(false);
            setProgress(null);
        }
    }, [apiClient]);

    const handlePageChange = (page: number) => {
        setPagination({ currentPage: page });
    };
    
    // Auto-initiate analysis on load if no cached data
    useEffect(() => {
        if (apiClient && audience.length === 0) {
            performAnalysis(false);
        }
    }, [apiClient]);

    return {
        audience: paginatedAudience,
        fullAudience: sortedAudience, // For modal lookup
        loading,
        error,
        lastUpdated,
        progress,
        performAnalysis,
        pagination: { ...pagination, total: sortedAudience.length },
        handlePageChange,
        requestSort,
        sortConfig,
    };
};