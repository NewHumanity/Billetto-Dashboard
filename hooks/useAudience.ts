

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AudienceMember, Order, Attendee, LedgerEntry, BackgroundTask, RunTaskInBackgroundSignature } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import * as db from '../services/dbService';
import { useSortableData } from './useSortableData';
import { fetchAllPaginatedData } from '../utils/apiHelpers';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

// Define keys for resumable analysis cache
const STATE_KEY = 'audience_analysis_state';
const RAW_ORDERS_KEY = 'audience_raw_orders';
const RAW_ATTENDEES_KEY = 'audience_raw_attendees';
const RAW_LEDGER_KEY = 'audience_raw_ledger';


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

        const analysisTask = async (updateProgress: (progress: { value: number; message: string }) => void, isCancelled: () => boolean): Promise<AudienceMember[]> => {
            if (!forceRefresh) {
                const { audienceData } = await db.getAudienceCache();
                if (audienceData) {
                    return audienceData;
                }
            }

            // --- Resumable fetching logic ---
            let state = await db.getAnalysisCache<{ orders: boolean, attendees: boolean, ledger: boolean }>(STATE_KEY) || { orders: false, attendees: false, ledger: false };
            if (forceRefresh) {
                state = { orders: false, attendees: false, ledger: false };
                await Promise.all([
                    db.clearAnalysisCache(RAW_ORDERS_KEY),
                    db.clearAnalysisCache(RAW_ATTENDEES_KEY),
                    db.clearAnalysisCache(RAW_LEDGER_KEY)
                ]);
            }
            
            let allOrders: Order[];
            if (state.orders) {
                allOrders = await db.getAnalysisCache(RAW_ORDERS_KEY) || [];
                updateProgress({ message: 'Loaded cached orders.', value: 33 });
            } else {
                 updateProgress({ message: 'Fetching all orders...', value: 0 });
                 allOrders = await fetchAllPaginatedData<Order>('/orders?expand=event', apiClient, 5, p => updateProgress({ message: `Fetching orders... (${p}%)`, value: (p / 100) * 33 }), isCancelled);
                 await db.setAnalysisCache(RAW_ORDERS_KEY, allOrders);
                 state.orders = true;
                 await db.setAnalysisCache(STATE_KEY, state);
            }

            let allAttendees: Attendee[];
            if (state.attendees) {
                allAttendees = await db.getAnalysisCache(RAW_ATTENDEES_KEY) || [];
                updateProgress({ message: 'Loaded cached attendees.', value: 66 });
            } else {
                updateProgress({ message: 'Fetching all attendees...', value: 33 });
                allAttendees = await fetchAllPaginatedData<Attendee>('/attendees?expand=event&sort=-created_at', apiClient, 5, p => updateProgress({ message: `Fetching attendees... (${p}%)`, value: 33 + (p / 100) * 33 }), isCancelled);
                await db.setAnalysisCache(RAW_ATTENDEES_KEY, allAttendees);
                state.attendees = true;
                await db.setAnalysisCache(STATE_KEY, state);
            }

            let allLedgerEntries: LedgerEntry[];
            if (state.ledger) {
                allLedgerEntries = await db.getAnalysisCache(RAW_LEDGER_KEY) || [];
                updateProgress({ message: 'Loaded cached financials.', value: 99 });
            } else {
                updateProgress({ message: 'Fetching all financial records...', value: 66 });
                allLedgerEntries = await fetchAllPaginatedData<LedgerEntry>('/ledger_entries', apiClient, 5, p => updateProgress({ message: `Fetching financials... (${p}%)`, value: 66 + (p / 100) * 33 }), isCancelled);
                await db.setAnalysisCache(RAW_LEDGER_KEY, allLedgerEntries);
                state.ledger = true;
                await db.setAnalysisCache(STATE_KEY, state);
            }


            // --- Analysis logic ---
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

            // --- Finalize and Cleanup ---
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
                }
            };
            loadInitialData();
        }
    }, [apiClient, audience.length, loading]);

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