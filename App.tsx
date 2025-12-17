
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { BillettoApiClient } from './services/billettoService';
import * as db from './services/dbService';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon, CampaignIcon, TargetGroupIcon, UserIcon, LedgerIcon, TicketIcon, CalendarIcon, MenuIcon, SearchIcon, AudienceIcon, TeacherIcon, CompareIcon, CalendarMonthIcon } from './components/icons';
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
import { ModalView, BackgroundTask, View, Theme } from './types';
import DetailsModal from './components/DetailsModal';
import OrderDetailsView from './components/modal_views/OrderDetailsView';
import AttendeeDetailsView from './components/modal_views/AttendeeDetailsView';
import CampaignDetailsView from './components/modal_views/CampaignDetailsView';
import CustomerDetailsView from './components/modal_views/CustomerDetailsView';
import { ToastContainer } from './components/Toast';
import BackgroundTaskDisplay from './components/BackgroundTaskDisplay';
import { CancellationError } from './utils/apiHelpers';
import { useUIStore } from './stores/uiStore';
import { useAuthStore } from './stores/authStore';
import { queryClient, clearPersistedQueryCache } from './services/queryClient';
import Loader from './components/Loader';

// Lazy load route components for code splitting
const DashboardView = React.lazy(() => import('./components/views/DashboardView'));
const OrdersView = React.lazy(() => import('./components/views/OrdersView'));
const LedgerView = React.lazy(() => import('./components/views/LedgerView'));
const CampaignsView = React.lazy(() => import('./components/views/CampaignsView'));
const TargetGroupsView = React.lazy(() => import('./components/views/TargetGroupsView'));
const AttendeesView = React.lazy(() => import('./components/views/AttendeesView'));
const AudienceView = React.lazy(() => import('./components/views/AudienceView'));
const PerformanceView = React.lazy(() => import('./components/views/PerformanceView'));
const ComparisonView = React.lazy(() => import('./components/views/ComparisonView'));
const CalendarView = React.lazy(() => import('./components/views/CalendarView'));

const App: React.FC = () => {
  // Auth state from Zustand store
  const { apiKey, useProxy, setCredentials } = useAuthStore();
  
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Use Zustand store for UI state
  const { 
    theme, setTheme,
    isSidebarOpen, toggleSidebar,
    isSearchOpen, setSearchOpen,
    isMoreMenuOpen, setMoreMenuOpen,
    modalView, openModal, closeModal,
    toasts, addToast, removeToast
  } = useUIStore();

  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTask[]>([]);
  const [taskControllers, setTaskControllers] = useState(new Map<string, AbortController>());

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey, useProxy) : null, [apiKey, useProxy]);
  const navigate = useNavigate();
  const location = useLocation();

  // Show settings if no API key is present on mount
  useEffect(() => {
    if (!apiKey) {
      setShowSettings(true);
    }
  }, [apiKey]);

  // Background Task Management
  const cancelTask = useCallback((taskId: string) => {
      const controller = taskControllers.get(taskId);
      if (controller) {
          controller.abort();
      }
      setBackgroundTasks(prev => prev.map(task => 
          task.id === taskId && task.status === 'running'
              ? { ...task, status: 'cancelled', message: 'User cancelled', progress: task.progress || 0 }
              : task
      ));
  }, [taskControllers]);

  const clearTask = useCallback((taskId: string) => {
      setBackgroundTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);
  
  const runTaskInBackground = useCallback(async <T,>(
      id: string,
      name: string,
      taskFn: (updateProgress: (progress: { value: number; message: string }) => void, signal: AbortSignal) => Promise<T>,
      onSuccess?: (result: T) => void
  ) => {
      if (backgroundTasks.some(task => task.id === id && task.status === 'running')) {
          addToast(`Task "${name}" is already running.`, 'info');
          return;
      }

      const controller = new AbortController();
      setTaskControllers(prev => new Map(prev).set(id, controller));

      const updateProgress = (progress: { value: number, message: string }) => {
          if (controller.signal.aborted) return;
          setBackgroundTasks(prev => prev.map(task => 
              task.id === id ? { ...task, progress: progress.value, message: progress.message } : task
          ));
      };

      setBackgroundTasks(prev => [...prev.filter(t => t.id !== id), { id, name, status: 'running', message: 'Starting...' }]);

      try {
          const result = await taskFn(updateProgress, controller.signal);
          if (controller.signal.aborted) {
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
          if (error instanceof CancellationError || (error instanceof Error && error.name === 'AbortError')) {
              console.log(`Background task "${name}" was cancelled.`);
          } else {
              console.error(`Background task "${name}" failed:`, error);
              setBackgroundTasks(prev => prev.map(task => 
                  task.id === id ? { ...task, status: 'error', message: error.message || 'An unknown error occurred' } : task
              ));
              addToast(`${name} failed: ${error.message || 'Unknown error'}`, 'error');
          }
      } finally {
          setTaskControllers(prev => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
          });
      }
  }, [backgroundTasks, addToast, taskControllers]);


  // --- Initialize All Hooks ---
  const eventsHook = useEvents(apiClient, addToast);
  const ordersHook = useOrders(apiClient, addToast);
  const ledgerHook = useLedger(apiClient, addToast);
  const campaignsHook = useCampaigns(apiClient, addToast);
  const targetGroupsHook = useTargetGroups(apiClient, addToast);
  const attendeesHook = useAttendees(apiClient, addToast);
  const audienceHook = useAudience(apiClient, runTaskInBackground, backgroundTasks, addToast);
  const performanceHook = usePerformance(apiClient, runTaskInBackground, backgroundTasks, addToast);


  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        closeModal();
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen, closeModal, setMoreMenuOpen]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('billettoTheme', theme); // Keep this for index.html FOUC script
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
  }, [theme, setTheme]);
  
  const viewToPathMap: Record<View, string> = {
      dashboard: '/',
      calendar: '/calendar',
      performance: '/performance',
      compare: '/compare',
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
            openModal({ title: `Order ${itemId}`, content: (props) => <OrderDetailsView {...props} orderId={itemId} /> });
        } else if (view === 'attendees') {
            openModal({ title: `Attendee ${itemId}`, content: (props) => <AttendeeDetailsView {...props} attendeeId={itemId} /> });
        } else if (view === 'campaigns') {
            openModal({ title: `Campaign ${itemId}`, content: (props) => <CampaignDetailsView {...props} campaignId={itemId} /> });
        } else if (view === 'audience') {
            openModal({ title: `Customer ${itemId}`, content: (props) => <CustomerDetailsView {...props} customerId={itemId} /> });
        } else if (view === 'targetGroups' && targetGroupsHook.sortedTargetGroups.find(tg => tg.id === itemId)) {
            targetGroupsHook.setSelectedTargetGroupId(itemId);
        }
    }
    setSearchOpen(false);
  }, [navigate, eventsHook, targetGroupsHook, openModal, setSearchOpen]);

  const handleSaveSettings = async (newApiKey: string, newUseProxy: boolean, newTheme: Theme) => {
    setTheme(newTheme);
    setShowSettings(false);
    await db.clearAllCache();
    queryClient.clear(); // Clear in-memory cache
    await clearPersistedQueryCache(); // Clear IDB persisted cache
    if (location.pathname !== '/') {
        navigate('/');
    }
    setCredentials(newApiKey, newUseProxy);
  };

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
    // Bridge Zustand store to Context
    setModalView: (view) => view ? openModal(view) : closeModal(),
    navigateTo,
    toasts,
    addToast,
    backgroundTasks,
    runTaskInBackground,
    cancelTask,
    clearTask,
  };
  
  const handleMoreNav = (path: string) => {
    navigate(path);
    setMoreMenuOpen(false);
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
      <NavItem to="/" end label="Dashboard" icon={<TicketIcon />} />
      <NavItem to="/calendar" label="Calendar" icon={<CalendarMonthIcon />} />
      <NavItem to="/compare" label="Compare" icon={<CompareIcon />} />
      <NavItem to="/performance" label="Performance" icon={<TeacherIcon />} />
      <NavItem to="/audience" label="Audience" icon={<AudienceIcon />} />
      <NavItem to="/orders" label="Orders" icon={<CalendarIcon />} />
      <NavItem to="/ledger" label="Ledger" icon={<LedgerIcon />} />
      <NavItem to="/campaigns" label="Campaigns" icon={<CampaignIcon />} />
      <NavItem to="/target-groups" label="Target Groups" icon={<TargetGroupIcon />} />
      <NavItem to="/attendees" label="Attendees" icon={<UserIcon />} />
    </>
  );
  
  const mobileNavigation = (
     <>
        <NavItem to="/" end label="Dashboard" icon={<TicketIcon />} />
        <NavItem to="/calendar" label="Calendar" icon={<CalendarMonthIcon />} />
        <NavItem to="/orders" label="Orders" icon={<CalendarIcon />} />
        <NavItem to="#" onClick={() => setSearchOpen(true)} label="Search" icon={<SearchIcon />} />
        <NavItem to="#" onClick={() => setMoreMenuOpen(true)} label="More" icon={<MenuIcon />} />
    </>
  );


  return (
      <AppContext.Provider value={appContextValue}>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
          <ToastContainer toasts={toasts} onRemove={removeToast} />
          {showSettings && <SettingsForm initialApiKey={apiKey} initialUseProxy={useProxy} initialTheme={theme} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
          {isSearchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
          
          <BackgroundTaskDisplay tasks={backgroundTasks} onCancel={cancelTask} onClear={clearTask} />

          {isMoreMenuOpen && (
              <div onClick={() => setMoreMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden flex items-end animate-fade-in">
                  <div
                      onClick={e => e.stopPropagation()}
                      className="w-full bg-white dark:bg-slate-800 rounded-t-2xl p-4 animate-slide-up border-t border-gray-200 dark:border-slate-700"
                  >
                      <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mb-4"></div>
                      <nav className="grid grid-cols-4 gap-2">
                          <MoreMenuNavItem onClick={() => handleMoreNav('/compare')} label="Compare" icon={<CompareIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/performance')} label="Performance" icon={<TeacherIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/audience')} label="Audience" icon={<AudienceIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/ledger')} label="Ledger" icon={<LedgerIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/campaigns')} label="Campaigns" icon={<CampaignIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/target-groups')} label="Groups" icon={<TargetGroupIcon />} />
                          <MoreMenuNavItem onClick={() => handleMoreNav('/attendees')} label="Attendees" icon={<UserIcon />} />
                          <MoreMenuNavItem onClick={() => { setShowSettings(true); setMoreMenuOpen(false); }} label="Settings" icon={<SettingsIcon />} />
                      </nav>
                  </div>
              </div>
          )}

          {/* --- Unified Global Modal --- */}
          {modalView && (
            <DetailsModal
              initialView={modalView}
              onClose={closeModal}
            />
          )}
          
          <div className="flex">
            <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-800 p-4 min-h-screen fixed transition-all duration-300 ease-in-out z-20 ${isSidebarOpen ? 'w-60' : 'w-20'}`}>
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
                            onClick={() => setSearchOpen(true)}
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
                  <React.Suspense fallback={<div className="flex h-[calc(100vh-10rem)] items-center justify-center"><Loader /></div>}>
                    <Routes>
                      <Route path="/" element={<DashboardView />} />
                      <Route path="/performance" element={<PerformanceView />} />
                      <Route path="/compare" element={<ComparisonView />} />
                      <Route path="/calendar" element={<CalendarView />} />
                      <Route path="/orders" element={<OrdersView />} />
                      <Route path="/ledger" element={<LedgerView />} />
                      <Route path="/campaigns" element={<CampaignsView />} />
                      <Route path="/target-groups" element={<TargetGroupsView />} />
                      <Route path="/attendees" element={<AttendeesView />} />
                      <Route path="/audience" element={<AudienceView />} />
                    </Routes>
                  </React.Suspense>
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
