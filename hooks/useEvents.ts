
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionsAnalysis, Order, LedgerEntry, EventGroup, EventListItemType, AvailableQuestion, SalesChannelData } from '../types';
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

    const soldCountsByName: { [name: string]: number } = {};
    allOrders.forEach(order => {
        order.order_lines.data.forEach(line => {
            soldCountsByName[line.name] = (soldCountsByName[line.name] || 0) + line.quantity;
        });
    });

    const ticketGroupsWithCalculatedRevenue = ticketGroupsData.map(tg => {
        const sold_count = soldCountsByName[tg.name] || 0;
        const price = typeof tg.price === 'number' ? tg.price : 0;
        
        let state: TicketGroup['state'] = 'off_sale';
        const now = new Date().getTime();
        const starts = tg.sells_from ? new Date(tg.sells_from).getTime() : 0;
        const ends = tg.sells_to ? new Date(tg.sells_to).getTime() : Infinity;

        if (now >= starts && now <= ends) {
            state = 'on_sale';
        }

        if (tg.quantity !== null && sold_count >= tg.quantity) {
            state = 'sold_out';
        }

        return { 
            ...tg, 
            sold_count,
            state,
            revenue: price * sold_count 
        };
    });


    const estimatedGrossRevenue = ticketGroupsWithCalculatedRevenue.reduce((sum, tg) => sum + (tg.revenue || 0), 0);
    
    // Hierarchical Sales Channel Breakdown
    const salesMap: { [key: string]: { count: number; children: { [key: string]: { count: number } } } } = {};
    allOrders.forEach(order => {
        const channel = (order.sales_channel || 'unknown').replace(/_/g, ' ');
        if (!salesMap[channel]) {
            salesMap[channel] = { count: 0, children: {} };
        }
        salesMap[channel].count++;

        const primaryTx = order.order_transactions?.data.find(tx => tx.state === 'successful');
        if (primaryTx) {
            let subChannel: string | null = null;
            if (channel === 'online') {
                subChannel = primaryTx.payment_method || 'other';
            } else if (channel === 'box office') {
                subChannel = primaryTx.terminal_name || primaryTx.payment_method || 'other';
            }
            if (subChannel) {
                subChannel = subChannel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!salesMap[channel].children[subChannel]) {
                    salesMap[channel].children[subChannel] = { count: 0 };
                }
                salesMap[channel].children[subChannel].count++;
            }
        }
    });
    
    const salesByChannel: SalesChannelData[] = Object.entries(salesMap)
    .map(([channelName, data]) => {
        const childrenData: SalesChannelData[] = Object.entries(data.children)
            .map(([subChannelName, subData]) => ({
                name: subChannelName,
                count: subData.count
            }))
            .sort((a, b) => b.count - a.count);

        return {
            name: channelName.replace(/\b\w/g, l => l.toUpperCase()),
            count: data.count,
            children: childrenData.length > 0 ? childrenData : undefined
        };
    })
    .sort((a, b) => b.count - a.count);


    const locationData = allAttendees.reduce((acc, attendee) => {
        if (attendee.city) {
            acc.cities[attendee.city] = (acc.cities[attendee.city] || 0) + 1;
        }
        if (attendee.country_code) {
            acc.countries[attendee.country_code] = (acc.countries[attendee.country_code] || 0) + 1;
        }
        return acc;
    }, { cities: {} as Record<string, number>, countries: {} as Record<string, number> });

    const salesByCity = Object.entries(locationData.cities)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const salesByCountry = Object.entries(locationData.countries)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const salesVelocityMap: { [date: string]: number } = {};
    allOrders.forEach(order => {
        const date = order.created_at.split('T')[0];
        const ticketCount = order.order_lines.data.reduce((sum, line) => sum + line.quantity, 0);
        salesVelocityMap[date] = (salesVelocityMap[date] || 0) + ticketCount;
    });
    const salesVelocity = Object.entries(salesVelocityMap)
        .map(([date, tickets]) => ({ date, tickets }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const revenueBySource = allLedgerEntries
        .filter(entry => entry.entry_type === 'ORDER_REVENUE' && entry.source)
        .reduce((acc: { name: string; revenue: number }[], entry) => {
            const source = entry.source || 'direct';
            const existing = acc.find(r => r.name === source);
            if (existing) {
                existing.revenue += entry.amount;
            } else {
                acc.push({ name: source, revenue: entry.amount });
            }
            return acc;
        }, []);

    let grossRevenue = 0;
    let billettoFees = 0;
    let totalRefunded = 0;
    let totalChargebacks = 0;

    allLedgerEntries.forEach(entry => {
        if (entry.entry_type === 'ORDER_REVENUE') {
            grossRevenue += entry.amount;
        } else if (entry.entry_type.includes('FEE')) {
            billettoFees += entry.amount; // Fees are negative
        } else if (entry.entry_type === 'REFUND') {
            totalRefunded += entry.amount;
        } else if (entry.entry_type === 'CHARGEBACK') {
            totalChargebacks += entry.amount;
        }
    });
    const netPayout = grossRevenue + billettoFees + totalRefunded + totalChargebacks;
    
    const financialSummary = { grossRevenue, billettoFees, netPayout, totalRefunded, totalChargebacks };

    const totalTicketsSold = allAttendees.filter(a => ['sold', 'manually_generated', 'door_sale'].includes(a.state)).length;
    
    const newsletterOptInCount = allAttendees.filter(a => a.newsletter_permission).length;
    const newsletterOptInRate = totalTicketsSold > 0 ? (newsletterOptInCount / totalTicketsSold) * 100 : 0;

    const stats = {
        totalTicketsSold,
        totalRevenue: estimatedGrossRevenue,
        currency: event.currency,
        newsletterOptInRate,
    };

    return {
        event,
        ticketGroups: ticketGroupsWithCalculatedRevenue,
        stats,
        financialSummary,
        salesByChannel,
        salesByCity,
        salesByCountry,
        salesVelocity,
        revenueBySource,
        allOrders,
        allAttendees,
        allLedgerEntries,
        bookingQuestionsLoaded: false,
    };
};

export const useEvents = (apiClient: BillettoApiClient | null) => {
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [lastUpdatedEvents, setLastUpdatedEvents] = useState<Date | null>(null);
    const [eventFilter, setEventFilter] = useState('published');
    const [selectedItem, setSelectedItem] = useState<EventListItemType | null>(null);
    const [eventDetails, setEventDetails] = useState<{ [key: string]: EventDetails }>({});
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees' | 'bookingQuestions' | 'marketing'>('overview');
    const [attendeePage, setAttendeePage] = useState(1);
    const [filterTicketGroupId, setFilterTicketGroupId] = useState<string>('all');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const isFetchingDetails = useRef(false);
    const [loadingProgress, setLoadingProgress] = useState<{
        message?: string;
        orders?: number;
        attendees?: number;
        ledger?: number;
    } | null>(null);

    const fetchAndCacheEvents = useCallback(async () => {
        if (!apiClient) return;
        setLoadingEvents(true);
        setEventsError(null);
        try {
            const allEvents = await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient);
            setEvents(allEvents);
            await db.setEventsCache(allEvents);
            setLastUpdatedEvents(new Date());
        } catch (err) {
            if (err instanceof BillettoApiError) setEventsError(err.message);
            else setEventsError('An unknown error occurred while fetching events.');
        } finally {
            setLoadingEvents(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedEvents = async () => {
            setLoadingEvents(true);
            const { events: cachedEvents, lastUpdated } = await db.getEventsCache();
            if (cachedEvents) {
                setEvents(cachedEvents);
                if(lastUpdated) setLastUpdatedEvents(new Date(lastUpdated));
                setLoadingEvents(false);
            } else {
                fetchAndCacheEvents();
            }
        };
        if (apiClient) {
            loadCachedEvents();
        }
    }, [apiClient, fetchAndCacheEvents]);
    
    const eventListItems = useMemo<EventListItemType[]>(() => {
        const groups: { [key: string]: EventGroup } = {};
        const singleEvents: BillettoEvent[] = [];

        events.forEach(event => {
            if (event.parent && typeof event.parent === 'object' && event.parent.id) {
                const parentId = event.parent.id;
                if (!groups[parentId]) {
                    groups[parentId] = {
                        ...(event.parent as BillettoEvent),
                        id: parentId,
                        name: event.parent.name || 'Event Series',
                        isGroup: true,
                        children: [],
                        currency: event.currency, 
                    };
                }
                groups[parentId].children.push(event);
            } else {
                singleEvents.push(event);
            }
        });

        Object.values(groups).forEach(group => {
            group.children.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        });

        return [...Object.values(groups), ...singleEvents].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    }, [events]);

    const filteredEventListItems = useMemo(() => {
        if (eventFilter === 'all') return eventListItems;
        return eventListItems.filter(event => event.state === eventFilter);
    }, [eventListItems, eventFilter]);

    useEffect(() => {
        if (selectedItem) {
            setEventDetailView('overview');
            setAttendeePage(1);
            setFilterTicketGroupId('all');
        }
    }, [selectedItem]);

    const finalEventDetails = useMemo(() => {
        return selectedItem ? eventDetails[selectedItem.id] : null;
    }, [selectedItem, eventDetails]);

    const { items: sortedEventAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(finalEventDetails?.attendees || []);
    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData(finalEventDetails?.ticketGroups || []);
    
    // Attendee Filtering Logic
    const [filterQuestionId, setFilterQuestionId] = useState('');
    const [filterAnswerText, setFilterAnswerText] = useState('');

    const availableQuestions = useMemo<AvailableQuestion[]>(() => {
        if (!finalEventDetails?.allAttendees && !finalEventDetails?.allOrders) return [];
        const questions = new Map<string, string>();
        const processResponses = (responses: any) => {
            responses?.data?.forEach((r: any) => {
                if (r.question && typeof r.question === 'object' && r.question.id) {
                    if (!questions.has(r.question.id)) {
                        questions.set(r.question.id, r.question.name);
                    }
                } else if (typeof r.question === 'string' && !questions.has(r.question)) {
                    questions.set(r.question, r.question);
                }
            });
        };
        finalEventDetails?.allAttendees?.forEach(a => processResponses(a.booking_question_responses));
        finalEventDetails?.allOrders?.forEach(o => processResponses(o.booking_question_responses));

        return Array.from(questions, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [finalEventDetails?.allAttendees, finalEventDetails?.allOrders]);

    const filteredAttendees = useMemo(() => {
        if (!finalEventDetails?.allAttendees) return [];
        if (!filterQuestionId && !filterAnswerText) return finalEventDetails.allAttendees;

        const lowerCaseFilterText = filterAnswerText.toLowerCase();

        return finalEventDetails.allAttendees.filter(attendee => {
            return attendee.booking_question_responses?.data?.some(response => {
                const questionMatches = filterQuestionId ? (typeof response.question === 'object' ? response.question.id === filterQuestionId : response.question === filterQuestionId) : true;
                if (!questionMatches) return false;

                const answer = (response.answer || response.text || '').toLowerCase();
                return answer.includes(lowerCaseFilterText);
            });
        });
    }, [finalEventDetails?.allAttendees, filterQuestionId, filterAnswerText]);
    
    const paginatedAndSortedAttendees = useMemo(() => {
        const items = filteredAttendees;
        const start = (attendeePage - 1) * ATTENDEES_PER_PAGE;
        const end = start + ATTENDEES_PER_PAGE;
        return items.slice(start, end);
    }, [filteredAttendees, attendeePage]);

    const { items: sortedAndFilteredAttendees } = useSortableData(paginatedAndSortedAttendees, eventAttendeesSortConfig);

    useEffect(() => {
        if (finalEventDetails) {
            setEventDetails(prev => ({
                ...prev,
                [finalEventDetails.event.id]: {
                    ...finalEventDetails,
                    attendees: sortedAndFilteredAttendees
                }
            }));
        }
    }, [sortedAndFilteredAttendees, finalEventDetails?.event.id]);
    
    const triggerAnalysis = useCallback(async (force = false) => {
        if (!finalEventDetails || isFetchingDetails.current) return;
        const currentId = finalEventDetails.event.id;

        if (!force) {
            const cachedAnalysis = await db.getBookingQuestionsAnalysisCache(currentId);
            if (cachedAnalysis) {
                setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: cachedAnalysis, bookingQuestionsLoaded: true }
                }));
                return;
            }
        }
        
        setLoadingAnalysis(true);
        try {
            const analysis = await runBookingQuestionsAnalysis({
                allOrders: finalEventDetails.allOrders,
                allAttendees: finalEventDetails.allAttendees,
                ticketGroups: finalEventDetails.ticketGroups,
                filterTicketGroupId
            });
            if (analysis) {
                 await db.setBookingQuestionsAnalysisCache(currentId, analysis);
                 setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true }
                }));
            } else {
                 setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: [], bookingQuestionsLoaded: true }
                }));
            }
        } catch (error) {
            console.error("Error running analysis:", error);
        } finally {
            setLoadingAnalysis(false);
        }
    }, [finalEventDetails, filterTicketGroupId]);
    
    useEffect(() => {
        if (eventDetailView === 'bookingQuestions' && finalEventDetails && !finalEventDetails.bookingQuestionsLoaded) {
            triggerAnalysis();
        }
    }, [eventDetailView, finalEventDetails, triggerAnalysis]);
    
    useEffect(() => {
        if (finalEventDetails) {
            triggerAnalysis(); 
        }
    }, [filterTicketGroupId]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!selectedItem || !apiClient || isFetchingDetails.current) return;

            isFetchingDetails.current = true;
            setLoadingDetails(true);
            setDetailsError(null);
            setLoadingProgress({ message: 'Checking cache...' });

            const cachedDetails = await db.getEventDetailsCache(selectedItem.id);
            if (cachedDetails) {
                setEventDetails(prev => ({...prev, [selectedItem.id]: cachedDetails }));
                setLoadingDetails(false);
                isFetchingDetails.current = false;
                setLoadingProgress(null);
                return;
            }
            
            try {
                const isGroup = 'isGroup' in selectedItem;
                const eventIds = isGroup ? selectedItem.children.map(c => c.id) : [selectedItem.id];

                const [allOrders, allAttendees, allLedgerEntries, ticketGroupsData] = await Promise.all([
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<Order>(`/orders?event=${id}&expand=order_lines,order_transactions`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, orders: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<Attendee>(`/events/${id}/attendees?expand=booking_question_responses`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, attendees: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<LedgerEntry>(`/ledger_entries?event=${id}`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, ledger: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<TicketGroup>(`/ticket_types?event=${id}`, apiClient, 5))).then(res => res.flat())
                ]);
                
                let eventForProcessing: BillettoEvent = selectedItem;
                if (!isGroup) {
                    try {
                        const fullEvent = await apiClient.getEvent(selectedItem.id, ['venue', 'location', 'organization', 'editorial']);
                        eventForProcessing = fullEvent;
                    } catch (e) {
                        console.warn(`Could not fetch full event details for event ${selectedItem.id}`, e);
                    }
                }

                setLoadingProgress({ message: 'Processing data...' });
                const baseDetails = processAndBuildEventDetails(eventForProcessing, allOrders, allAttendees, allLedgerEntries, ticketGroupsData);
                
                const fullDetails: EventDetails = {
                    ...baseDetails,
                    attendees: [], 
                };
                
                await db.setEventDetailsCache(fullDetails);
                setEventDetails(prev => ({ ...prev, [selectedItem.id]: fullDetails }));

            } catch (err) {
                 if (err instanceof BillettoApiError) setDetailsError(err.message);
                 else setDetailsError('An unknown error occurred while fetching event details.');
            } finally {
                setLoadingDetails(false);
                isFetchingDetails.current = false;
                setLoadingProgress(null);
            }
        };

        fetchDetails();
    }, [selectedItem, apiClient]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem,
        finalEventDetails: useMemo(() => {
            if (!finalEventDetails) return null;
            return {
                ...finalEventDetails,
                attendees: sortedEventAttendees,
                ticketGroups: sortedTicketGroups
            }
        }, [finalEventDetails, sortedEventAttendees, sortedTicketGroups]),
        loadingDetails, detailsError,
        eventDetailView, setEventDetailView, attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort: requestTicketGroupsSort, ticketGroupsSortConfig: ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
        availableQuestions,
        filterQuestionId, setFilterQuestionId,
        filterAnswerText, setFilterAnswerText,
        filteredAttendeesCount: filteredAttendees.length,
    };
};
