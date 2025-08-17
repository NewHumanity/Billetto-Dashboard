
import React, { useState, useMemo, useEffect } from 'react';
import { BillettoApiClient } from './services/billettoService';
import * as db from './services/dbService';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon, CampaignIcon, TargetGroupIcon, UserIcon, LedgerIcon, TicketIcon, CalendarIcon, MenuIcon } from './components/icons';
import DashboardView from './components/views/DashboardView';
import OrdersView from './components/views/OrdersView';
import LedgerView from './components/views/LedgerView';
import CampaignsView from './components/views/CampaignsView';
import TargetGroupsView from './components/views/TargetGroupsView';
import AttendeesView from './components/views/AttendeesView';

type View = 'dashboard' | 'orders' | 'ledger' | 'campaigns' | 'targetGroups' | 'attendees';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('billettoApiKey') || '');
  const [useProxy, setUseProxy] = useState<boolean>(() => {
    const stored = localStorage.getItem('billettoUseProxy');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [showSettings, setShowSettings] = useState<boolean>(!apiKey);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem('sidebarOpen');
    if (savedState !== null) return JSON.parse(savedState);
    return window.innerWidth > 1024; // Default to open on large screens
  });

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey, useProxy) : null, [apiKey, useProxy]);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleSaveSettings = async (newApiKey: string, newUseProxy: boolean) => {
    localStorage.setItem('billettoApiKey', newApiKey);
    localStorage.setItem('billettoUseProxy', JSON.stringify(newUseProxy));
    setShowSettings(false);
    await db.clearAllCache();
    if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
    }
    setApiKey(newApiKey);
    setUseProxy(newUseProxy);
  };
  
  const NavItem = ({ onClick, isActive, label, icon }: { onClick: () => void; isActive?: boolean; label: string; icon: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`flex w-full text-left p-3 rounded-lg transition-colors duration-200 group
        ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
        flex-col items-center justify-center 
        ${isSidebarOpen 
          ? 'md:flex-row md:justify-start' 
          : 'md:flex-col md:justify-center'}
      `}
      aria-label={label}
      title={isSidebarOpen ? undefined : label}
    >
      <div className="w-6 h-6 flex-shrink-0">{icon}</div>
      <span className={`font-semibold 
        mt-1 text-xs 
        ${isSidebarOpen 
          ? 'md:ml-3 md:mt-0 md:text-sm' 
          : 'md:hidden'}
      `}>
        {label}
      </span>
    </button>
  );

  const renderContent = () => {
    if (!apiClient) return null;
    const viewKey = `${apiKey}-${useProxy}`;
    switch (currentView) {
      case 'dashboard': return <DashboardView key={viewKey} apiClient={apiClient} />;
      case 'orders': return <OrdersView key={viewKey} apiClient={apiClient} />;
      case 'ledger': return <LedgerView key={viewKey} apiClient={apiClient} />;
      case 'campaigns': return <CampaignsView key={viewKey} apiClient={apiClient} />;
      case 'targetGroups': return <TargetGroupsView key={viewKey} apiClient={apiClient} />;
      case 'attendees': return <AttendeesView key={viewKey} apiClient={apiClient} />;
      default: return <DashboardView key={viewKey} apiClient={apiClient} />;
    }
  };
  
  const navigationContent = (
    <>
      <NavItem onClick={() => setCurrentView('dashboard')} isActive={currentView === 'dashboard'} label="Dashboard" icon={<CalendarIcon />} />
      <NavItem onClick={() => setCurrentView('orders')} isActive={currentView === 'orders'} label="Orders" icon={<TicketIcon />} />
      <NavItem onClick={() => setCurrentView('ledger')} isActive={currentView === 'ledger'} label="Ledger" icon={<LedgerIcon />} />
      <NavItem onClick={() => setCurrentView('campaigns')} isActive={currentView === 'campaigns'} label="Campaigns" icon={<CampaignIcon />} />
      <NavItem onClick={() => setCurrentView('targetGroups')} isActive={currentView === 'targetGroups'} label="Target Groups" icon={<TargetGroupIcon />} />
      <NavItem onClick={() => setCurrentView('attendees')} isActive={currentView === 'attendees'} label="Attendees" icon={<UserIcon />} />
    </>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {showSettings && <SettingsForm initialApiKey={apiKey} initialUseProxy={useProxy} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      
      <div className="flex">
        {/* --- Sidebar (Desktop/Tablet) --- */}
        <aside className={`hidden md:flex flex-col bg-slate-800 p-4 min-h-screen fixed transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-60' : 'w-20'}`}>
          <div className="h-8 mb-8 flex items-center justify-center relative">
              <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }} className={`text-white text-2xl font-bold whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!isSidebarOpen}>
                  Billetto<span className="text-brand-primary">Stats</span>
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }} className={`absolute transition-opacity duration-200 ${isSidebarOpen ? 'opacity-0' : 'opacity-100'}`} aria-hidden={isSidebarOpen}>
                  <TicketIcon />
              </a>
          </div>
          <nav className="flex flex-col gap-2">
              {navigationContent}
          </nav>
          <div className="mt-auto">
              <NavItem onClick={() => setShowSettings(true)} label="Settings" icon={<SettingsIcon />} />
          </div>
        </aside>

        {/* --- Main Content --- */}
        <main className={`flex-1 flex flex-col p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-60' : 'md:ml-20'}`}>
            {apiKey && (
              <header className="hidden md:flex items-center mb-6 flex-shrink-0">
                  <button 
                      onClick={toggleSidebar} 
                      className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  >
                      <MenuIcon />
                  </button>
                  <h1 className="text-xl font-semibold text-white ml-4 capitalize">
                      {currentView.replace(/([A-Z])/g, ' $1').trim()}
                  </h1>
              </header>
            )}
            <div className="flex-grow">
              {apiKey ? renderContent() : (
                  <div className="flex items-center justify-center h-[calc(100vh-10rem)] rounded-xl bg-slate-800/50 border-2 border-dashed border-slate-700 p-8">
                      <div className="text-center">
                          <h2 className="text-2xl font-semibold text-white">Welcome to BillettoStats</h2>
                          <p className="mt-2 text-slate-400">Please open settings and enter your API Keypair to get started.</p>
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

      {/* --- Mobile Bottom Navigation --- */}
      {apiKey && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 p-1 flex justify-around items-center z-40">
          {navigationContent}
          <NavItem onClick={() => setShowSettings(true)} label="Settings" icon={<SettingsIcon />} />
        </nav>
      )}
    </div>
  );
};

export default App;
