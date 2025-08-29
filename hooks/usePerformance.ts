

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnalyzedEvent, BillettoEvent, LedgerEntry, Attendee, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const PERFORMANCE_PAGE_SIZE = 100;

// Define keys for resumable analysis cache
const STATE_KEY = 'performance_analysis_state';
const RAW_EVENTS_KEY = 'performance_raw_events';
const RAW_LEDGER_KEY = 'performance_raw_ledger';
const RAW_ATTENDEES_KEY = 'performance_raw_attendees';

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

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void, isCancelled: () => boolean): Promise<AnalyzedEvent[]> => {
            if (!forceRefresh) {
                const { analyzedEvents: cachedData } = await db.getPerformanceCache();
                if (cachedData) {
                    return cachedData;
                }
            }

            // --- Resumable fetching logic ---
            let state = await db.getAnalysisCache<{ events: boolean, ledger: boolean, attendees: boolean }>(STATE_KEY) || { events: false, ledger: false, attendees: false };

            if (forceRefresh) {
                state = { events: false, ledger: false, attendees: false };
                await Promise.all([
                    db.clearAnalysisCache(RAW_EVENTS_KEY),
                    db.clearAnalysisCache(RAW_LEDGER_KEY),
                    db.clearAnalysisCache(RAW_ATTENDEES_KEY)
                ]);
            }
            
            let allEvents: BillettoEvent[];
            if (state.events) {
                allEvents = await db.getAnalysisCache(RAW_EVENTS_KEY) || [];
                updateProgress({ message: 'Loaded cached events.', value: 25 });
            } else {
                updateProgress({ message: 'Fetching all events...', value: 0 });
                allEvents = await fetchAllPaginatedData<BillettoEvent>('/events', apiClient, 5, p => updateProgress({ message: `Fetching events... (${p}%)`, value: (p / 100) * 25 }), isCancelled);
                await db.setAnalysisCache(RAW_EVENTS_KEY, allEvents);
                state.events = true;
                await db.setAnalysisCache(STATE_KEY, state);
            }

            let allLedgerEntries: LedgerEntry[];
             if (state.ledger) {
                allLedgerEntries = await db.getAnalysisCache(RAW_LEDGER_KEY) || [];
                updateProgress({ message: 'Loaded cached financials.', value: 75 });
            } else {
                updateProgress({ message: 'Fetching all financial records...', value: 25 });
                allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, p => updateProgress({ message: `Fetching financials... (${p}%)`, value: 25 + (p / 100) * 50 }), isCancelled);
                await db.setAnalysisCache(RAW_LEDGER_KEY, allLedgerEntries);
                state.ledger = true;
                await db.setAnalysisCache(STATE_KEY, state);
            }

            let allAttendees: Attendee[];
            if (state.attendees) {
                allAttendees = await db.getAnalysisCache(RAW_ATTENDEES_KEY) || [];
                updateProgress({ message: 'Loaded cached attendees.', value: 99 });
            } else {
                updateProgress({ message: 'Fetching all attendees for ticket counts...', value: 75 });
                allAttendees = await fetchAllPaginatedData<Attendee>('/attendees?expand=event&sort=-created_at', apiClient, 5, p => updateProgress({ message: `Fetching attendees... (${p}%)`, value: 75 + (p / 100) * 24 }), isCancelled);
                await db.setAnalysisCache(RAW_ATTENDEES_KEY, allAttendees);
                state.attendees = true;
                await db.setAnalysisCache(STATE_KEY, state);
            }
            
            // --- Analysis logic ---
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

            // --- Finalize and Cleanup ---
            await db.setPerformanceCache(analysisResults);
            await db.setInKeyval('performance_last_updated', new Date());
            
            // Cleanup raw data and state tracker
            await Promise.all([
                db.clearAnalysisCache(STATE_KEY),
                db.clearAnalysisCache(RAW_EVENTS_KEY),
                db.clearAnalysisCache(RAW_LEDGER_KEY),
                db.clearAnalysisCache(RAW_ATTENDEES_KEY)
            ]);

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