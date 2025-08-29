

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { BillettoApiClient } from './services/billettoService';
import * as db from './services/dbService';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon, CampaignIcon, TargetGroupIcon, UserIcon, LedgerIcon, TicketIcon, CalendarIcon, MenuIcon, SearchIcon, AudienceIcon, TeacherIcon } from './components/icons';
import DashboardView from './components/views/DashboardView';
import OrdersView from './components/views/OrdersView';
import LedgerView from './components/views/LedgerView';
import CampaignsView from './components/views/CampaignsView';
import TargetGroupsView from './components/views/TargetGroupsView';
import AttendeesView from './components/views/AttendeesView';
import AudienceView from './components/views/AudienceView';
import PerformanceView from './components/views/PerformanceView';
import { useEvents } from './hooks/useEvents';
import { useOrders } from './hooks/useOrders';
import { useLedger } from './hooks/useLedger';
import { useCampaigns } from './hooks/useCampaigns';
import { useTargetGroups } from './hooks/useTargetGroups';
import { useAttendees } from './hooks/useAttendees';
import { useAudience } from './hooks/useAudience';
import { usePerformance } from './hooks/usePerformance';
import { AppContext, AppContextType } from './contexts/AppContext';
import GlobalSearch from './components/GlobalSearch';
import { ModalView, Toast, BackgroundTask } from './types';
import DetailsModal from './components/DetailsModal';
import OrderDetailsView from './components/modal_views/OrderDetailsView';
import AttendeeDetailsView from './components/modal_views/AttendeeDetailsView';
import CampaignDetailsView from './components/modal_views/CampaignDetailsView';
import CustomerDetailsView from './components/modal_views/CustomerDetailsView';
import { ToastContainer } from './components/Toast';
import BackgroundTaskDisplay from './components/BackgroundTaskDisplay';
import { CancellationError } from './utils/apiHelpers';

export type View = 'dashboard' | 'performance' | 'orders' | 'ledger' | 'campaigns' | 'targetGroups' | 'attendees' | 'audience';
export type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('billettoApiKey') || '');
  const [useProxy, setUseProxy] = useState<boolean>(() => {
    const stored = localStorage.getItem('billettoUseProxy');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showSettings, setShowSettings] = useState<boolean>(!apiKey);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) return JSON.parse(savedState);
    return window.innerWidth > 1024; // Default to open on large screens
  });
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('billettoTheme') as Theme) || 'system');

  // --- Unified Global Modal State ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [modalView, setModalView] = useState<ModalView | null>(null);
  
  // --- Toast & Background Task State ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [cancelledTasks, setCancelledTasks] = useState(new Set<string>());

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey, useProxy) : null, [apiKey, useProxy]);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Toast & Background Task Management ---
  const addToast = useCallback((message: string, type: Toast['type']) => {
    setToasts(prevToasts => {
        const existingToast = prevToasts.find(t => t.message === message && t.type === type);
        
        if (existingToast) {
            return prevToasts.map(t =>
                t.id === existingToast.id
                    ? { ...t, count: (t.count || 1) + 1, id: Date.now() }
                    : t
            );
        }
        
        return [...prevToasts, { id: Date.now(), message, type, count: 1 }];
    });
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const cancelTask = useCallback((taskId: string) => {
      setCancelledTasks(prev => new Set(prev).add(taskId));
      setBackgroundTasks(prev => prev.map(task => 
          task.id === taskId && task.status === 'running'
              ? { ...task, status: 'cancelled', message: 'User cancelled', progress: task.progress || 0 }
              : task
      ));
  }, []);

  const clearTask = useCallback((taskId: string) => {
      setBackgroundTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);
  
  const runTaskInBackground = useCallback(async <T,>(
      id: string,
      name: string,
      taskFn: (updateProgress: (progress: { value: number; message: string }) => void, isCancelled: () => boolean) => Promise<T>,
      onSuccess?: (result: T) => void
  ) => {
      if (backgroundTasks.some(task => task.id === id && task.status === 'running')) {
          addToast(`Task "${name}" is already running.`, 'info');
          return;
      }

      setCancelledTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
      });
      
      const isCancelled = () => cancelledTasks.has(id);

      const updateProgress = (progress: { value: number, message: string }) => {
          if (isCancelled()) return;
          setBackgroundTasks(prev => prev.map(task => 
              task.id === id ? { ...task, progress: progress.value, message: progress.message } : task
          ));
      };

      setBackgroundTasks(prev => [...prev.filter(t => t.id !== id), { id, name, status: 'running', message: 'Starting...' }]);

      try {
          const result = await taskFn(updateProgress, isCancelled);
          if (isCancelled()) {
              console.log(`Task ${id} finished but was already cancelled.`);
              return;
          }
          setBackgroundTasks(prev => prev.map(task => 
              task.id === id ? { ...task, status: 'completed', progress: 100, message: 'Completed' } : task
          ));
          addToast(`${name} finished successfully.`, 'success');
          if (onSuccess) {
              onSuccess(result);
          }
      } catch (error: any) {
          if (error instanceof CancellationError) {
              console.log(`Background task "${name}" was cancelled.`);
          } else {
              console.error(`Background task "${name}" failed:`, error);
              setBackgroundTasks(prev => prev.map(task => 
                  task.id === id ? { ...task, status: 'error', message: error.message || 'An unknown error occurred' } : task
              ));
              addToast(`${name} failed: ${error.message || 'Unknown error'}`, 'error');
          }
      }
  }, [backgroundTasks, addToast, cancelledTasks]);


  // --- Initialize All Hooks ---
  const eventsHook = useEvents(apiClient);
  const ordersHook = useOrders(apiClient);
  const ledgerHook = useLedger(apiClient);
  const campaignsHook = useCampaigns(apiClient);
  const targetGroupsHook = useTargetGroups(apiClient);
  const attendeesHook = useAttendees(apiClient);
  const audienceHook = useAudience(apiClient, runTaskInBackground, backgroundTasks);
  const performanceHook = usePerformance(apiClient, runTaskInBackground, backgroundTasks);


  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setModalView(null);
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('billettoTheme', theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  
  const viewToPathMap: Record<View, string> = {
      dashboard: '/',
      performance: '/performance',
      orders: '/orders',
      ledger: '/ledger',
      campaigns: '/campaigns',
      targetGroups: '/target-groups',
      attendees: '/attendees',
      audience: '/audience',
  };

  const navigateTo = useCallback((view: View, itemId?: string) => {
    const path = viewToPathMap[view] || '/';
    navigate(path);
    if (itemId) {
        if (view === 'dashboard' && eventsHook.events.find(e => e.id === itemId)) {
            const eventItem = eventsHook.filteredEventListItems.find(item => item.id === itemId);
            if (eventItem) eventsHook.setSelectedItem(eventItem);
        } else if (view === 'orders') {
            setModalView({ title: `Order ${itemId}`, content: (props) => <OrderDetailsView {...props} orderId={itemId} /> });
        } else if (view === 'attendees') {
            setModalView({ title: `Attendee ${itemId}`, content: (props) => <AttendeeDetailsView {...props} attendeeId={itemId} /> });
        } else if (view === 'campaigns') {
            setModalView({ title: `Campaign ${itemId}`, content: (props) => <CampaignDetailsView {...props} campaignId={itemId} /> });
        } else if (view === 'audience') {
            setModalView({ title: `Customer ${itemId}`, content: (props) => <CustomerDetailsView {...props} customerId={itemId} /> });
        } else if (view === 'targetGroups' && targetGroupsHook.sortedTargetGroups.find(tg => tg.id === itemId)) {
            targetGroupsHook.setSelectedTargetGroupId(itemId);
        }
    }
    setIsSearchOpen(false);
  }, [navigate, eventsHook, targetGroupsHook, setModalView]);

  const handleSaveSettings = async (newApiKey: string, newUseProxy: boolean, newTheme: Theme) => {
    localStorage.setItem('billettoApiKey', newApiKey);
    localStorage.setItem('billettoUseProxy', JSON.stringify(newUseProxy));
    setTheme(newTheme);
    setShowSettings(false);
    await db.clearAllCache();
    if (location.pathname !== '/') {
        navigate('/');
    }
    setApiKey(newApiKey);
    setUseProxy(newUseProxy);
  };

  // FIX: Refactored NavItem to handle onClick events for button-like actions,
  // rendering a <button> for semantics and accessibility, while still supporting
  // <NavLink> for actual navigation. This resolves the TypeScript errors.
  const NavItem = ({ to, label, icon, end = false, onClick }: { to: string; label: string; icon: React.ReactNode; end?: boolean; onClick?: () => void }) => {
    const content = (
      <>
        <div className="w-6 h-6 flex-shrink-0">{icon}</div>
        <span className={`font-semibold 
          mt-1 text-xs 
          ${isSidebarOpen 
            ? 'md:ml-3 md:mt-0 md:text-sm' 
            : 'md:hidden'}
        `}>
          {label}
        </span>
      </>
    );

    const commonClasses = `flex w-full text-left p-3 rounded-lg transition-colors duration-200 group
      flex-col items-center justify-center 
      ${isSidebarOpen 
        ? 'md:flex-row md:justify-start' 
        : 'md:flex-col md:justify-center'}
    `;

    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={`${commonClasses} text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white`}
          aria-label={label}
          title={isSidebarOpen ? undefined : label}
        >
          {content}
        </button>
      );
    }
    
    return (
      <NavLink
        to={to}
        end={end}
        className={({isActive}) => `${commonClasses} 
          ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}
        `}
        aria-label={label}
        title={isSidebarOpen ? undefined : label}
      >
        {content}
      </NavLink>
    );
  };

  const appContextValue: AppContextType = {
    theme,
    apiClient,
    ...eventsHook,
    ...ordersHook,
    ...ledgerHook,
    ...campaignsHook,
    ...targetGroupsHook,
    ...attendeesHook,
    ...audienceHook,
    ...performanceHook,
    setModalView,
    navigateTo,
    toasts,
    addToast,
    backgroundTasks,
    runTaskInBackground,
    isRefreshingDetails: eventsHook.isRefreshingDetails,
    cancelTask,
    clearTask,
  };
  
  const handleMoreNav = (path: string) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  };
  
  const MoreMenuNavItem = ({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
        <div className="w-6 h-6">{icon}</div>
        <span className="text-xs font-semibold">{label}</span>
    </button>
  );

  const headerTitle = useMemo(() => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    const formatted = path.replace(/-/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [location.pathname]);

  const desktopNavigation = (
    <>
      <NavItem to="/" end label="Dashboard" icon={<CalendarIcon />} />
      <NavItem to="/performance" label="Performance" icon={<TeacherIcon />} />
      <NavItem to="/audience" label="Audience" icon={<AudienceIcon />} />
      <NavItem to="/orders" label="Orders" icon={<TicketIcon />} />
      <NavItem to="/ledger" label="Ledger" icon={<LedgerIcon />} />
      <NavItem to="/campaigns" label="Campaigns" icon={<CampaignIcon />} />
      <NavItem to="/target-groups" label="Target Groups" icon={<TargetGroupIcon />} />
      <NavItem to="/attendees" label="Attendees" icon={<UserIcon />} />
    </>
  );
  
  const mobileNavigation = (
     <>
        <NavItem to="/" end label="Dashboard" icon={<CalendarIcon />} />
        <NavItem to="/audience" label="Audience" icon={<AudienceIcon />} />
        <NavItem to="/orders" label="Orders" icon={<TicketIcon />} />
        <NavItem to="#" onClick={() => setIsSearchOpen(true)} label="Search" icon={<SearchIcon />} />
        <NavItem to="#" onClick={() => setIsMoreMenuOpen(true)} label="More" icon={<MenuIcon />} />
    </>
  );


  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        {showSettings && <SettingsForm initialApiKey={apiKey} initialUseProxy={useProxy} initialTheme={theme} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
        {isSearchOpen && <GlobalSearch onClose={() => setIsSearchOpen(false)} />}
        
        <BackgroundTaskDisplay tasks={backgroundTasks} onCancel={cancelTask} onClear={clearTask} />

        {isMoreMenuOpen && (
            <div onClick={() => setIsMoreMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden flex items-end animate-fade-in">
                <div
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-white dark:bg-slate-800 rounded-t-2xl p-4 animate-slide-up border-t border-gray-200 dark:border-slate-700"
                >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mb-4"></div>
                    <nav className="grid grid-cols-4 gap-2">
                         <MoreMenuNavItem onClick={() => handleMoreNav('/performance')} label="Performance" icon={<TeacherIcon />} />
                         <MoreMenuNavItem onClick={() => handleMoreNav('/ledger')} label="Ledger" icon={<LedgerIcon />} />
                         <MoreMenuNavItem onClick={() => handleMoreNav('/campaigns')} label="Campaigns" icon={<CampaignIcon />} />
                         <MoreMenuNavItem onClick={() => handleMoreNav('/target-groups')} label="Groups" icon={<TargetGroupIcon />} />
                         <MoreMenuNavItem onClick={() => handleMoreNav('/attendees')} label="Attendees" icon={<UserIcon />} />
                         <MoreMenuNavItem onClick={() => { setShowSettings(true); setIsMoreMenuOpen(false); }} label="Settings" icon={<SettingsIcon />} />
                    </nav>
                </div>
            </div>
        )}

        {/* --- Unified Global Modal --- */}
        {modalView && (
          <DetailsModal
            initialView={modalView}
            onClose={() => setModalView(null)}
          />
        )}
        
        <div className="flex">
          <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-800 p-4 min-h-screen fixed transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-60' : 'w-20'}`}>
            <div className="h-8 mb-8 flex items-center justify-center relative">
              <Link to="/" className={`text-slate-900 dark:text-white text-2xl font-bold whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!isSidebarOpen}>
                Billetto<span className="text-brand-primary">Stats</span>
              </Link>
              <Link to="/" className={`absolute transition-opacity duration-200 ${isSidebarOpen ? 'opacity-0' : 'opacity-100'}`} aria-hidden={isSidebarOpen}>
                <TicketIcon />
              </Link>
            </div>
            <nav className="flex flex-col gap-2">{desktopNavigation}</nav>
            <div className="mt-auto"><NavItem to="#" onClick={() => setShowSettings(true)} label="Settings" icon={<SettingsIcon />} /></div>
          </aside>

          <main className={`flex-1 flex flex-col p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-60' : 'md:ml-20'}`}>
            {apiKey && (
              <>
                {/* Desktop Header */}
                <header className="hidden md:flex items-center mb-6 flex-shrink-0">
                  <button 
                    onClick={toggleSidebar} 
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    <MenuIcon />
                  </button>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white ml-4 capitalize">
                    {headerTitle}
                  </h1>
                  <div className="ml-auto">
                      <button 
                          onClick={() => setIsSearchOpen(true)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          aria-label="Open search (Cmd+K)"
                      >
                          <SearchIcon />
                          <span className="hidden lg:inline">Search...</span>
                          <kbd className="hidden lg:inline-flex items-center px-2 py-1 text-xs font-sans font-semibold text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">
                              ⌘K
                          </kbd>
                      </button>
                  </div>
                </header>
                {/* Mobile Header */}
                 <header className="md:hidden flex items-center mb-6 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                        {headerTitle}
                    </h1>
                </header>
              </>
            )}
            <div className="flex-grow">
              {apiKey ? (
                  <Routes>
                    <Route path="/" element={<DashboardView />} />
                    <Route path="/performance" element={<PerformanceView />} />
                    <Route path="/orders" element={<OrdersView />} />
                    <Route path="/ledger" element={<LedgerView />} />
                    <Route path="/campaigns" element={<CampaignsView />} />
                    <Route path="/target-groups" element={<TargetGroupsView />} />
                    <Route path="/attendees" element={<AttendeesView />} />
                    <Route path="/audience" element={<AudienceView />} />
                </Routes>
              ) : (
                <div className="flex items-center justify-center h-[calc(100vh-10rem)] rounded-xl bg-white/50 dark:bg-slate-800/50 border-2 border-dashed border-gray-300 dark:border-slate-700 p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome to BillettoStats</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Please open settings and enter your API Keypair to get started.</p>
                    <button 
                      onClick={() => setShowSettings(true)}
                      className="mt-6 bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {apiKey && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-gray-200 dark:border-slate-700 p-1 flex justify-around items-center z-30">
            {mobileNavigation}
          </nav>
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;