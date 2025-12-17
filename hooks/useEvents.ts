
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionsAnalysis, Order, LedgerEntry, EventListItemType, Campaign } from '../types';
import { BillettoApiClient } from '../services/billettoService';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { useSortableData } from './useSortableData';
import { runBookingQuestionsAnalysis } from '../utils/analysis';
import { AddToastFn } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BillettoEventSchema, OrderSchema, AttendeeSchema, LedgerEntrySchema, TicketGroupSchema, CampaignSchema } from '../schemas';
import { processAndBuildEventDetails } from '../utils/eventProcessing';

const ATTENDEES_PER_PAGE = 100;

export const useEvents = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const queryClient = useQueryClient();
    const [eventFilter, setEventFilter] = useState('published');
    const [selectedItem, setSelectedItem] = useState<EventListItemType | null>(null);
    const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees' | 'bookingQuestions' | 'marketing' | 'checkin'>('overview');
    const [attendeePage, setAttendeePage] = useState(1);
    const [filterTicketGroupId, setFilterTicketGroupId] = useState<string>('all');
    const [filterQuestionId, setFilterQuestionId] = useState<string>('');
    const [filterAnswerText, setFilterAnswerText] = useState<string>('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    
    // Track progress locally for the loading spinner
    const [loadingProgress, setLoadingProgress] = useState<{
        message?: string;
        orders?: number;
        attendees?: number;
        ledger?: number;
    } | null>(null);

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    // Query for Events List
    const { 
        data: events = [], 
        isPending: loadingEvents, 
        error: eventsErrorObject,
        dataUpdatedAt: lastUpdatedEventsTimestamp,
        refetch: fetchAndCacheEvents
    } = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            if (!apiClient) return [];
            return await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient, 5, undefined, undefined, onRateLimit, BillettoEventSchema);
        },
        enabled: !!apiClient,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const eventsError = eventsErrorObject instanceof Error ? eventsErrorObject.message : null;
    const lastUpdatedEvents = lastUpdatedEventsTimestamp ? new Date(lastUpdatedEventsTimestamp) : null;

    const restorationAttempted = useRef(false);

    useEffect(() => {
        const storedItemId = sessionStorage.getItem('selectedEventId');
        if (storedItemId && events.length > 0 && !restorationAttempted.current) {
            const foundItem = events.find(e => e.id === storedItemId);
            if (foundItem) {
                setSelectedItem(foundItem);
            }
            restorationAttempted.current = true;
        }
    }, [events]);

    useEffect(() => {
        if (selectedItem) {
            sessionStorage.setItem('selectedEventId', selectedItem.id);
            setEventDetailView('overview');
            setAttendeePage(1);
            setFilterTicketGroupId('all');
        } else {
            sessionStorage.removeItem('selectedEventId');
        }
    }, [selectedItem]);

    // Query for Selected Event Details
    const selectedEventId = selectedItem?.id;
    const {
        data: finalEventDetails,
        isPending: loadingDetails,
        isFetching: isRefreshingDetails,
        error: detailsErrorObject,
        refetch: refetchEventDetails
    } = useQuery({
        queryKey: ['event', selectedEventId, 'details'],
        queryFn: async () => {
            if (!apiClient || !selectedEventId) throw new Error("No client or event ID");
            
            setLoadingProgress(null);
            
            // Helper to update progress
            const fetchAndUpdateProgress = async <T extends {id: string}>(
                key: 'orders' | 'attendees' | 'ledger',
                endpoint: string,
                schema: any
            ): Promise<T[]> => {
                const onProgress = (p: number) => {
                    setLoadingProgress(prev => ({ ...prev, [key]: p }));
                };
                return fetchAllPaginatedData<T>(endpoint, apiClient, 5, onProgress, undefined, onRateLimit, schema);
            };

            // Retrieve basic event object from cache or fetch if missing
            const event = events.find(e => e.id === selectedEventId) || await apiClient.getEvent(selectedEventId);

            const [allOrders, allAttendees, allLedgerEntries, ticketGroupsData, campaignsData] = await Promise.all([
                fetchAndUpdateProgress<Order>('orders', `/orders?event=${selectedEventId}&expand=order_lines,order_transactions,order_transactions.data.refunds`, OrderSchema),
                fetchAndUpdateProgress<Attendee>('attendees', `/events/${selectedEventId}/attendees?expand=booking_question_responses,scannings,ticket_buyer,space,membership,subscription,ticket_type`, AttendeeSchema),
                fetchAndUpdateProgress<LedgerEntry>('ledger', `/ledger_entries?event=${selectedEventId}`, LedgerEntrySchema),
                fetchAllPaginatedData<TicketGroup>(`/ticket_types?event=${selectedEventId}`, apiClient, 5, undefined, undefined, onRateLimit, TicketGroupSchema),
                fetchAllPaginatedData<Campaign>(`/campaigns?event=${selectedEventId}`, apiClient, 5, undefined, undefined, onRateLimit, CampaignSchema),
            ]);

            setLoadingProgress({ message: 'Analyzing data...' });

            const activeCampaigns = campaignsData
                .filter(c => c.state === 'active' || c.state === 'running')
                .flatMap(c => {
                    const timeCondition = c.conditions.data.find(cond => cond.type === 'time');
                    if (timeCondition && timeCondition.data.start && timeCondition.data.end) {
                        return [{
                            name: c.name,
                            start: timeCondition.data.start,
                            end: timeCondition.data.end,
                        }];
                    }
                    return [];
                });

            const processedDetails = processAndBuildEventDetails(event, allOrders, allAttendees, allLedgerEntries, ticketGroupsData, activeCampaigns);
            
            const fullDetails: EventDetails = {
                ...processedDetails,
                attendees: [],
                bookingQuestionsLoaded: false,
            };

            // Run initial analysis
            const analysis = await runBookingQuestionsAnalysis({ allOrders, allAttendees, ticketGroups: ticketGroupsData, filterTicketGroupId: 'all' });
            if (analysis) {
                 return { ...fullDetails, bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true };
            }
            return fullDetails;
        },
        enabled: !!apiClient && !!selectedEventId,
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    const detailsError = detailsErrorObject instanceof Error ? detailsErrorObject.message : null;

    const prefetchEventDetails = useCallback((item: EventListItemType) => {
        if (!item || !queryClient) return;
        queryClient.prefetchQuery({
            queryKey: ['event', item.id, 'details'],
            queryFn: async () => {
                 // We don't implement prefetch logic here because the main query function is complex
                 // and duplication would be error-prone. The user's intent to view is captured
                 // by the click, and caching handles the rest.
                 return null; 
            },
            staleTime: 1000 * 60 * 5, // 5 mins
        });
    }, [queryClient]);

    const triggerAnalysis = useCallback(async (force: boolean = true) => {
        if (!finalEventDetails) return;
        setLoadingAnalysis(true);
        try {
            if(finalEventDetails.allOrders && finalEventDetails.allAttendees) {
                const analysis = await runBookingQuestionsAnalysis({
                    allOrders: finalEventDetails.allOrders,
                    allAttendees: finalEventDetails.allAttendees,
                    ticketGroups: finalEventDetails.ticketGroups,
                    filterTicketGroupId: filterTicketGroupId
                });

                if (analysis) {
                    // Manually update the query cache with the new analysis
                    queryClient.setQueryData(['event', selectedEventId, 'details'], (oldData: EventDetails | undefined) => {
                        if (!oldData) return oldData;
                        return { ...oldData, bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true };
                    });
                }
            } else {
                 addToast('Detailed data not loaded yet. Please wait.', 'info');
            }
        } catch (error: any) {
            addToast(`Analysis failed: ${error.message}`, 'error');
        } finally {
            setLoadingAnalysis(false);
        }
    }, [finalEventDetails, filterTicketGroupId, addToast, queryClient, selectedEventId]);


    const eventList = useMemo(() => {
        const eventMap = new Map<string, BillettoEvent>();
        const childrenMap = new Map<string, BillettoEvent[]>();

        events.forEach(event => {
            eventMap.set(event.id, event);
            if (event.parent && typeof event.parent === 'string') {
                if (!childrenMap.has(event.parent)) {
                    childrenMap.set(event.parent, []);
                }
                childrenMap.get(event.parent)!.push(event);
            }
        });

        const listItems: EventListItemType[] = [];
        const processedIds = new Set<string>();

        events.forEach(event => {
            if (processedIds.has(event.id)) return;

            const children = (childrenMap.get(event.id) || []).sort((a, b) => new Date(b.starts_at || 0).getTime() - new Date(a.starts_at || 0).getTime());
            if (children.length > 0) {
                listItems.push({ ...event, isGroup: true, children });
                children.forEach(c => processedIds.add(c.id));
            } else if (!event.parent) {
                listItems.push(event);
            }
            processedIds.add(event.id);
        });

        return listItems;

    }, [events]);

     const filteredEventListItems = useMemo(() => {
        if (eventFilter === 'all') return eventList;
        return eventList.filter(item => {
            if ('isGroup' in item) {
                return item.children.some(child => child.state === eventFilter);
            }
            return item.state === eventFilter;
        });
    }, [eventList, eventFilter]);
    
    const filteredAttendees = useMemo(() => {
        if (!finalEventDetails || !finalEventDetails.allAttendees) return [];
        let attendees = finalEventDetails.allAttendees;

        if (filterQuestionId) {
             attendees = attendees.filter(a => 
                a.booking_question_responses?.data.some(r => {
                    const qId = typeof r.question === 'string' ? r.question : r.question.id;
                    return qId === filterQuestionId;
                })
            );
        }

        if (filterAnswerText) {
            const lowerCaseFilter = filterAnswerText.toLowerCase();
            attendees = attendees.filter(a => 
                a.booking_question_responses?.data.some(r => {
                    const answer = r.answer || r.text || '';
                    const qId = typeof r.question === 'string' ? r.question : r.question.id;
                    const questionMatches = filterQuestionId ? qId === filterQuestionId : true;
                    return questionMatches && answer.toLowerCase().includes(lowerCaseFilter);
                })
            );
        }

        return attendees;
    }, [finalEventDetails, filterQuestionId, filterAnswerText]);
    
    const filteredAttendeesCount = filteredAttendees.length;

    const { items: sortedAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(filteredAttendees, { key: 'created_at', direction: 'descending' });
    
    const paginatedAttendees = useMemo(() => {
        const start = (attendeePage - 1) * ATTENDEES_PER_PAGE;
        return sortedAttendees.slice(start, start + ATTENDEES_PER_PAGE);
    }, [sortedAttendees, attendeePage]);

    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData<TicketGroup>(finalEventDetails?.ticketGroups || [], { key: 'sold_count', direction: 'descending' });
    
    const availableQuestions = useMemo(() => {
        if (!finalEventDetails?.bookingQuestionsAnalysis) return [];
        return finalEventDetails.bookingQuestionsAnalysis.map(q => ({ id: q.id, name: q.name }));
    }, [finalEventDetails?.bookingQuestionsAnalysis]);
    

    useEffect(() => {
        setAttendeePage(1);
    }, [filterQuestionId, filterAnswerText]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        eventList, filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem,
        finalEventDetails: finalEventDetails ? { ...finalEventDetails, attendees: paginatedAttendees, ticketGroups: sortedTicketGroups } : null,
        loadingDetails, isRefreshingDetails, detailsError, 
        fetchEventDetails: (id: string, force?: boolean) => { if(force) refetchEventDetails(); }, 
        prefetchEventDetails,
        eventDetailView, setEventDetailView,
        attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort, ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
        availableQuestions,
        filterQuestionId,
        setFilterQuestionId,
        filterAnswerText,
        setFilterAnswerText,
        filteredAttendees,
        filteredAttendeesCount
    };
};
