
import React, { useState, useMemo } from 'react';
import { BillettoApiClient } from './services/billettoService';
import * as db from './services/dbService';
import SettingsForm from './components/SettingsForm';
import { SettingsIcon, CampaignIcon, TargetGroupIcon, UserIcon, LedgerIcon, TicketIcon, CalendarIcon } from './components/icons';
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

  const apiClient = useMemo(() => apiKey ? new BillettoApiClient(apiKey, useProxy) : null, [apiKey, useProxy]);

  const handleSaveSettings = async (newApiKey: string, newUseProxy: boolean) => {
    localStorage.setItem('billettoApiKey', newApiKey);
    localStorage.setItem('billettoUseProxy', JSON.stringify(newUseProxy));
    setShowSettings(false);
    await db.clearAllCache();

    // If we're not on the dashboard, switch to it. The apiKey change will
    // trigger a remount of the view component because we use it as a key.
    if (currentView !== 'dashboard') {
        setCurrentView('dashboard');
    }
    setApiKey(newApiKey);
    setUseProxy(newUseProxy);
  };
  
  const NavButton = ({ view, label, icon }: { view: View; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start w-full text-left p-3 rounded-lg transition-colors duration-200 ${
        currentView === view 
        ? 'bg-brand-primary/20 text-brand-primary' 
        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
      aria-label={label}
    >
      <div className="w-6 h-6">{icon}</div>
      <span className="mt-1 md:mt-0 md:ml-3 text-xs md:text-sm font-semibold">{label}</span>
    </button>
  );

  const renderContent = () => {
    if (!apiClient) return null;
    
    // Using apiKey and useProxy as a key forces the component to remount when the API key or proxy setting changes.
    // This is a clean way to reset all state within the view and its hooks.
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
      <NavButton view="dashboard" label="Dashboard" icon={<CalendarIcon />} />
      <NavButton view="orders" label="Orders" icon={<TicketIcon />} />
      <NavButton view="ledger" label="Ledger" icon={<LedgerIcon />} />
      <NavButton view="campaigns" label="Campaigns" icon={<CampaignIcon />} />
      <NavButton view="targetGroups" label="Target Groups" icon={<TargetGroupIcon />} />
      <NavButton view="attendees" label="Attendees" icon={<UserIcon />} />
    </>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {showSettings && <SettingsForm initialApiKey={apiKey} initialUseProxy={useProxy} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      
      <div className="flex">
        {/* --- Desktop Sidebar --- */}
        <aside className="hidden md:flex flex-col w-60 bg-slate-800 p-4 min-h-screen fixed">
            <div className="text-white text-2xl font-bold mb-8">
                Billetto<span className="text-brand-primary">Stats</span>
            </div>
            <nav className="flex flex-col gap-2">
                {navigationContent}
            </nav>
            <div className="mt-auto">
                <button
                    onClick={() => setShowSettings(true)}
                    className="flex flex-row items-center justify-start w-full text-left p-3 rounded-lg transition-colors duration-200 text-slate-400 hover:bg-slate-700 hover:text-white"
                    aria-label="Settings"
                >
                    <div className="w-6 h-6"><SettingsIcon /></div>
                    <span className="ml-3 text-sm font-semibold">Settings</span>
                </button>
            </div>
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 md:ml-60 pb-24 md:pb-8">
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
        </main>
      </div>

      {/* --- Mobile Bottom Navigation --- */}
      {apiKey && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 p-1 flex justify-around items-center z-40">
          {navigationContent}
          <button
              onClick={() => setShowSettings(true)}
              className="flex flex-col items-center justify-center w-full text-left p-3 rounded-lg transition-colors duration-200 text-slate-400 hover:bg-slate-700 hover:text-white"
              aria-label="Settings"
          >
              <div className="w-6 h-6"><SettingsIcon /></div>
              <span className="mt-1 text-xs font-semibold">Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
