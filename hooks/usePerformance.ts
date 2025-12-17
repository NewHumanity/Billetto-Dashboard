
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AnalyzedEvent, BillettoEvent, LedgerEntry, Attendee, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { AddToastFn } from '../types';
import * as Comlink from 'comlink';
import type { AnalysisWorkerApi } from '../workers/analysis.worker';
import { BillettoEventSchema, LedgerEntrySchema, AttendeeSchema } from '../schemas';
import { analyzePerformance } from '../utils/analysisLogic';

const PERFORMANCE_PAGE_SIZE = 100;

const STATE_KEY = 'performance_analysis_state';
const RAW_EVENTS_KEY = 'performance_raw_events';
const RAW_LEDGER_KEY = 'performance_raw_ledger';
const RAW_ATTENDEES_KEY = 'performance_raw_attendees';

export const usePerformance = (apiClient: BillettoApiClient | null, runTaskInBackground: RunTaskInBackgroundSignature, backgroundTasks: BackgroundTask[], addToast: AddToastFn) => {
    const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });

    const workerRef = useRef<Worker | null>(null);
    const workerApiRef = useRef<Comlink.Remote<AnalysisWorkerApi> | null>(null);

    useEffect(() => {
        try {
            // Use standard ES Module worker initialization
            workerRef.current = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
            workerApiRef.current = Comlink.wrap<AnalysisWorkerApi>(workerRef.current!);
        } catch (e) {
            console.warn("Worker initialization failed. Analysis will run on the main thread.", e);
        }
        
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

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
        if (!apiClient || loading) {
            return;
        }

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

             const fetchDataWithCacheAnd304 = async <T extends { id: string }>(
                stateKey: 'events' | 'ledger' | 'attendees',
                rawKey: string,
                endpoint: string,
                progressStart: number,
                progressWeight: number,
                fetchMessage: string,
                schema: any
            ): Promise<T[]> => {
                if (state[stateKey]) {
                    updateProgress({ message: `Loaded cached ${stateKey}.`, value: progressStart + progressWeight });
                    return (await db.getAnalysisCache(rawKey) as T[]) || [];
                }
                try {
                    updateProgress({ message: fetchMessage, value: progressStart });
                    const data = await fetchAllPaginatedData<T>(endpoint, apiClient!, 5, p => updateProgress({ message: `${fetchMessage} (${p}%)`, value: progressStart + (p / 100) * progressWeight }), signal, onRateLimit, schema);
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

            const allEvents = await fetchDataWithCacheAnd304<BillettoEvent>('events', RAW_EVENTS_KEY, '/events', 0, 25, 'Fetching all events...', BillettoEventSchema);
            const allLedgerEntries = await fetchDataWithCacheAnd304<LedgerEntry>('ledger', RAW_LEDGER_KEY, '/ledger_entries', 25, 50, 'Fetching all financial records...', LedgerEntrySchema);
            const allAttendees = await fetchDataWithCacheAnd304<Attendee>('attendees', RAW_ATTENDEES_KEY, '/attendees?expand=event&sort=-created_at', 75, 24, 'Fetching all attendees for ticket counts...', AttendeeSchema);
            
            updateProgress({ message: 'Calculating profitability...', value: 99 });

            // Run analysis (Worker or Main Thread fallback)
            let analysisResults: AnalyzedEvent[];
            if (workerApiRef.current) {
                analysisResults = await workerApiRef.current.analyzePerformance(allEvents, allLedgerEntries, allAttendees);
            } else {
                console.log("Running performance analysis on main thread (Worker unavailable).");
                analysisResults = analyzePerformance(allEvents, allLedgerEntries, allAttendees);
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
