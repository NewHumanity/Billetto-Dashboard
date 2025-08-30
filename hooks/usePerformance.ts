



import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnalyzedEvent, BillettoEvent, LedgerEntry, Attendee, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
// Fix: Corrected import path for AddToastFn type
import { AddToastFn } from '../types';

const PERFORMANCE_PAGE_SIZE = 100;

const STATE_KEY = 'performance_analysis_state';
const RAW_EVENTS_KEY = 'performance_raw_events';
const RAW_LEDGER_KEY = 'performance_raw_ledger';
const RAW_ATTENDEES_KEY = 'performance_raw_attendees';

export const usePerformance = (apiClient: BillettoApiClient | null, runTaskInBackground: RunTaskInBackgroundSignature, backgroundTasks: BackgroundTask[], addToast: AddToastFn) => {
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

    const performPerformanceAnalysis = useCallback((forceRefresh = false) => {
        if (!apiClient || loading) return;

        const onRateLimit = (message: string) => {
            addToast(message, 'info');
        };

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void, signal: AbortSignal): Promise<AnalyzedEvent[]> => {
            if (!forceRefresh) {
                const { analyzedEvents: cachedData } = await db.getPerformanceCache();
                if (cachedData) {
                    return cachedData;
                }
            }

            let state = await db.getAnalysisCache<{ events: boolean, ledger: boolean, attendees: boolean }>(STATE_KEY) || { events: false, ledger: false, attendees: false };

            if (forceRefresh) {
                state = { events: false, ledger: false, attendees: false };
                await Promise.all([
                    db.clearAnalysisCache(RAW_EVENTS_KEY),
                    db.clearAnalysisCache(RAW_LEDGER_KEY),
                    db.clearAnalysisCache(RAW_ATTENDEES_KEY)
                ]);
            }

            // FIX: Make this function generic and add explicit return types to fix type errors on map/reduce.
             const fetchDataWithCacheAnd304 = async <T extends { id: string }>(
                stateKey: 'events' | 'ledger' | 'attendees',
                rawKey: string,
                endpoint: string,
                progressStart: number,
                progressWeight: number,
                fetchMessage: string
            ): Promise<T[]> => {
                if (state[stateKey]) {
                    updateProgress({ message: `Loaded cached ${stateKey}.`, value: progressStart + progressWeight });
                    return (await db.getAnalysisCache(rawKey) as T[]) || [];
                }
                try {
                    updateProgress({ message: fetchMessage, value: progressStart });
                    const data = await fetchAllPaginatedData<T>(endpoint, apiClient!, 5, p => updateProgress({ message: `${fetchMessage} (${p}%)`, value: progressStart + (p / 100) * progressWeight }), signal, onRateLimit);
                    await db.setAnalysisCache(rawKey, data);
                    state[stateKey] = true;
                    await db.setAnalysisCache(STATE_KEY, state);
                    return data;
                } catch (e) {
                    if (e instanceof NotModifiedError) {
                        updateProgress({ message: `Data for ${stateKey} is fresh (304).`, value: progressStart + progressWeight });
                        state[stateKey] = true;
                        await db.setAnalysisCache(STATE_KEY, state);
                        return (await db.getAnalysisCache(rawKey) as T[]) || [];
                    }
                    throw e;
                }
            };

            // FIX: Provide generic type arguments to ensure correct return types.
            const allEvents = await fetchDataWithCacheAnd304<BillettoEvent>('events', RAW_EVENTS_KEY, '/events', 0, 25, 'Fetching all events...');
            const allLedgerEntries = await fetchDataWithCacheAnd304<LedgerEntry>('ledger', RAW_LEDGER_KEY, '/ledger_entries', 25, 50, 'Fetching all financial records...');
            const allAttendees = await fetchDataWithCacheAnd304<Attendee>('attendees', RAW_ATTENDEES_KEY, '/attendees?expand=event&sort=-created_at', 75, 24, 'Fetching all attendees for ticket counts...');
            
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
    }, [apiClient, loading, runTaskInBackground, addToast]);

    const handlePerformancePageChange = (page: number) => {
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
        loadingPerformance: loading,
        performanceError: error,
        lastUpdatedPerformance: lastUpdated,
        performanceProgress: progress,
        performPerformanceAnalysis,
        performancePagination: { ...pagination, total: sortedEvents.length },
        handlePerformancePageChange,
        requestPerformanceSort: requestSort,
        performanceSortConfig: sortConfig,
    };
};