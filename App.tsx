

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BillettoEvent, Attendee, Order, LedgerEntry, EventDetails, Campaign, TicketGroup, TargetGroup, TargetGroupMember, SortConfig, SortDirection, ListResponse } from './types';
import { BillettoApiClient, BillettoApiError } from './services/billettoService';
import * as db from './services/dbService';
import Dashboard from './components/Dashboard';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon, CampaignIcon, TargetGroupIcon, UserIcon } from './components/icons';
import EventListItem from './components/EventListItem';
import OrdersTable from './components/OrdersTable';
import OrderDetailsModal from './components/OrderDetailsModal';
import Pagination from './components/Pagination';
import LedgerTable from './components/LedgerTable';
import CampaignsTable from './components/CampaignsTable';
import RefreshBar from './components/RefreshBar';
import TargetGroupsTable from './components/TargetGroupsTable';
import TargetGroupMembersTable from './components/TargetGroupMembersTable';
import AllAttendeesTable from './components/AllAttendeesTable';
import AttendeeDetailsModal from './components/AttendeeDetailsModal';

type View = 'dashboard' | 'orders' | 'ledger' | 'campaigns' | 'targetGroups' | 'attendees';
const ORDERS_PER_PAGE = 20;
const ATTENDEES_PER_PAGE = 50; // For event-specific attendees
const ALL_ATTENDEES_PER_PAGE = 25; // For account-wide attendees
const LEDGER_ENTRIES_PER_PAGE = 25;
const CAMPAIGNS_PER_PAGE = 20;
const TARGET_GROUPS_PER_PAGE = 15;
const MEMBERS_PER_PAGE = 50;


// Reusable hook for sorting table data
const useSortableData = <T extends object>(items: T[], initialConfig: SortConfig<T> | null = null) => {
    const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialConfig);

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const resolvePath = (object: any, path: string) => path.split('.').reduce((o, p) => (o && o[p] !== undefined && o[p] !== null ? o[p] : undefined), object);

                const aValue = resolvePath(a, sortConfig.key as string);
                const bValue = resolvePath(b, sortConfig.key as string);

                if (aValue === undefined) return 1;
                if (bValue === undefined) return -1;
                
                const valA = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
                const valB = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: keyof T | string) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return { items: sortedItems, requestSort, sortConfig };
};

// Helper to fetch all pages from a paginated API endpoint
const fetchAllPaginatedData = async <T,>(fetchFunction: (page: number) => Promise<ListResponse<T>>): Promise<T[]> => {
    let allItems: T[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetchFunction(currentPage);
            allItems = allItems.concat(response.data);
            hasMore = response.has_more;
            currentPage++;
        } catch (error) {
            console.error(`Error fetching page ${currentPage}:`, error);
            hasMore = false; // Stop pagination on error
        }
    }
    return allItems;
};


const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('billettoApiKey') || '');
  const [showSettings, setShowSettings] = useState<boolean>(!apiKey);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Dashboard State
  const [events, setEvents] = useState<BillettoEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [attendeePage, setAttendeePage] = useState(1);
  const [lastUpdatedEvents, setLastUpdatedEvents] = useState<Date | null>(null);
  const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees'>('overview');
  const [eventFilter, setEventFilter] = useState<string>(
    () => localStorage.getItem('billettoEventFilter') || 'published'
  );

  // Order Management State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersPagination, setOrdersPagination] = useState({ currentPage: 1, total: 0 });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState<boolean>(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [lastUpdatedOrders, setLastUpdatedOrders] = useState<Date | null>(null);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerPagination, setLedgerPagination] = useState({ currentPage: 1, total: 0 });
  const [lastUpdatedLedger, setLastUpdatedLedger] = useState<Date | null>(null);
  
  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaignsPagination, setCampaignsPagination] = useState({ currentPage: 1, total: 0 });
  const [lastUpdatedCampaigns, setLastUpdatedCampaigns] = useState<Date | null>(null);

  // Target Groups State
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [loadingTargetGroups, setLoadingTargetGroups] = useState<boolean>(false);
  const [targetGroupsError, setTargetGroupsError] = useState<string | null>(null);
  const [targetGroupsPagination, setTargetGroupsPagination] = useState({ currentPage: 1, total: 0 });
  const [lastUpdatedTargetGroups, setLastUpdatedTargetGroups] = useState<Date | null>(null);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string | null>(null);
  
  // Target Group Members State
  const [targetGroupMembers, setTargetGroupMembers] = useState<TargetGroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersPagination, setMembersPagination] = useState({ currentPage: 1, total: 0 });

  // General Attendee State
  const [allAttendees, setAllAttendees] = useState<Attendee[]>([]);
  const [loadingAllAttendees, setLoadingAllAttendees] = useState<boolean>(false);
  const [allAttendeesError, setAllAttendeesError] = useState<string | null>(null);
  const [allAttendeesPagination, setAllAttendeesPagination] = useState({ currentPage: 1, total: 0 });
  const [lastUpdatedAllAttendees, setLastUpdatedAllAttendees] = useState<Date | null>(null);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState<Attendee | null>(null);
  const [loadingAttendeeDetails, setLoadingAttendeeDetails] = useState<boolean>(false);
  const [attendeeDetailsError, setAttendeeDetailsError] = useState<string | null>(null);

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey) : null, [apiKey]);

  // --- Data Sorting ---
  const { items: sortedOrders, requestSort: requestOrderSort, sortConfig: orderSortConfig } = useSortableData(orders, { key: 'created_at', direction: 'descending' });
  const { items: sortedLedger, requestSort: requestLedgerSort, sortConfig: ledgerSortConfig } = useSortableData(ledgerEntries, { key: 'created_at', direction: 'descending' });
  const { items: sortedCampaigns, requestSort: requestCampaignSort, sortConfig: campaignSortConfig } = useSortableData(campaigns, { key: 'name', direction: 'ascending' });
  const { items: sortedTargetGroups, requestSort: requestTargetGroupSort, sortConfig: targetGroupSortConfig } = useSortableData(targetGroups, { key: 'name', direction: 'ascending' });
  const { items: sortedTargetGroupMembers, requestSort: requestMemberSort, sortConfig: memberSortConfig } = useSortableData(targetGroupMembers, { key: 'name', direction: 'ascending' });
  const { items: sortedAllAttendees, requestSort: requestAllAttendeeSort, sortConfig: allAttendeeSortConfig } = useSortableData(allAttendees, { key: 'created_at', direction: 'descending' });
  
  const { items: sortedEventAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(eventDetails?.attendees || [], { key: 'name', direction: 'ascending' });
  const ticketGroupsWithRevenue = useMemo(() => (eventDetails?.ticketGroups || []).map(tg => ({ ...tg, revenue: tg.price * tg.sold_count })), [eventDetails?.ticketGroups]);
  const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData<TicketGroup>(ticketGroupsWithRevenue, { key: 'name', direction: 'ascending' });

  // Persist event filter choice
  useEffect(() => {
    localStorage.setItem('billettoEventFilter', eventFilter);
  }, [eventFilter]);

  // Memoize filtered events
  const filteredEvents = useMemo(() => {
    if (!eventFilter || eventFilter === 'all') {
      return events;
    }
    return events.filter(event => event.state === eventFilter);
  }, [events, eventFilter]);

  // --- Data Fetching and Caching ---
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

  const fetchAndCacheOrders = useCallback(async (page = 1) => {
    if (!apiClient) return;
    setLoadingOrders(true);
    setOrdersError(null);
    try {
        const response = await apiClient.getOrders(page, ORDERS_PER_PAGE, ['data.event']);
        setOrders(response.data);
        setOrdersPagination({ currentPage: page, total: response.total });
        await db.setOrdersCache(page, response);
        const { lastUpdated } = await db.getOrdersCache(page);
        if (lastUpdated) setLastUpdatedOrders(new Date(lastUpdated));
    } catch (err) {
        if (err instanceof BillettoApiError) setOrdersError(err.message);
        else setOrdersError('An unknown error occurred while fetching orders.');
    } finally {
        setLoadingOrders(false);
    }
  }, [apiClient]);

  const fetchAndCacheLedger = useCallback(async (page = 1) => {
    if (!apiClient) return;
    setLoadingLedger(true);
    setLedgerError(null);
    try {
        const response = await apiClient.getLedgerEntries(page, LEDGER_ENTRIES_PER_PAGE, ['event']);
        setLedgerEntries(response.data);
        setLedgerPagination({ currentPage: page, total: response.total });
        await db.setLedgerCache(page, response);
        const { lastUpdated } = await db.getLedgerCache(page);
        if (lastUpdated) setLastUpdatedLedger(new Date(lastUpdated));
    } catch (err) {
        if (err instanceof BillettoApiError) setLedgerError(err.message);
        else setLedgerError('An unknown error occurred while fetching financial records.');
    } finally {
        setLoadingLedger(false);
    }
  }, [apiClient]);
  
  const fetchAndCacheCampaigns = useCallback(async (page = 1) => {
    if (!apiClient) return;
    setLoadingCampaigns(true);
    setCampaignsError(null);
    try {
        const response = await apiClient.getCampaigns(page, CAMPAIGNS_PER_PAGE, ['event']);
        setCampaigns(response.data);
        setCampaignsPagination({ currentPage: page, total: response.total });
        await db.setCampaignsCache(page, response);
        const { lastUpdated } = await db.getCampaignsCache(page);
        if (lastUpdated) setLastUpdatedCampaigns(new Date(lastUpdated));
    } catch (err) {
        if (err instanceof BillettoApiError) setCampaignsError(err.message);
        else setCampaignsError('An unknown error occurred while fetching campaigns.');
    } finally {
        setLoadingCampaigns(false);
    }
  }, [apiClient]);

  const fetchAndCacheTargetGroups = useCallback(async (page = 1) => {
    if (!apiClient) return;
    setLoadingTargetGroups(true);
    setTargetGroupsError(null);
    try {
        const response = await apiClient.getTargetGroups(page, TARGET_GROUPS_PER_PAGE);
        setTargetGroups(response.data);
        setTargetGroupsPagination({ currentPage: page, total: response.total });
        await db.setTargetGroupsCache(page, response);
        const { lastUpdated } = await db.getTargetGroupsCache(page);
        if (lastUpdated) setLastUpdatedTargetGroups(new Date(lastUpdated));
    } catch (err) {
        if (err instanceof BillettoApiError) setTargetGroupsError(err.message);
        else setTargetGroupsError('An unknown error occurred while fetching target groups.');
    } finally {
        setLoadingTargetGroups(false);
    }
  }, [apiClient]);

  const fetchAndCacheTargetGroupMembers = useCallback(async (groupId: string, page = 1) => {
    if (!apiClient) return;
    setLoadingMembers(true);
    setMembersError(null);

    const cached = await db.getTargetGroupMembersCache(groupId, page);
    if (cached) {
      setTargetGroupMembers(cached.data);
      setMembersPagination({ currentPage: page, total: cached.total });
      setLoadingMembers(false);
      return;
    }
    
    try {
        const response = await apiClient.getTargetGroupMembers(groupId, page, MEMBERS_PER_PAGE);
        setTargetGroupMembers(response.data);
        setMembersPagination({ currentPage: page, total: response.total });
        await db.setTargetGroupMembersCache(groupId, page, response);
    } catch (err) {
        if (err instanceof BillettoApiError) setMembersError(err.message);
        else setMembersError('An unknown error occurred while fetching group members.');
    } finally {
        setLoadingMembers(false);
    }
  }, [apiClient]);

  const fetchAndCacheAllAttendees = useCallback(async (page = 1) => {
    if (!apiClient) return;
    setLoadingAllAttendees(true);
    setAllAttendeesError(null);
    try {
        const response = await apiClient.getAttendees(page, ALL_ATTENDEES_PER_PAGE, ['event']);
        setAllAttendees(response.data);
        setAllAttendeesPagination({ currentPage: page, total: response.total });
        await db.setAttendeesCache(page, response);
        const { lastUpdated } = await db.getAttendeesCache(page);
        if (lastUpdated) setLastUpdatedAllAttendees(new Date(lastUpdated));
    } catch (err) {
        if (err instanceof BillettoApiError) setAllAttendeesError(err.message);
        else setAllAttendeesError('An unknown error occurred while fetching attendees.');
    } finally {
        setLoadingAllAttendees(false);
    }
  }, [apiClient]);

  // --- Initial Data Loading from Cache ---
  const loadCachedData = useCallback(async () => {
    if (!apiKey) return;
    
    // Events
    const { events: cachedEvents, lastUpdated: luEvents } = await db.getEventsCache();
    if (cachedEvents && cachedEvents.length > 0) {
        setEvents(cachedEvents);
        if (luEvents) setLastUpdatedEvents(new Date(luEvents));
    } else {
        fetchAndCacheEvents();
    }
    
    // Orders
    const { ordersData: cachedOrders, lastUpdated: luOrders } = await db.getOrdersCache(1);
    if (cachedOrders) {
        setOrders(cachedOrders.data);
        setOrdersPagination({ currentPage: 1, total: cachedOrders.total });
        if (luOrders) setLastUpdatedOrders(new Date(luOrders));
    } else {
        fetchAndCacheOrders(1);
    }
    
    // Ledger
    const { ledgerData: cachedLedger, lastUpdated: luLedger } = await db.getLedgerCache(1);
    if (cachedLedger) {
        setLedgerEntries(cachedLedger.data);
        setLedgerPagination({ currentPage: 1, total: cachedLedger.total });
        if(luLedger) setLastUpdatedLedger(new Date(luLedger));
    } else {
        fetchAndCacheLedger(1);
    }
    
    // Campaigns
    const { campaignsData: cachedCampaigns, lastUpdated: luCampaigns } = await db.getCampaignsCache(1);
    if (cachedCampaigns) {
        setCampaigns(cachedCampaigns.data);
        setCampaignsPagination({ currentPage: 1, total: cachedCampaigns.total });
        if (luCampaigns) setLastUpdatedCampaigns(new Date(luCampaigns));
    } else {
        fetchAndCacheCampaigns(1);
    }

    // Target Groups
    const { groupsData: cachedGroups, lastUpdated: luGroups } = await db.getTargetGroupsCache(1);
    if (cachedGroups) {
        setTargetGroups(cachedGroups.data);
        setTargetGroupsPagination({ currentPage: 1, total: cachedGroups.total });
        if (luGroups) setLastUpdatedTargetGroups(new Date(luGroups));
    } else {
        fetchAndCacheTargetGroups(1);
    }

    // All Attendees
    const { attendeesData: cachedAttendees, lastUpdated: luAttendees } = await db.getAttendeesCache(1);
    if(cachedAttendees) {
        setAllAttendees(cachedAttendees.data);
        setAllAttendeesPagination({ currentPage: 1, total: cachedAttendees.total });
        if(luAttendees) setLastUpdatedAllAttendees(new Date(luAttendees));
    } else {
        fetchAndCacheAllAttendees(1);
    }

  }, [apiKey, fetchAndCacheEvents, fetchAndCacheOrders, fetchAndCacheLedger, fetchAndCacheCampaigns, fetchAndCacheTargetGroups, fetchAndCacheAllAttendees]);

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);
  
  useEffect(() => {
    setAttendeePage(1);
    setEventDetailView('overview');
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedTargetGroupId) {
        setMembersPagination({ currentPage: 1, total: 0 }); // Reset pagination
        fetchAndCacheTargetGroupMembers(selectedTargetGroupId, 1);
    } else {
        setTargetGroupMembers([]);
    }
  }, [selectedTargetGroupId, fetchAndCacheTargetGroupMembers]);

  // Fetch Event Details (with caching and combined data)
  useEffect(() => {
    const fetchEventData = async () => {
        if (!selectedEventId || !apiClient) return;

        // For attendee pagination, just fetch the new page of attendees.
        if (attendeePage > 1) {
            try {
                // Ideally show a mini-loader over the table
                const attendeesResponse = await apiClient.getEventAttendees(selectedEventId, attendeePage, ATTENDEES_PER_PAGE);
                setEventDetails(prev => prev ? { ...prev, attendees: attendeesResponse.data } : null);
            } catch(err) {
                 if (err instanceof BillettoApiError) setDetailsError(err.message);
                 else setDetailsError('An unknown error occurred while fetching attendees.');
            }
            return;
        }

        // For first load (attendeePage is 1), fetch everything.
        setLoadingDetails(true);
        setDetailsError(null);
        
        const cachedDetails = await db.getEventDetailsCache(selectedEventId);
        if (cachedDetails && cachedDetails.financialSummary) { // Check for new combined data
            setEventDetails(cachedDetails);
            setLoadingDetails(false);
            return;
        }

        try {
            // Fetch primary data
            const [event, attendeesResponse, ticketGroupsResponse] = await Promise.all([
                apiClient.getEvent(selectedEventId),
                apiClient.getEventAttendees(selectedEventId, 1, ATTENDEES_PER_PAGE),
                apiClient.getEventTicketGroups(selectedEventId)
            ]);

            // Fetch secondary data for combined insights
            const allOrders = await fetchAllPaginatedData(page => apiClient.getEventOrders(selectedEventId, page, 100));
            const allLedgerEntries = await fetchAllPaginatedData(page => apiClient.getEventLedgerEntries(selectedEventId, page, 100));
            
            // --- Process Data for Insights ---
            const grossRevenue = ticketGroupsResponse.data.reduce((sum, tg) => sum + (tg.price * tg.sold_count), 0);
            const billettoFees = allLedgerEntries
                .filter(entry => entry.type === 'fee' || entry.type === 'charge')
                .reduce((sum, entry) => sum + entry.amount, 0);
            const netPayout = grossRevenue + billettoFees; // fees are negative

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
                ticketGroups: ticketGroupsResponse.data,
                stats: { totalTicketsSold: attendeesResponse.total, totalRevenue: grossRevenue / 100, currency: event.currency },
                financialSummary: { grossRevenue: grossRevenue, billettoFees: Math.abs(billettoFees), netPayout: netPayout },
                salesByChannel: Object.values(salesByChannel),
                salesVelocity: Object.values(salesVelocity).sort((a,b) => a.date.localeCompare(b.date)),
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
  
  // Fetch Order Details (with caching)
  useEffect(() => {
    const fetchOrderDetails = async () => {
        if (!selectedOrderId || !apiClient) return;
        setLoadingOrderDetails(true);
        setOrderDetailsError(null);
        const cachedOrder = await db.getOrderDetailsCache(selectedOrderId);
        if (cachedOrder) {
            setOrderDetails(cachedOrder);
            setLoadingOrderDetails(false);
            return;
        }
        try {
            const order = await apiClient.getOrder(selectedOrderId, ['event', 'order_lines']);
            setOrderDetails(order);
            await db.setOrderDetailsCache(order);
        } catch (err) {
            if (err instanceof BillettoApiError) setOrderDetailsError(err.message);
            else setOrderDetailsError('An unknown error occurred fetching order details.');
        } finally {
            setLoadingOrderDetails(false);
        }
    };
    fetchOrderDetails();
  }, [selectedOrderId, apiClient]);
  
    // Fetch Attendee Details (with caching)
    useEffect(() => {
        const fetchAttendeeDetails = async () => {
            if (!selectedAttendeeId || !apiClient) return;
            setLoadingAttendeeDetails(true);
            setAttendeeDetailsError(null);
            const cachedAttendee = await db.getAttendeeDetailsCache(selectedAttendeeId);
            if (cachedAttendee) {
                setAttendeeDetails(cachedAttendee);
                setLoadingAttendeeDetails(false);
                return;
            }
            try {
                const attendee = await apiClient.getAttendee(selectedAttendeeId, ['event']);
                setAttendeeDetails(attendee);
                await db.setAttendeeDetailsCache(attendee);
            } catch (err) {
                if (err instanceof BillettoApiError) setAttendeeDetailsError(err.message);
                else setAttendeeDetailsError('An unknown error occurred fetching attendee details.');
            } finally {
                setLoadingAttendeeDetails(false);
            }
        };
        fetchAttendeeDetails();
    }, [selectedAttendeeId, apiClient]);


  const handleSaveSettings = async (newApiKey: string) => {
    localStorage.setItem('billettoApiKey', newApiKey);
    setApiKey(newApiKey);
    setShowSettings(false);
    await db.clearAllCache();
    // Reset all state
    setEvents([]); setLastUpdatedEvents(null); setSelectedEventId(null); setEventDetails(null);
    setOrders([]); setLastUpdatedOrders(null); setSelectedOrderId(null); setOrderDetails(null);
    setLedgerEntries([]); setLastUpdatedLedger(null); setLedgerPagination({ currentPage: 1, total: 0 });
    setCampaigns([]); setLastUpdatedCampaigns(null); setCampaignsPagination({ currentPage: 1, total: 0 });
    setTargetGroups([]); setLastUpdatedTargetGroups(null); setSelectedTargetGroupId(null); setTargetGroupMembers([]);
    setTargetGroupsPagination({ currentPage: 1, total: 0 }); setMembersPagination({ currentPage: 1, total: 0 });
    setAllAttendees([]); setLastUpdatedAllAttendees(null); setSelectedAttendeeId(null); setAttendeeDetails(null);
    setAllAttendeesPagination({ currentPage: 1, total: 0});
    setCurrentView('dashboard');
    await loadCachedData();
  };
  
  const handleOrderPageChange = async (page: number) => {
    setOrdersPagination(prev => ({ ...prev, currentPage: page }));
    const { ordersData } = await db.getOrdersCache(page);
    if(ordersData){ setOrders(ordersData.data); setOrdersPagination({ currentPage: page, total: ordersData.total }); }
    else { fetchAndCacheOrders(page); }
  };

  const handleLedgerPageChange = async (page: number) => {
    setLedgerPagination(prev => ({ ...prev, currentPage: page }));
    const { ledgerData } = await db.getLedgerCache(page);
    if (ledgerData) { setLedgerEntries(ledgerData.data); setLedgerPagination({ currentPage: page, total: ledgerData.total }); }
    else { fetchAndCacheLedger(page); }
  };

  const handleCampaignPageChange = async (page: number) => {
    setCampaignsPagination(prev => ({ ...prev, currentPage: page }));
    const { campaignsData } = await db.getCampaignsCache(page);
    if (campaignsData) { setCampaigns(campaignsData.data); setCampaignsPagination({ currentPage: page, total: campaignsData.total }); }
    else { fetchAndCacheCampaigns(page); }
  };

  const handleTargetGroupPageChange = async (page: number) => {
    setTargetGroupsPagination(prev => ({ ...prev, currentPage: page }));
    const { groupsData } = await db.getTargetGroupsCache(page);
    if (groupsData) { setTargetGroups(groupsData.data); setTargetGroupsPagination({ currentPage: page, total: groupsData.total }); }
    else { fetchAndCacheTargetGroups(page); }
  };
  
  const handleMemberPageChange = async (page: number) => {
    if (selectedTargetGroupId) {
        setMembersPagination(prev => ({ ...prev, currentPage: page }));
        await fetchAndCacheTargetGroupMembers(selectedTargetGroupId, page);
    }
  };

  const handleAllAttendeesPageChange = async (page: number) => {
    setAllAttendeesPagination(prev => ({...prev, currentPage: page}));
    const { attendeesData } = await db.getAttendeesCache(page);
    if(attendeesData) { setAllAttendees(attendeesData.data); setAllAttendeesPagination({currentPage: page, total: attendeesData.total}); }
    else { fetchAndCacheAllAttendees(page); }
  }
  
  const finalEventDetails = useMemo(() => {
    if (!eventDetails) return null;
    return {
        ...eventDetails,
        attendees: sortedEventAttendees,
        ticketGroups: sortedTicketGroups,
    };
  }, [eventDetails, sortedEventAttendees, sortedTicketGroups]);


  const renderDashboardView = () => {
    const filterOptions = ['published', 'draft', 'completed', 'canceled', 'all'];

    const renderEventContent = () => {
        if (loadingEvents && events.length === 0) {
          return <Loader />;
        }
        if (!apiKey) {
          return (
            <div className="text-center p-8 bg-slate-800 rounded-lg">
              <h2 className="text-2xl font-semibold text-white">Welcome</h2>
              <p className="mt-2 text-slate-400">Please provide your API Key to view events.</p>
            </div>
          );
        }
        if (events.length === 0 && !loadingEvents) {
          return <ErrorMessage message="No events found for this account. Click 'Refresh Data' to fetch." />;
        }
        if (filteredEvents.length === 0) {
          return <ErrorMessage message={`No ${eventFilter} events found. Try another filter.`} />;
        }
        return (
          <ul className="space-y-3">
            {filteredEvents.map(event => (
              <EventListItem
                key={event.id}
                event={event}
                isSelected={selectedEventId === event.id}
                onSelect={() => setSelectedEventId(event.id)}
              />
            ))}
          </ul>
        );
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedEvents} loading={loadingEvents} onRefresh={fetchAndCacheEvents} viewName="events" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                <div className="md:col-span-1 lg:col-span-1 bg-slate-800 p-4 rounded-xl shadow-lg h-fit">
                    <h2 className="text-xl font-semibold text-white mb-4 px-2">Your Events</h2>
                    <div className="flex flex-wrap gap-1 mb-4 bg-slate-900/50 p-1 rounded-lg">
                        {filterOptions.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setEventFilter(filter)}
                                className={`flex-grow text-center px-2 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/80 ${
                                    eventFilter === filter
                                        ? 'bg-brand-primary text-white shadow'
                                        : 'text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                <span className="capitalize">{filter}</span>
                            </button>
                        ))}
                    </div>
                    {renderEventContent()}
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    {!selectedEventId && <div className="flex items-center justify-center h-full rounded-xl bg-slate-800/50 border-2 border-dashed border-slate-700"><p className="text-slate-400">Select an event to view its statistics.</p></div>}
                    {loadingDetails && <Loader message="Combining and analyzing event data..." />}
                    {detailsError && <ErrorMessage message={detailsError} />}
                    {finalEventDetails && <Dashboard 
                        details={finalEventDetails} 
                        attendeePage={attendeePage} 
                        onAttendeePageChange={setAttendeePage} 
                        attendeesPerPage={ATTENDEES_PER_PAGE}
                        activeSubView={eventDetailView}
                        onSetSubView={setEventDetailView}
                        requestAttendeeSort={requestEventAttendeesSort}
                        attendeeSortConfig={eventAttendeesSortConfig}
                        requestTicketGroupSort={requestTicketGroupsSort}
                        ticketGroupSortConfig={ticketGroupsSortConfig}
                    />}
                </div>
            </div>
        </div>
    );
  };

  const renderOrdersView = () => {
    if (!apiKey) return <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in"><h2 className="text-2xl font-semibold text-white">Order Management</h2><p className="mt-2 text-slate-400">Please provide your API Key in settings to view orders.</p></div>;
    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedOrders} loading={loadingOrders} onRefresh={() => fetchAndCacheOrders(ordersPagination.currentPage)} viewName="orders" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">All Orders</h2>
                {loadingOrders ? <Loader /> : ordersError ? <ErrorMessage message={ordersError} /> : ( <> <OrdersTable orders={sortedOrders} onSelectOrder={setSelectedOrderId} requestSort={requestOrderSort} sortConfig={orderSortConfig} /> <Pagination currentPage={ordersPagination.currentPage} totalItems={ordersPagination.total} itemsPerPage={ORDERS_PER_PAGE} onPageChange={handleOrderPageChange} /> </> )}
            </div>
        </div>
    );
  };
  
  const renderLedgerView = () => {
    if (!apiKey) return <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in"><h2 className="text-2xl font-semibold text-white">Financials</h2><p className="mt-2 text-slate-400">Please provide your API Key in settings to view financial records.</p></div>;
    return (
         <div className="animate-fade-in">
             <RefreshBar lastUpdated={lastUpdatedLedger} loading={loadingLedger} onRefresh={() => fetchAndCacheLedger(ledgerPagination.currentPage)} viewName="financials" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Financial Ledger</h2>
                {loadingLedger ? <Loader /> : ledgerError ? <ErrorMessage message={ledgerError} /> : ( <> <LedgerTable entries={sortedLedger} requestSort={requestLedgerSort} sortConfig={ledgerSortConfig} /> <Pagination currentPage={ledgerPagination.currentPage} totalItems={ledgerPagination.total} itemsPerPage={LEDGER_ENTRIES_PER_PAGE} onPageChange={handleLedgerPageChange} /> </> )}
            </div>
        </div>
    );
  };

  const renderCampaignsView = () => {
    if (!apiKey) return <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in"><h2 className="text-2xl font-semibold text-white">Campaigns</h2><p className="mt-2 text-slate-400">Please provide your API Key in settings to view campaigns and discounts.</p></div>;
    return (
         <div className="animate-fade-in">
             <RefreshBar lastUpdated={lastUpdatedCampaigns} loading={loadingCampaigns} onRefresh={() => fetchAndCacheCampaigns(campaignsPagination.currentPage)} viewName="campaigns" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Campaigns & Discounts</h2>
                {loadingCampaigns ? <Loader /> : campaignsError ? <ErrorMessage message={campaignsError} /> : ( <> <CampaignsTable campaigns={sortedCampaigns} requestSort={requestCampaignSort} sortConfig={campaignSortConfig} /> <Pagination currentPage={campaignsPagination.currentPage} totalItems={campaignsPagination.total} itemsPerPage={CAMPAIGNS_PER_PAGE} onPageChange={handleCampaignPageChange} /> </> )}
            </div>
        </div>
    );
  };

  const renderTargetGroupsView = () => {
    if (!apiKey) return <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in"><h2 className="text-2xl font-semibold text-white">Target Groups</h2><p className="mt-2 text-slate-400">Please provide your API Key to view target groups.</p></div>;
    return (
        <div className="animate-fade-in">
          <RefreshBar lastUpdated={lastUpdatedTargetGroups} loading={loadingTargetGroups} onRefresh={() => fetchAndCacheTargetGroups(targetGroupsPagination.currentPage)} viewName="target groups"/>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg h-fit">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center"><TargetGroupIcon /><span className="ml-2">Target Groups</span></h2>
              {loadingTargetGroups && targetGroups.length === 0 ? <Loader /> : targetGroupsError ? <ErrorMessage message={targetGroupsError} /> : (
                <>
                  <TargetGroupsTable groups={sortedTargetGroups} onSelectGroup={setSelectedTargetGroupId} selectedGroupId={selectedTargetGroupId} requestSort={requestTargetGroupSort} sortConfig={targetGroupSortConfig} />
                  <Pagination currentPage={targetGroupsPagination.currentPage} totalItems={targetGroupsPagination.total} itemsPerPage={TARGET_GROUPS_PER_PAGE} onPageChange={handleTargetGroupPageChange} />
                </>
              )}
            </div>
            <div className="lg:col-span-2">
              {!selectedTargetGroupId ? (
                <div className="flex items-center justify-center h-full rounded-xl bg-slate-800/50 border-2 border-dashed border-slate-700 p-8">
                  <p className="text-slate-400 text-center">Select a target group to view its members.</p>
                </div>
              ) : (
                <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[400px]">
                  <h2 className="text-2xl font-semibold text-white mb-4">Group Members ({(membersPagination.total || 0).toLocaleString()})</h2>
                  {loadingMembers ? <Loader /> : membersError ? <ErrorMessage message={membersError} /> : (
                     <>
                        <TargetGroupMembersTable members={sortedTargetGroupMembers} requestSort={requestMemberSort} sortConfig={memberSortConfig} />
                        <Pagination currentPage={membersPagination.currentPage} totalItems={membersPagination.total} itemsPerPage={MEMBERS_PER_PAGE} onPageChange={handleMemberPageChange}/>
                     </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
  };

  const renderAttendeesView = () => {
    if (!apiKey) return <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in"><h2 className="text-2xl font-semibold text-white">Attendees</h2><p className="mt-2 text-slate-400">Please provide your API Key in settings to view all attendees.</p></div>;
    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedAllAttendees} loading={loadingAllAttendees} onRefresh={() => fetchAndCacheAllAttendees(allAttendeesPagination.currentPage)} viewName="attendees" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4 flex items-center"><UserIcon/><span className="ml-2">All Attendees</span></h2>
                {loadingAllAttendees ? <Loader /> : allAttendeesError ? <ErrorMessage message={allAttendeesError} /> : ( <> <AllAttendeesTable attendees={sortedAllAttendees} onSelectAttendee={setSelectedAttendeeId} requestSort={requestAllAttendeeSort} sortConfig={allAttendeeSortConfig} /> <Pagination currentPage={allAttendeesPagination.currentPage} totalItems={allAttendeesPagination.total} itemsPerPage={ALL_ATTENDEES_PER_PAGE} onPageChange={handleAllAttendeesPageChange} /> </> )}
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      {showSettings && <SettingsForm initialApiKey={apiKey} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      {selectedOrderId && <OrderDetailsModal order={orderDetails} loading={loadingOrderDetails} error={orderDetailsError} onClose={() => setSelectedOrderId(null)} />}
      {selectedAttendeeId && <AttendeeDetailsModal attendee={attendeeDetails} loading={loadingAttendeeDetails} error={attendeeDetailsError} onClose={() => setSelectedAttendeeId(null)} />}

      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Billetto Dashboard</h1>
          <p className="mt-2 text-lg text-slate-400">Your event performance at a glance.</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-primary" aria-label="Open settings"><SettingsIcon /></button>
      </header>
      
      <main className="container mx-auto">
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 rounded-lg bg-slate-800 p-1">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'dashboard' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Dashboard</button>
            <button onClick={() => setCurrentView('attendees')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'attendees' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Attendees</button>
            <button onClick={() => setCurrentView('orders')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'orders' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Orders</button>
            <button onClick={() => setCurrentView('ledger')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'ledger' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Financials</button>
            <button onClick={() => setCurrentView('campaigns')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'campaigns' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Campaigns</button>
            <button onClick={() => setCurrentView('targetGroups')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'targetGroups' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>Target Groups</button>
        </div>
        {currentView === 'dashboard' && renderDashboardView()}
        {currentView === 'attendees' && renderAttendeesView()}
        {currentView === 'orders' && renderOrdersView()}
        {currentView === 'ledger' && renderLedgerView()}
        {currentView === 'campaigns' && renderCampaignsView()}
        {currentView === 'targetGroups' && renderTargetGroupsView()}
      </main>
    </div>
  );
};

export default App;
