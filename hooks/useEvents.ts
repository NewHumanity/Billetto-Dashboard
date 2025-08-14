import { useState, useMemo, useCallback, useEffect } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionResponse, BookingQuestionsAnalysis, WordCloudData, AggregatedQuestion, QuestionType } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { useSortableData } from './useSortableData';
import { runBookingQuestionsAnalysis } from '../utils/analysis';

const ATTENDEES_PER_PAGE = 50;

export const useEvents = (apiClient: BillettoApiClient | null) => {
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [attendeePage, setAttendeePage] = useState(1);
    const [lastUpdatedEvents, setLastUpdatedEvents] = useState<Date | null>(null);
    const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees' | 'bookingQuestions'>('overview');
    const [eventFilter, setEventFilter] = useState<string>(() => localStorage.getItem('billettoEventFilter') || 'published');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [filterTicketGroupId, setFilterTicketGroupId] = useState<string>('all');

    const fetchAndCacheEvents = useCallback(async () => {
        if (!apiClient) return;
        setLoadingEvents(true);
        setEventsError(null);
        try {
            const response = await apiClient.getEvents();
            setEvents(response.data);
            await db.setEventsCache(response.data);
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

    const filteredEvents = useMemo(() => {
        if (!eventFilter || eventFilter === 'all') return events;
        return events.filter(event => event.state === eventFilter);
    }, [events, eventFilter]);

    useEffect(() => {
        setAttendeePage(1);
        setEventDetailView('overview');
        setFilterTicketGroupId('all'); // Reset filter when event changes
    }, [selectedEventId]);

    const triggerAnalysis = useCallback(async (force = false) => {
        if (!selectedEventId || !eventDetails?.allAttendees) return;
        
        setLoadingAnalysis(true);
        // On a forced re-analysis, clear the cache and reset the filter to 'all'
        if (force) {
            await db.setBookingQuestionsAnalysisCache(selectedEventId, []);
            setFilterTicketGroupId('all');
            const analysis = await runBookingQuestionsAnalysis({
                allOrders: eventDetails.allOrders,
                allAttendees: eventDetails.allAttendees,
                ticketGroups: eventDetails.ticketGroups,
                filterTicketGroupId: 'all'
            });
            if (analysis) {
                await db.setBookingQuestionsAnalysisCache(selectedEventId, analysis);
            }
            setEventDetails(prev => prev ? { ...prev, bookingQuestionsAnalysis: analysis ?? undefined } : null);
        }
        setLoadingAnalysis(false);

    }, [selectedEventId, eventDetails]);
    

    useEffect(() => {
        const fetchEventData = async () => {
            if (!selectedEventId || !apiClient) return;

            if (attendeePage > 1) { // Handle simple attendee pagination
                try {
                    const attendeesResponse = await apiClient.getEventAttendees(selectedEventId, attendeePage, ATTENDEES_PER_PAGE);
                    setEventDetails(prev => prev ? { ...prev, attendees: attendeesResponse.data } : null);
                } catch(err) {
                     if (err instanceof BillettoApiError) setDetailsError(err.message);
                    else setDetailsError('An unknown error occurred while fetching attendees.');
                }
                return;
            }

            setLoadingDetails(true);
            setDetailsError(null);
            
            const cachedDetails = await db.getEventDetailsCache(selectedEventId);
            if (cachedDetails && cachedDetails.financialSummary && cachedDetails.allAttendees) {
                setEventDetails(cachedDetails);
                setLoadingDetails(false);
                return;
            }

            try {
                const [event, attendeesResponse, ticketGroupsResponse] = await Promise.all([
                    apiClient.getEvent(selectedEventId),
                    apiClient.getEventAttendees(selectedEventId, 1, ATTENDEES_PER_PAGE, ['booking_question_responses.question']),
                    apiClient.getEventTicketGroups(selectedEventId)
                ]);

                const [allOrders, allAttendees, allLedgerEntries] = await Promise.all([
                    fetchAllPaginatedData(page => apiClient.getEventOrders(selectedEventId, page, 100, ['booking_question_responses.question'])),
                    fetchAllPaginatedData(page => apiClient.getEventAttendees(selectedEventId, page, 100, ['booking_question_responses.question'])),
                    fetchAllPaginatedData(page => apiClient.getEventLedgerEntries(selectedEventId, page, 100))
                ]);
                
                const ticketGroupsWithCalculatedRevenue = ticketGroupsResponse.data.map(tg => {
                    const price = typeof tg.price === 'number' ? tg.price : 0;
                    const sold = typeof tg.sold_count === 'number' ? tg.sold_count : 0;
                    return { ...tg, revenue: price * sold };
                });

                const grossRevenue = ticketGroupsWithCalculatedRevenue.reduce((sum, tg) => sum + (tg.revenue || 0), 0);
                const billettoFees = allLedgerEntries.filter(e => e.type === 'fee' || e.type === 'charge').reduce((s, e) => s + e.amount, 0);
                const netPayout = grossRevenue + billettoFees;

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
                
                const newDetails: EventDetails = {
                    event,
                    attendees: attendeesResponse.data,
                    ticketGroups: ticketGroupsWithCalculatedRevenue,
                    stats: { totalTicketsSold: allAttendees.length, totalRevenue: grossRevenue / 100, currency: event.currency },
                    financialSummary: { grossRevenue, billettoFees: Math.abs(billettoFees), netPayout },
                    salesByChannel: Object.values(salesByChannel),
                    salesVelocity: Object.values(salesVelocity).sort((a,b) => a.date.localeCompare(b.date)),
                    allOrders,
                    allAttendees
                };
                
                setEventDetails(newDetails);
                await db.setEventDetailsCache(newDetails);

            } catch (err) {
                if (err instanceof BillettoApiError) setDetailsError(err.message);
                else setDetailsError('An unknown error occurred while fetching event details.');
            } finally {
                setLoadingDetails(false);
            }
        };
        fetchEventData();
    }, [selectedEventId, attendeePage, apiClient]);
    
    // Effect to run and cache analysis when data is ready or filter changes
    useEffect(() => {
        const manageAnalysis = async () => {
            if (!selectedEventId || !eventDetails?.allAttendees) {
                return;
            }
            setLoadingAnalysis(true);
            let analysis: BookingQuestionsAnalysis | null = null;
            
            // Check cache only if not filtering and it's not a forced refresh
            if (filterTicketGroupId === 'all') {
                const cached = await db.getBookingQuestionsAnalysisCache(selectedEventId);
                if (cached && cached.length > 0) {
                    analysis = cached;
                }
            }
            
            // If no valid cache, run analysis
            if (!analysis) {
                analysis = await runBookingQuestionsAnalysis({
                    allOrders: eventDetails.allOrders,
                    allAttendees: eventDetails.allAttendees,
                    ticketGroups: eventDetails.ticketGroups,
                    filterTicketGroupId
                });
            }

            // Cache the result ONLY if it's the full, unfiltered view
            if (filterTicketGroupId === 'all' && analysis) {
                 await db.setBookingQuestionsAnalysisCache(selectedEventId, analysis);
            }
            
            setEventDetails(prev => prev ? { ...prev, bookingQuestionsAnalysis: analysis ?? undefined } : null);
            setLoadingAnalysis(false);
        };
        
        if (eventDetailView === 'bookingQuestions') {
             manageAnalysis();
        }
    }, [selectedEventId, eventDetails?.allAttendees, filterTicketGroupId, eventDetailView]);


    const { items: sortedEventAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(eventDetails?.attendees || [], { key: 'name', direction: 'ascending' });
    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData<TicketGroup>(eventDetails?.ticketGroups || [], { key: 'revenue', direction: 'descending' });

    const finalEventDetails = useMemo(() => {
        if (!eventDetails) return null;
        return {
            ...eventDetails,
            attendees: sortedEventAttendees,
            ticketGroups: sortedTicketGroups,
        };
    }, [eventDetails, sortedEventAttendees, sortedTicketGroups]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        filteredEvents, eventFilter, setEventFilter, selectedEventId, setSelectedEventId,
        finalEventDetails, loadingDetails, detailsError,
        eventDetailView, setEventDetailView, attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort, ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
    };
};