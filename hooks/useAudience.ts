
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AudienceMember, Order, Attendee, LedgerEntry, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

export const useAudience = (apiClient: BillettoApiClient | null, runTaskInBackground: RunTaskInBackgroundSignature, backgroundTasks: BackgroundTask[]) => {
    const [audience, setAudience] = useState<AudienceMember[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });
    const [activeSegment, setActiveSegment] = useState('All');

    const taskStatus = useMemo(() => {
        return backgroundTasks.find(task => task.id === 'audience-analysis');
    }, [backgroundTasks]);

    const loading = taskStatus?.status === 'running';
    const progress = loading ? { message: taskStatus.message || 'Running...', value: taskStatus.progress || 0 } : null;
    const error = taskStatus?.status === 'error' ? taskStatus.message : null;

    const { items: sortedAudience, requestSort, sortConfig } = useSortableData(audience, { key: 'totalSpent', direction: 'descending' });

    const filteredAudience = useMemo(() => {
        if (activeSegment === 'All') return sortedAudience;
        return sortedAudience.filter(member => member.rfmSegment === activeSegment);
    }, [sortedAudience, activeSegment]);

    useEffect(() => {
        setPagination({ currentPage: 1 });
    }, [activeSegment]);

    const paginatedAudience = useMemo(() => {
        const start = (pagination.currentPage - 1) * AUDIENCE_MEMBERS_PER_PAGE;
        const end = start + AUDIENCE_MEMBERS_PER_PAGE;
        return filteredAudience.slice(start, end);
    }, [filteredAudience, pagination.currentPage]);

    const performAnalysis = useCallback((forceRefresh = false) => {
        if (!apiClient || loading) return;

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void): Promise<AudienceMember[]> => {
            if (!forceRefresh) {
                const { audienceData } = await db.getAudienceCache();
                if (audienceData) {
                    return audienceData;
                }
            }

            updateProgress({ message: 'Fetching all orders...', value: 0 });
            const allOrders = await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient, 5, p => updateProgress({ message: `Fetching orders... (${p}%)`, value: (p / 100) * 33 }));

            updateProgress({ message: 'Fetching all attendees...', value: 33 });
            const allAttendees = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, p => updateProgress({ message: `Fetching attendees... (${p}%)`, value: 33 + (p / 100) * 33 }));

            updateProgress({ message: 'Fetching all financial records...', value: 66 });
            const allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, p => updateProgress({ message: `Fetching financials... (${p}%)`, value: 66 + (p / 100) * 33 }));

            updateProgress({ message: 'Analyzing customer data...', value: 99 });

            const customerData: { [email: string]: Partial<AudienceMember> & { nameSet: Set<string> } } = {};
            const orderMap = new Map<string, Order>(allOrders.map(o => [o.id, o]));

            allAttendees.forEach(attendee => {
                const email = attendee.email.toLowerCase();
                if (!customerData[email]) {
                    customerData[email] = { attendees: [], nameSet: new Set() };
                }
                customerData[email].attendees!.push(attendee);
                if (attendee.name) customerData[email].nameSet!.add(attendee.name);
            });
            
            allOrders.forEach(order => {
                const email = order.email.toLowerCase();
                 if (!customerData[email]) {
                    customerData[email] = { attendees: [], nameSet: new Set() };
                }
                if (!customerData[email].orders) customerData[email].orders = [];
                customerData[email].orders!.push(order);
                if (order.buyer_name) customerData[email].nameSet!.add(order.buyer_name);
            });
            
            allLedgerEntries.forEach(entry => {
                if (entry.entry_type === 'ORDER_REVENUE' && entry.order_id) {
                    const order = orderMap.get(String(entry.order_id));
                    if (order) {
                        const email = order.email.toLowerCase();
                        if (customerData[email]) {
                            customerData[email].totalSpent = (customerData[email].totalSpent || 0) + entry.amount;
                            if (!customerData[email].currency) customerData[email].currency = entry.currency;
                        }
                    }
                }
            });

            const finalAudience: AudienceMember[] = Object.entries(customerData).map(([email, data]) => {
                const attendees = data.attendees || [];
                const uniqueEventIds = new Set(attendees.map(a => typeof a.event === 'object' ? a.event.id : a.event).filter(Boolean));
                const lastAttendedEvent = attendees.length > 0 ? attendees.reduce((latest, current) => (new Date(typeof current.event === 'object' ? current.event.starts_at : 0) > new Date(typeof latest.event === 'object' ? latest.event.starts_at : 0) ? current : latest)).event : null;

                return {
                    id: email, email, name: Array.from(data.nameSet!)[0] || 'Unknown',
                    totalSpent: data.totalSpent || 0, currency: data.currency || 'N/A',
                    eventsAttended: uniqueEventIds.size,
                    lastAttendedDate: (lastAttendedEvent && typeof lastAttendedEvent === 'object') ? lastAttendedEvent.starts_at : null,
                    orders: data.orders || [], attendees: attendees,
                };
            });

            updateProgress({ message: 'Performing RFM segmentation...', value: 100 });
            if (finalAudience.length > 0) {
                const sortedByRecency = [...finalAudience].sort((a, b) => (new Date(b.lastAttendedDate || 0).getTime()) - (new Date(a.lastAttendedDate || 0).getTime()));
                const sortedByFrequency = [...finalAudience].sort((a, b) => b.eventsAttended - a.eventsAttended);
                const sortedByMonetary = [...finalAudience].sort((a, b) => b.totalSpent - a.totalSpent);
                const quintileSize = Math.max(1, Math.ceil(finalAudience.length / 5));
                
                const addScores = (member: AudienceMember, scoreType: 'recencyScore' | 'frequencyScore' | 'monetaryScore', sortedArray: AudienceMember[]) => {
                    const index = sortedArray.findIndex(m => m.id === member.id);
                    member[scoreType] = Math.max(1, 5 - Math.floor(index / quintileSize));
                };

                finalAudience.forEach(member => {
                    addScores(member, 'recencyScore', sortedByRecency);
                    addScores(member, 'frequencyScore', sortedByFrequency);
                    addScores(member, 'monetaryScore', sortedByMonetary);
                    const R = String(member.recencyScore); const F = String(member.frequencyScore);
                    if (R >= '4' && F >= '4') member.rfmSegment = 'Champions';
                    else if (F >= '4') member.rfmSegment = 'Loyal Customers';
                    else if (R >= '4' && F < '2') member.rfmSegment = 'New Customers';
                    else if (R >= '3' && F >= '2' && F < '4') member.rfmSegment = 'Potential Loyalists';
                    else if (R < '3' && F >= '3') member.rfmSegment = 'At Risk';
                    else if (R < '3' && F < '3') member.rfmSegment = 'Hibernating';
                    else member.rfmSegment = 'Needs Attention';
                });
            }

            await db.setAudienceCache(finalAudience);
            await db.setInKeyval('audience_last_updated', new Date());
            return finalAudience;
        };

        runTaskInBackground(
            'audience-analysis',
            'Audience Analysis',
            analysisTask,
            (result) => {
                setAudience(result);
                setLastUpdated(new Date());
            }
        );
    }, [apiClient, loading, runTaskInBackground]);

    const handlePageChange = (page: number) => {
        setPagination({ currentPage: page });
    };
    
    useEffect(() => {
        if (apiClient && audience.length === 0 && !loading) {
            const loadInitialData = async () => {
                const { audienceData, lastUpdated: cachedLastUpdated } = await db.getAudienceCache();
                if (audienceData) {
                    setAudience(audienceData);
                    if (cachedLastUpdated) setLastUpdated(new Date(cachedLastUpdated));
                } else {
                    performAnalysis(false);
                }
            };
            loadInitialData();
        }
    }, [apiClient, audience.length, performAnalysis, loading]);

    return {
        audience: paginatedAudience,
        fullAudience: sortedAudience,
        loading,
        error,
        lastUpdated,
        progress,
        performAnalysis,
        pagination: { ...pagination, total: filteredAudience.length },
        handlePageChange,
        requestAudienceSort: requestSort,
        audienceSortConfig: sortConfig,
        activeSegment,
        setActiveSegment,
    };
};
