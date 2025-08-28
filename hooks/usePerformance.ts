
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnalyzedEvent, BillettoEvent, LedgerEntry, Attendee, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const PERFORMANCE_PAGE_SIZE = 100;

export const usePerformance = (apiClient: BillettoApiClient | null, runTaskInBackground: RunTaskInBackgroundSignature, backgroundTasks: BackgroundTask[]) => {
    const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });

    const taskStatus = useMemo(() => {
        return backgroundTasks.find(task => task.id === 'performance-analysis');
    }, [backgroundTasks]);

    const loading = taskStatus?.status === 'running';
    const progress = loading ? { message: taskStatus.message || 'Running...', value: taskStatus.progress || 0 } : null;
    const error = taskStatus?.status === 'error' ? taskStatus.message : null;

    const { items: sortedEvents, requestSort, sortConfig } = useSortableData(analyzedEvents, { key: 'netProfit', direction: 'descending' });

    const paginatedEvents = useMemo(() => {
        const start = (pagination.currentPage - 1) * PERFORMANCE_PAGE_SIZE;
        const end = start + PERFORMANCE_PAGE_SIZE;
        return sortedEvents.slice(start, end);
    }, [sortedEvents, pagination.currentPage]);

    const performAnalysis = useCallback((forceRefresh = false) => {
        if (!apiClient || loading) return;

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void): Promise<AnalyzedEvent[]> => {
            if (!forceRefresh) {
                const { analyzedEvents: cachedData } = await db.getPerformanceCache();
                if (cachedData) {
                    return cachedData;
                }
            }
            
            updateProgress({ message: 'Fetching all events...', value: 0 });
            const allEvents = await fetchAllPaginatedData<BillettoEvent>('/events', apiClient, 5, p => updateProgress({ message: `Fetching events... (${p}%)`, value: (p / 100) * 25 }));
            
            updateProgress({ message: 'Fetching all financial records...', value: 25 });
            const allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, p => updateProgress({ message: `Fetching financials... (${p}%)`, value: 25 + (p / 100) * 50 }));

            updateProgress({ message: 'Fetching all attendees for ticket counts...', value: 75 });
            const allAttendees = await fetchAllPaginatedData<Attendee>('/attendees?expand=event', apiClient, 5, p => updateProgress({ message: `Fetching attendees... (${p}%)`, value: 75 + (p / 100) * 24 }));

            updateProgress({ message: 'Calculating profitability...', value: 99 });

            const eventsById = new Map<string, BillettoEvent>(allEvents.map(e => [e.id, e]));
            const ledgerByEvent = allLedgerEntries.reduce((map, entry) => {
                if (entry.event_id) {
                    const eventId = String(entry.event_id);
                    if (!map.has(eventId)) map.set(eventId, []);
                    map.get(eventId)!.push(entry);
                }
                return map;
            }, new Map<string, LedgerEntry[]>());
            
            const attendeesByEvent = allAttendees.reduce((map, attendee) => {
                 const eventId = attendee.event && typeof attendee.event === 'object' ? attendee.event.id : String(attendee.event);
                if (eventId) {
                    if (!map.has(eventId)) map.set(eventId, []);
                    map.get(eventId)!.push(attendee);
                }
                return map;
            }, new Map<string, Attendee[]>());
            
            const analysisResults: AnalyzedEvent[] = [];

            for (const [eventId, entries] of ledgerByEvent.entries()) {
                const event = eventsById.get(eventId);
                if (!event) continue;

                let grossRevenue = 0, totalFees = 0, totalRefundsAndChargebacks = 0;
                entries.forEach(entry => {
                    if (entry.entry_type === 'ORDER_REVENUE') grossRevenue += entry.amount;
                    else if (entry.entry_type.includes('FEE') || entry.entry_type === 'DISCOUNTS') totalFees += entry.amount;
                    else if (entry.entry_type === 'REFUND' || entry.entry_type === 'CHARGEBACK') totalRefundsAndChargebacks += entry.amount;
                });

                const netProfit = grossRevenue + totalFees + totalRefundsAndChargebacks;
                const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
                const ticketCount = (attendeesByEvent.get(eventId) || []).filter(a => ['sold', 'manually_generated', 'door_sale'].includes(a.state)).length;

                analysisResults.push({ ...event, grossRevenue, totalFees, totalRefundsAndChargebacks, netProfit, profitMargin, ticketCount });
            }

            await db.setPerformanceCache(analysisResults);
            await db.setInKeyval('performance_last_updated', new Date());
            return analysisResults;
        };

        runTaskInBackground(
            'performance-analysis',
            'Performance Analysis',
            analysisTask,
            (result) => {
                setAnalyzedEvents(result);
                setLastUpdated(new Date());
            }
        );
    }, [apiClient, loading, runTaskInBackground]);

    const handlePageChange = (page: number) => {
        setPagination({ currentPage: page });
    };

    useEffect(() => {
        if (apiClient && analyzedEvents.length === 0 && !loading) {
            const loadInitialData = async () => {
                const { analyzedEvents: cachedData, lastUpdated: cachedLastUpdated } = await db.getPerformanceCache();
                if (cachedData) {
                    setAnalyzedEvents(cachedData);
                    if (cachedLastUpdated) setLastUpdated(new Date(cachedLastUpdated));
                }
            };
            loadInitialData();
        }
    }, [apiClient, analyzedEvents.length, loading]);
    
    return {
        analyzedEvents: paginatedEvents,
        fullAnalyzedEvents: sortedEvents,
        loading,
        error,
        lastUpdated,
        progress,
        performAnalysis,
        pagination: { ...pagination, total: sortedEvents.length },
        handlePageChange,
        requestPerformanceSort: requestSort,
        performanceSortConfig: sortConfig,
    };
};
