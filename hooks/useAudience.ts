
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AudienceMember, Order, Attendee, LedgerEntry, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { AddToastFn } from '../types';
import * as Comlink from 'comlink';
import type { AnalysisWorkerApi } from '../workers/analysis.worker';
import { OrderSchema, AttendeeSchema, LedgerEntrySchema } from '../schemas';
import { analyzeAudience } from '../utils/analysisLogic';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

const STATE_KEY = 'audience_analysis_state';
const RAW_ORDERS_KEY = 'audience_raw_orders';
const RAW_ATTENDEES_KEY = 'audience_raw_attendees';
const RAW_LEDGER_KEY = 'audience_raw_ledger';


export const useAudience = (apiClient: BillettoApiClient | null, runTaskInBackground: RunTaskInBackgroundSignature, backgroundTasks: BackgroundTask[], addToast: AddToastFn) => {
    const [audience, setAudience] = useState<AudienceMember[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [pagination, setPagination] = useState({ currentPage: 1 });
    const [activeSegment, setActiveSegment] = useState('All');

    const workerRef = useRef<Worker | null>(null);
    const workerApiRef = useRef<Comlink.Remote<AnalysisWorkerApi> | null>(null);

    useEffect(() => {
        try {
            // Use standard ES Module worker initialization
            // Wrapped in try-catch to handle environments like AIStudio where import.meta.url might be restricted
            workerRef.current = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' });
            workerApiRef.current = Comlink.wrap<AnalysisWorkerApi>(workerRef.current!);
        } catch (e) {
            console.warn("Worker initialization failed. Analysis will run on the main thread.", e);
            // We do not toast here to avoid bothering the user; we'll fallback silently.
        }
        
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

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

    const performAudienceAnalysis = useCallback((forceRefresh = false) => {
        if (!apiClient || loading) {
            return;
        }

        const onRateLimit = (message: string) => {
            addToast(message, 'info');
        };

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void, signal: AbortSignal): Promise<AudienceMember[]> => {
            if (!forceRefresh) {
                const { audienceData } = await db.getAudienceCache();
                if (audienceData) {
                    return audienceData;
                }
            }

            let state = await db.getAnalysisCache<{ orders: boolean, attendees: boolean, ledger: boolean }>(STATE_KEY) || { orders: false, attendees: false, ledger: false };
            if (forceRefresh) {
                state = { orders: false, attendees: false, ledger: false };
                await Promise.all([
                    db.clearAnalysisCache(RAW_ORDERS_KEY),
                    db.clearAnalysisCache(RAW_ATTENDEES_KEY),
                    db.clearAnalysisCache(RAW_LEDGER_KEY)
                ]);
            }
            
            const fetchDataWithCacheAnd304 = async <T extends { id: string }>(
                stateKey: 'orders' | 'attendees' | 'ledger',
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
            
            const allOrders = await fetchDataWithCacheAnd304<Order>('orders', RAW_ORDERS_KEY, '/orders?expand=event', 0, 33, 'Fetching all orders...', OrderSchema);
            const allAttendees = await fetchDataWithCacheAnd304<Attendee>('attendees', RAW_ATTENDEES_KEY, '/attendees?expand=event&sort=-created_at', 33, 33, 'Fetching all attendees...', AttendeeSchema);
            const allLedgerEntries = await fetchDataWithCacheAnd304<LedgerEntry>('ledger', RAW_LEDGER_KEY, '/ledger_entries', 66, 33, 'Fetching all financials...', LedgerEntrySchema);

            updateProgress({ message: 'Analyzing customer data...', value: 99 });

            // Run analysis (Worker or Main Thread fallback)
            let finalAudience: AudienceMember[];
            if (workerApiRef.current) {
                finalAudience = await workerApiRef.current.analyzeAudience(allOrders, allAttendees, allLedgerEntries);
            } else {
                console.log("Running audience analysis on main thread (Worker unavailable).");
                finalAudience = analyzeAudience(allOrders, allAttendees, allLedgerEntries);
            }

            updateProgress({ message: 'Finalizing...', value: 100 });

            await db.setAudienceCache(finalAudience);
            await db.setInKeyval('audience_last_updated', new Date());

            await Promise.all([
                db.clearAnalysisCache(STATE_KEY),
                db.clearAnalysisCache(RAW_ORDERS_KEY),
                db.clearAnalysisCache(RAW_ATTENDEES_KEY),
                db.clearAnalysisCache(RAW_LEDGER_KEY)
            ]);
            
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
    }, [apiClient, loading, runTaskInBackground, addToast]);

    const handleAudiencePageChange = (page: number) => {
        setPagination({ currentPage: page });
    };
    
    useEffect(() => {
        if (apiClient && audience.length === 0 && !loading) {
            const loadInitialData = async () => {
                const { audienceData, lastUpdated: cachedLastUpdated } = await db.getAudienceCache();
                if (audienceData) {
                    setAudience(audienceData);
                    if (cachedLastUpdated) setLastUpdated(new Date(cachedLastUpdated));
                }
            };
            loadInitialData();
        }
    }, [apiClient, audience.length, loading]);

    return {
        audience: paginatedAudience,
        fullAudience: sortedAudience,
        loadingAudience: loading,
        audienceError: error,
        lastUpdatedAudience: lastUpdated,
        audienceProgress: progress,
        performAudienceAnalysis,
        audiencePagination: { ...pagination, total: filteredAudience.length },
        handleAudiencePageChange,
        requestAudienceSort: requestSort,
        audienceSortConfig: sortConfig,
        activeSegment,
        setActiveSegment,
    };
};
