






import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionsAnalysis, Order, LedgerEntry, EventGroup, EventListItemType } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { useSortableData } from './useSortableData';
import { runBookingQuestionsAnalysis } from '../utils/analysis';

const ATTENDEES_PER_PAGE = 100;

// This function is extracted to be reusable for both single events and aggregated group data
const processAndBuildEventDetails = (
    event: BillettoEvent,
    allOrders: Order[],
    allAttendees: Attendee[],
    allLedgerEntries: LedgerEntry[],
    ticketGroupsData: TicketGroup[]
): Omit<EventDetails, 'attendees'> => {

    const ticketGroupsWithCalculatedRevenue = ticketGroupsData.map(tg => {
        const price = typeof tg.price === 'number' ? tg.price : 0;
        const sold = typeof tg.sold_count === 'number' ? tg.sold_count : 0;
        return { ...tg, revenue: price * sold };
    });

    const estimatedGrossRevenue = ticketGroupsWithCalculatedRevenue.reduce((sum, tg) => sum + (tg.revenue || 0), 0);

    const salesByChannel = allOrders.reduce((acc, order) => {
        const channel = order.sales_channel.replace('_', ' ') || 'Unknown';
        if (!acc[channel]) acc[channel] = { name: channel, count: 0 };
        acc[channel].count++;
        return acc;
    }, {} as {[key: string]: {name: string, count: number}});

    const salesVelocity = allOrders.reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, tickets: 0 };
        acc[date].tickets += order.order_lines.data.reduce((sum, line) => sum + line.quantity, 0);
        return acc;
    }, {} as {[key: string]: {date: string, tickets: number}});
    
    let financialSummary: EventDetails['financialSummary'] | undefined = undefined;
    if (allLedgerEntries.length > 0) {
        const grossRevenue = allLedgerEntries
            .filter(e => e.entry_type === 'ORDER_REVENUE')
            .reduce((sum, e) => sum + e.amount, 0);
        const billettoFees = allLedgerEntries
            .filter(e => e.entry_type.includes('FEE'))
            .reduce((sum, e) => sum + e.amount, 0); // fee is negative
        const netPayout = allLedgerEntries
            .reduce((sum, e) => sum + e.amount, 0);
        
        financialSummary = { grossRevenue, billettoFees, netPayout };
    }

    const revenueBySource = allLedgerEntries.reduce((acc, entry) => {
        if (entry.entry_type === 'ORDER_REVENUE' && entry.source) {
            const sourceName = entry.source.charAt(0).toUpperCase() + entry.source.slice(1);
            if (!acc[sourceName]) acc[sourceName] = { name: sourceName, revenue: 0 };
            acc[sourceName].revenue += entry.amount;
        }
        return acc;
    }, {} as {[key: string]: { name: string; revenue: number }});

    const optInCount = allAttendees.filter(a => a.newsletter_permission).length;
    const newsletterOptInRate = allAttendees.length > 0 ? (optInCount / allAttendees.length) * 100 : 0;

    const aggregateLocation = (key: 'city' | 'country_code') => {
        const counts = allAttendees.reduce((acc, attendee) => {
            const location = attendee[key];
            if (location) {
                acc[location] = (acc[location] || 0) + 1;
            }
            return acc;
        }, {} as {[key: string]: number});

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    };

    const salesByCity = aggregateLocation('city');
    const salesByCountry = aggregateLocation('country_code');

    return {
        event,
        ticketGroups: ticketGroupsWithCalculatedRevenue,
        stats: { 
            totalTicketsSold: allAttendees.length, 
            totalRevenue: estimatedGrossRevenue, 
            currency: event.currency,
            newsletterOptInRate,
        },
        financialSummary,
        salesByChannel: Object.values(salesByChannel),
        salesByCity,
        salesByCountry,
        salesVelocity: Object.values(salesVelocity).sort((a,b) => a.date.localeCompare(b.date)),
        revenueBySource: Object.values(revenueBySource),
        allOrders,
        allAttendees,
        bookingQuestionsLoaded: false,
    };
};

export const useEvents = (apiClient: BillettoApiClient | null) => {
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<EventListItemType | null>(null);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [attendeePage, setAttendeePage] = useState(1);
    const [lastUpdatedEvents, setLastUpdatedEvents] = useState<Date | null>(null);
    const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees' | 'bookingQuestions' | 'marketing'>('overview');
    const [eventFilter, setEventFilter] = useState<string>(() => localStorage.getItem('billettoEventFilter') || 'published');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [filterTicketGroupId, setFilterTicketGroupId] = useState<string>('all');
    const [loadingProgress, setLoadingProgress] = useState<{ orders?: number; attendees?: number; ledger?: number; message?: string; }>();
    
    const lastAnalysisInputs = useRef<{ filter: string; orderCount: number; attendeeCount: number; } | null>(null);

    const handleSelectEvent = useCallback((item: EventListItemType | null) => {
        if (item?.id !== selectedItem?.id) {
            setEventDetails(null);
            setSelectedItem(item);
            if (item) {
                 const minimalDetails: EventDetails = {
                    event: item,
                    attendees: [], ticketGroups: [],
                    stats: { totalTicketsSold: 0, totalRevenue: 0, currency: item.currency || 'USD' },
                };
                setEventDetails(minimalDetails);
            }
        }
    }, [selectedItem]);

    const fetchAndCacheEvents = useCallback(async () => {
        if (!apiClient) return;
        setLoadingEvents(true);
        setEventsError(null);
        try {
            const allEvents = await fetchAllPaginatedData<BillettoEvent>(
                '/events?sort=-starts_at',
                apiClient
            );
            setEvents(allEvents);
            await db.setEventsCache(allEvents);
            const { lastUpdated } = await db.getEventsCache();
            if (lastUpdated) setLastUpdatedEvents(new Date(lastUpdated));
        } catch (err) {
            if (err instanceof BillettoApiError) setEventsError(err.message);
            else setEventsError('An unknown error occurred while fetching events.');
        } finally {
            setLoadingEvents(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedEvents = async () => {
            const { events: cachedEvents, lastUpdated: luEvents } = await db.getEventsCache();
            if (cachedEvents && cachedEvents.length > 0) {
                setEvents(cachedEvents);
                if (luEvents) setLastUpdatedEvents(new Date(luEvents));
            } else {
                fetchAndCacheEvents();
            }
        };
        if (apiClient) {
            loadCachedEvents();
        }
    }, [apiClient, fetchAndCacheEvents]);
    
    useEffect(() => {
        localStorage.setItem('billettoEventFilter', eventFilter);
    }, [eventFilter]);

    const eventListItems = useMemo((): EventListItemType[] => {
        const parents: EventGroup[] = [];
        const childrenByParentId = new Map<string, BillettoEvent[]>();
        const standaloneEvents: BillettoEvent[] = [];

        for (const event of events) {
            if (event.kind === 'recurring' && event.parent) {
                const parentId = typeof event.parent === 'string' ? event.parent : (event.parent as any).id;
                if (!childrenByParentId.has(parentId)) {
                    childrenByParentId.set(parentId, []);
                }
                childrenByParentId.get(parentId)!.push(event);
            } else if (event.kind === 'scheduled') {
                parents.push({ ...event, isGroup: true, children: [] });
            } else {
                standaloneEvents.push(event);
            }
        }

        parents.forEach(parent => {
            const children = (childrenByParentId.get(parent.id) || []).sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
            parent.children = children;
        });

        const combinedList: EventListItemType[] = [...parents, ...standaloneEvents];
        combinedList.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        
        return combinedList;
    }, [events]);

    const filteredEventListItems = useMemo(() => {
        if (!eventFilter || eventFilter === 'all') return eventListItems;

        const result: EventListItemType[] = [];
        for (const item of eventListItems) {
            if ('isGroup' in item) {
                const visibleChildren = item.children.filter(child => child.state === eventFilter);
                if (item.state === eventFilter || visibleChildren.length > 0) {
                    result.push({ ...item, children: visibleChildren });
                }
            } else {
                if (item.state === eventFilter) {
                    result.push(item);
                }
            }
        }
        return result;
    }, [eventListItems, eventFilter]);

    useEffect(() => {
        setAttendeePage(1);
        setEventDetailView('overview');
        setFilterTicketGroupId('all');
        lastAnalysisInputs.current = null;
    }, [selectedItem]);

    const triggerAnalysis = useCallback(async (force = false) => {
        if (!selectedItem || !eventDetails || !apiClient) return;
        if (!force) return;

        setLoadingAnalysis(true);
        setFilterTicketGroupId('all');
        lastAnalysisInputs.current = null;

        try {
            const [allOrdersExpanded, allAttendeesExpanded] = await Promise.all([
                fetchAllPaginatedData<Order>(
                    `/orders?event=${selectedItem.id}&limit=100&sort=created_at&expand=data.order_lines,data.booking_question_responses.data.question`,
                    apiClient
                ),
                fetchAllPaginatedData<Attendee>(
                    `/events/${selectedItem.id}/attendees?limit=100&expand=data.booking_question_responses.data.question`,
                    apiClient
                )
            ]);

            const analysis = await runBookingQuestionsAnalysis({
                allOrders: allOrdersExpanded, allAttendees: allAttendeesExpanded,
                ticketGroups: eventDetails.ticketGroups, filterTicketGroupId: 'all'
            });

            const finalDetails: EventDetails = { ...eventDetails, allOrders: allOrdersExpanded, allAttendees: allAttendeesExpanded, bookingQuestionsLoaded: true, bookingQuestionsAnalysis: analysis ?? undefined };
            setEventDetails(finalDetails);
            await db.setEventDetailsCache(finalDetails);
            if(analysis) await db.setBookingQuestionsAnalysisCache(selectedItem.id, analysis);

        } catch (err) {
            console.error("Failed to force re-analysis:", err);
            setDetailsError(err instanceof BillettoApiError ? err.message : 'Failed to re-analyze data.');
        } finally {
            setLoadingAnalysis(false);
        }
    }, [selectedItem, eventDetails, apiClient]);

    useEffect(() => {
        const fetchEventData = async () => {
            if (!selectedItem || !apiClient) return;
            const selectedEventId = selectedItem.id;

            if (attendeePage > 1 && !('isGroup' in selectedItem)) {
                try {
                    const attendeesResponse = await apiClient.getEventAttendees(selectedEventId, attendeePage, ATTENDEES_PER_PAGE);
                    setEventDetails(prev => prev ? { ...prev, attendees: attendeesResponse.data } : null);
                } catch(err) {
                    if (err instanceof BillettoApiError) setDetailsError(err.message); else setDetailsError('An unknown error occurred while fetching attendees.');
                }
                return;
            }

            setLoadingDetails(true);
            setDetailsError(null);
            setLoadingProgress({});
            
            const cachedDetails = await db.getEventDetailsCache(selectedEventId);
            if (cachedDetails && cachedDetails.salesByChannel && cachedDetails.allAttendees && cachedDetails.financialSummary) {
                setEventDetails(cachedDetails);
                setLoadingDetails(false);
                return;
            }

            try {
                if ('isGroup' in selectedItem) {
                    setLoadingProgress({ message: `Aggregating ${selectedItem.children.length} events...` });
                    let aggregatedOrders: Order[] = [], aggregatedAttendees: Attendee[] = [], aggregatedLedger: LedgerEntry[] = [], aggregatedTicketGroups: TicketGroup[] = [];

                    for (const child of selectedItem.children) {
                         const [orders, attendees, ledger, tgResponse] = await Promise.all([
                            fetchAllPaginatedData<Order>(`/orders?event=${child.id}&limit=100`, apiClient),
                            fetchAllPaginatedData<Attendee>(`/events=${child.id}/attendees?limit=100`, apiClient),
                            fetchAllPaginatedData<LedgerEntry>(`/ledger_entries?event=${child.id}&limit=100`, apiClient),
                            apiClient.getEventTicketGroups(child.id)
                        ]);
                        aggregatedOrders.push(...orders);
                        aggregatedAttendees.push(...attendees);
                        aggregatedLedger.push(...ledger);
                        aggregatedTicketGroups.push(...tgResponse.data);
                    }
                    const processedData = processAndBuildEventDetails(selectedItem, aggregatedOrders, aggregatedAttendees, aggregatedLedger, aggregatedTicketGroups);
                    const newDetails: EventDetails = { ...processedData, attendees: aggregatedAttendees.slice(0, ATTENDEES_PER_PAGE) };
                    setEventDetails(newDetails);
                    await db.setEventDetailsCache(newDetails);

                } else {
                    const [attendeesResponse, ticketGroupsResponse] = await Promise.all([
                        apiClient.getEventAttendees(selectedEventId, 1, ATTENDEES_PER_PAGE),
                        apiClient.getEventTicketGroups(selectedEventId)
                    ]);
                    setLoadingProgress({ orders: 0, attendees: 0, ledger: 0 });
                    
                    const [allOrders, allAttendees, allLedgerEntries] = await Promise.all([
                        fetchAllPaginatedData<Order>(`/orders?event=${selectedEventId}&limit=100&sort=created_at&expand=data.order_lines`, apiClient, 5, p => setLoadingProgress(pr => ({ ...pr, orders: p }))),
                        fetchAllPaginatedData<Attendee>(`/events/${selectedEventId}/attendees?limit=100`, apiClient, 5, p => setLoadingProgress(pr => ({ ...pr, attendees: p }))),
                        fetchAllPaginatedData<LedgerEntry>(`/ledger_entries?event=${selectedEventId}&limit=100&sort=-created_at`, apiClient, 5, p => setLoadingProgress(pr => ({ ...pr, ledger: p }))),
                    ]);

                    const processedData = processAndBuildEventDetails(selectedItem, allOrders, allAttendees, allLedgerEntries, ticketGroupsResponse.data);
                    const newDetails: EventDetails = { ...processedData, attendees: attendeesResponse.data };
                    setEventDetails(newDetails);
                    await db.setEventDetailsCache(newDetails);
                }
            } catch (err) {
                if (err instanceof BillettoApiError) setDetailsError(err.message);
                else setDetailsError('An unknown error occurred while fetching event details.');
            } finally {
                setLoadingDetails(false);
                setLoadingProgress({});
            }
        };
        fetchEventData();
    }, [selectedItem, attendeePage, apiClient]);
    
    useEffect(() => {
        const manageAnalysis = async () => {
            if (!selectedItem || !eventDetails || !apiClient || eventDetailView !== 'bookingQuestions') return;
            setLoadingAnalysis(true);
            let detailsForAnalysis = eventDetails;

            if (!eventDetails.bookingQuestionsLoaded) {
                try {
                    const expandQuery = 'data.order_lines,data.booking_question_responses.data.question';
                    const allOrdersExpanded = 'isGroup' in selectedItem
                        ? (await Promise.all(selectedItem.children.map(c => fetchAllPaginatedData<Order>(`/orders?event=${c.id}&limit=100&expand=${expandQuery}`, apiClient)))).flat()
                        : await fetchAllPaginatedData<Order>(`/orders?event=${selectedItem.id}&limit=100&expand=${expandQuery}`, apiClient);

                    const allAttendeesExpanded = 'isGroup' in selectedItem
                        ? (await Promise.all(selectedItem.children.map(c => fetchAllPaginatedData<Attendee>(`/events/${c.id}/attendees?limit=100&expand=data.booking_question_responses.data.question`, apiClient)))).flat()
                        : await fetchAllPaginatedData<Attendee>(`/events/${selectedItem.id}/attendees?limit=100&expand=data.booking_question_responses.data.question`, apiClient);
                    
                    detailsForAnalysis = { ...eventDetails, allOrders: allOrdersExpanded, allAttendees: allAttendeesExpanded, bookingQuestionsLoaded: true };
                    setEventDetails(detailsForAnalysis);
                    db.setEventDetailsCache(detailsForAnalysis);
                } catch (err) {
                    console.error("Failed to fetch expanded data for analysis:", err);
                    setDetailsError(err instanceof BillettoApiError ? err.message : 'Failed to load booking questions data.');
                    setLoadingAnalysis(false);
                    return;
                }
            }

            const currentAnalysisInputs = { filter: filterTicketGroupId, orderCount: detailsForAnalysis.allOrders?.length ?? 0, attendeeCount: detailsForAnalysis.allAttendees?.length ?? 0 };
            if (lastAnalysisInputs.current && lastAnalysisInputs.current.filter === currentAnalysisInputs.filter && lastAnalysisInputs.current.orderCount === currentAnalysisInputs.orderCount && lastAnalysisInputs.current.attendeeCount === currentAnalysisInputs.attendeeCount) {
                setLoadingAnalysis(false);
                return;
            }
            
            const analysis = await runBookingQuestionsAnalysis({ allOrders: detailsForAnalysis.allOrders, allAttendees: detailsForAnalysis.allAttendees, ticketGroups: detailsForAnalysis.ticketGroups, filterTicketGroupId });
            setEventDetails(prev => (prev && prev.event.id === detailsForAnalysis.event.id) ? { ...prev, bookingQuestionsAnalysis: analysis ?? undefined } : prev);
            if (filterTicketGroupId === 'all' && analysis) db.setBookingQuestionsAnalysisCache(selectedItem.id, analysis);
            lastAnalysisInputs.current = currentAnalysisInputs;
            setLoadingAnalysis(false);
        };
        manageAnalysis();
    }, [selectedItem, eventDetailView, filterTicketGroupId, apiClient, eventDetails]);

    const { items: sortedEventAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(eventDetails?.attendees || [], { key: 'name', direction: 'ascending' });
    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData<TicketGroup>(eventDetails?.ticketGroups || [], { key: 'revenue', direction: 'descending' });

    const finalEventDetails = useMemo(() => {
        if (!eventDetails) return null;
        return { ...eventDetails, attendees: sortedEventAttendees, ticketGroups: sortedTicketGroups };
    }, [eventDetails, sortedEventAttendees, sortedTicketGroups]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem: handleSelectEvent,
        finalEventDetails, loadingDetails, detailsError,
        eventDetailView, setEventDetailView, attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort, ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
    };
};