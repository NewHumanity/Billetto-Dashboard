

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BillettoEvent, Attendee, Order, LedgerEntry, EventDetails } from './types';
import { BillettoApiClient, BillettoApiError } from './services/billettoService';
import * as db from './services/dbService';
import Dashboard from './components/Dashboard';
import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon } from './components/icons';
import EventListItem from './components/EventListItem';
import OrdersTable from './components/OrdersTable';
import OrderDetailsModal from './components/OrderDetailsModal';
import Pagination from './components/Pagination';
import LedgerTable from './components/LedgerTable';
import RefreshBar from './components/RefreshBar';

type View = 'dashboard' | 'orders' | 'ledger';
const ORDERS_PER_PAGE = 20;
const ATTENDEES_PER_PAGE = 50;
const LEDGER_ENTRIES_PER_PAGE = 25;


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

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey) : null, [apiKey]);

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


  // --- Initial Data Loading from Cache ---
  const loadCachedData = useCallback(async () => {
    if (!apiKey) return;
    
    // Events
    const { events: cachedEvents, lastUpdated: luEvents } = await db.getEventsCache();
    if (cachedEvents) setEvents(cachedEvents);
    if (luEvents) setLastUpdatedEvents(new Date(luEvents));
    
    // Orders
    const { ordersData: cachedOrders, lastUpdated: luOrders } = await db.getOrdersCache(ordersPagination.currentPage);
    if (cachedOrders) {
        setOrders(cachedOrders.data);
        setOrdersPagination({ currentPage: ordersPagination.currentPage, total: cachedOrders.total });
    }
    if (luOrders) setLastUpdatedOrders(new Date(luOrders));
    
    // Ledger
    const { ledgerData: cachedLedger, lastUpdated: luLedger } = await db.getLedgerCache(ledgerPagination.currentPage);
     if (cachedLedger) {
        setLedgerEntries(cachedLedger.data);
        setLedgerPagination({ currentPage: ledgerPagination.currentPage, total: cachedLedger.total });
    }
    if(luLedger) setLastUpdatedLedger(new Date(luLedger));

  }, [apiKey, ordersPagination.currentPage, ledgerPagination.currentPage]);

  useEffect(() => {
    loadCachedData();
  }, [apiKey]); // Run only when API key changes
  

  // Reset attendee page when a new event is selected
  useEffect(() => {
      setAttendeePage(1);
  }, [selectedEventId]);


  // Fetch Event Details (with caching)
  useEffect(() => {
    const fetchEventData = async () => {
        if (!selectedEventId || !apiClient) return;

        setLoadingDetails(true);
        setDetailsError(null);
        
        // Try cache first, but only for the first page of attendees
        if (attendeePage === 1) {
            const cachedDetails = await db.getEventDetailsCache(selectedEventId);
            if (cachedDetails) {
                setEventDetails(cachedDetails);
                setLoadingDetails(false);
                return;
            }
        }

        try {
            const event = events.find(e => e.id === selectedEventId) || await apiClient.getEvent(selectedEventId);
            const attendeesResponse = await apiClient.getEventAttendees(selectedEventId, attendeePage, ATTENDEES_PER_PAGE);

            const totalRevenue = (attendeePage === 1 || !eventDetails || eventDetails.event.id !== selectedEventId)
                ? attendeesResponse.data.reduce((sum, att) => sum + att.price, 0) / 100
                : eventDetails.stats.totalRevenue;
            
            const newDetails: EventDetails = {
                event,
                attendees: attendeesResponse.data,
                stats: {
                    totalTicketsSold: attendeesResponse.total,
                    totalRevenue: totalRevenue,
                    currency: event.currency,
                },
            };

            setEventDetails(newDetails);

            // Only cache the details when we fetch the first page
            if (attendeePage === 1) {
                await db.setEventDetailsCache(newDetails);
            }

        } catch (err) {
            if (err instanceof BillettoApiError) setDetailsError(err.message);
            else setDetailsError('An unknown error occurred while fetching event details.');
        } finally {
            setLoadingDetails(false);
        }
    };

    fetchEventData();
  }, [selectedEventId, attendeePage, apiClient, events]);
  
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

  const handleSaveSettings = async (newApiKey: string) => {
    localStorage.setItem('billettoApiKey', newApiKey);
    setApiKey(newApiKey);
    setShowSettings(false);

    await db.clearAllCache();

    // Reset all state
    setEvents([]);
    setLastUpdatedEvents(null);
    setSelectedEventId(null);
    setEventDetails(null);
    setOrders([]);
    setLastUpdatedOrders(null);
    setSelectedOrderId(null);
    setOrderDetails(null);
    setLedgerEntries([]);
    setLastUpdatedLedger(null);
    setLedgerPagination({ currentPage: 1, total: 0 });
    setCurrentView('dashboard');
  };
  
  const handleOrderPageChange = async (page: number) => {
    const { ordersData } = await db.getOrdersCache(page);
    if(ordersData){
        setOrders(ordersData.data);
        setOrdersPagination({ currentPage: page, total: ordersData.total });
    } else {
        fetchAndCacheOrders(page);
    }
  };

  const handleLedgerPageChange = async (page: number) => {
    const { ledgerData } = await db.getLedgerCache(page);
    if (ledgerData) {
        setLedgerEntries(ledgerData.data);
        setLedgerPagination({ currentPage: page, total: ledgerData.total });
    } else {
        fetchAndCacheLedger(page);
    }
  };

  const renderEventList = () => {
    if (!apiKey) return (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
            <h2 className="text-2xl font-semibold text-white">Welcome</h2>
            <p className="mt-2 text-slate-400">Please provide your API Key to view events.</p>
        </div>
    );
    if (events.length === 0 && !loadingEvents) return <ErrorMessage message="No events found. Click 'Refresh Data' to fetch." />;
    return (
        <ul className="space-y-3">
            {events.map(event => <EventListItem key={event.id} event={event} isSelected={selectedEventId === event.id} onSelect={() => setSelectedEventId(event.id)} />)}
        </ul>
    );
  };

  const renderDashboardView = () => (
    <div className="animate-fade-in">
        <RefreshBar 
            lastUpdated={lastUpdatedEvents}
            loading={loadingEvents}
            onRefresh={fetchAndCacheEvents}
            viewName="events"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <div className="md:col-span-1 lg:col-span-1 bg-slate-800 p-4 rounded-xl shadow-lg h-fit">
                <h2 className="text-xl font-semibold text-white mb-4 px-2">Your Events</h2>
                {loadingEvents && events.length === 0 ? <Loader/> : renderEventList()}
            </div>
            <div className="md:col-span-2 lg:col-span-3">
                {!selectedEventId && (
                    <div className="flex items-center justify-center h-full rounded-xl bg-slate-800/50 border-2 border-dashed border-slate-700">
                        <p className="text-slate-400">Select an event to view its statistics.</p>
                    </div>
                )}
                {loadingDetails && <Loader />}
                {detailsError && <ErrorMessage message={detailsError} />}
                {eventDetails && <Dashboard details={eventDetails} attendeePage={attendeePage} onAttendeePageChange={setAttendeePage} attendeesPerPage={ATTENDEES_PER_PAGE}/>}
            </div>
        </div>
    </div>
  );

  const renderOrdersView = () => {
    if (!apiKey) return (
      <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in">
          <h2 className="text-2xl font-semibold text-white">Order Management</h2>
          <p className="mt-2 text-slate-400">Please provide your API Key in settings to view orders.</p>
      </div>
    );
    
    return (
        <div className="animate-fade-in">
            <RefreshBar
                lastUpdated={lastUpdatedOrders}
                loading={loadingOrders}
                onRefresh={() => fetchAndCacheOrders(ordersPagination.currentPage)}
                viewName="orders"
            />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">All Orders</h2>
                {loadingOrders ? <Loader /> : ordersError ? <ErrorMessage message={ordersError} /> : (
                    <>
                        <OrdersTable orders={orders} onSelectOrder={setSelectedOrderId} />
                        <Pagination 
                            currentPage={ordersPagination.currentPage}
                            totalItems={ordersPagination.total}
                            itemsPerPage={ORDERS_PER_PAGE}
                            onPageChange={handleOrderPageChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
  };
  
  const renderLedgerView = () => {
    if (!apiKey) return (
      <div className="text-center p-8 bg-slate-800 rounded-lg animate-fade-in">
          <h2 className="text-2xl font-semibold text-white">Financials</h2>
          <p className="mt-2 text-slate-400">Please provide your API Key in settings to view financial records.</p>
      </div>
    );
    
    return (
         <div className="animate-fade-in">
             <RefreshBar
                lastUpdated={lastUpdatedLedger}
                loading={loadingLedger}
                onRefresh={() => fetchAndCacheLedger(ledgerPagination.currentPage)}
                viewName="financials"
            />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">Financial Ledger</h2>
                {loadingLedger ? <Loader /> : ledgerError ? <ErrorMessage message={ledgerError} /> : (
                    <>
                        <LedgerTable entries={ledgerEntries} />
                        <Pagination 
                            currentPage={ledgerPagination.currentPage}
                            totalItems={ledgerPagination.total}
                            itemsPerPage={LEDGER_ENTRIES_PER_PAGE}
                            onPageChange={handleLedgerPageChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      {showSettings && <SettingsForm initialApiKey={apiKey} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      {selectedOrderId && <OrderDetailsModal order={orderDetails} loading={loadingOrderDetails} error={orderDetailsError} onClose={() => setSelectedOrderId(null)} />}
      
      <header className="mb-8 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Billetto Dashboard</h1>
          <p className="mt-2 text-lg text-slate-400">Your event performance at a glance.</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-primary"
          aria-label="Open settings"
        >
          <SettingsIcon />
        </button>
      </header>
      
      <main className="container mx-auto">
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-1 rounded-lg bg-slate-800 p-1">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'dashboard' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>
                Event Dashboard
            </button>
            <button onClick={() => setCurrentView('orders')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'orders' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>
                Order Management
            </button>
            <button onClick={() => setCurrentView('ledger')} className={`w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors duration-200 ring-white/60 ring-offset-2 ring-offset-brand-primary focus:outline-none focus:ring-2 ${currentView === 'ledger' ? 'bg-brand-primary text-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}>
                Financials
            </button>
        </div>
        {currentView === 'dashboard' && renderDashboardView()}
        {currentView === 'orders' && renderOrdersView()}
        {currentView === 'ledger' && renderLedgerView()}
      </main>
    </div>
  );
};

export default App;