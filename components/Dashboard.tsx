import React, { useState, useContext, useMemo } from 'react';
import { EventDetails, Attendee, TicketGroup, SortConfig, AvailableQuestion, GeographicSaleData, Theme } from '../types';
import StatCard from './StatCard';
import AttendeesTable from './EventsTable';
import Pagination from './Pagination';
import TicketTypesTable from './TicketTypesTable';
import { CalendarIcon, TicketIcon, CurrencyIcon, TicketGroupIcon, UserIcon, FeeIcon, NetPayoutIcon, ExternalLinkIcon, QuestionIcon, CopyIcon, LedgerIcon, CalculatorIcon, MarketingIcon, NewsletterIcon, GlobeIcon, SearchIcon, XCircleIcon, RefundIcon, ChargebackIcon, OrganizationIcon, LocationIcon, CheckCircleIcon, ChevronDownIcon, ExportIcon, TargetGroupIcon, PuzzleIcon, ClipboardListIcon, ClockIcon } from './icons';
import SalesVelocityChart from './SalesVelocityChart';
import SalesChannelChart from './SalesChannelChart';
import RevenueAttributionChart from './RevenueAttributionChart';
import BookingQuestionsAnalysis from './BookingQuestionsAnalysis';
import Loader from './Loader';
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from './Skeleton';
import LedgerDetailTable from './modal_tables/LedgerDetailTable';
import OrdersDetailTable, { GrossRevenueDetailTable } from './modal_tables/OrdersDetailTable';
import AttendeesDetailTable from './modal_tables/AttendeesDetailTable';
// Fix: Corrected import path for Theme type
import FeeBreakdownDetails from './FeeBreakdownDetails';
import { AppContext } from '../contexts/AppContext';
import SimpleBarChart from './EventsChart';
import { exportToCsv } from '../utils/export';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AttendeeDetailsView from './modal_views/AttendeeDetailsView';


interface DashboardProps {
    details: EventDetails;
    loading: boolean;
    isRefreshing: boolean;
    attendeePage: number;
    attendeesPerPage: number;
    onAttendeePageChange: (page: number) => void;
    activeSubView: 'overview' | 'attendees' | 'bookingQuestions' | 'marketing' | 'checkin';
    onSetSubView: (view: 'overview' | 'attendees' | 'bookingQuestions' | 'marketing' | 'checkin') => void;
    requestAttendeeSort: (key: keyof Attendee | string) => void;
    attendeeSortConfig: SortConfig<Attendee> | null;
    requestTicketGroupSort: (key: keyof TicketGroup | string) => void;
    ticketGroupSortConfig: SortConfig<TicketGroup> | null;
    loadingAnalysis: boolean;
    onTriggerAnalysis: (force: boolean) => void;
    filterTicketGroupId: string;
    onFilterChange: (ticketGroupId: string) => void;
    availableQuestions: AvailableQuestion[];
    filterQuestionId: string;
    onSetFilterQuestionId: (id: string) => void;
    filterAnswerText: string;
    onSetFilterAnswerText: (text: string) => void;
    filteredAttendees: Attendee[];
    filteredAttendeesCount: number;
    theme: Theme;
}

const DetailsRefreshIndicator: React.FC<{ isRefreshing: boolean }> = ({ isRefreshing }) => {
  if (!isRefreshing) {
    return null;
  }

  return (
    <div className="bg-brand-primary/10 text-brand-primary dark:bg-slate-700/50 dark:text-slate-300 text-sm font-semibold p-3 rounded-lg mb-6 flex items-center justify-center animate-fade-in">
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Refreshing data in the background... The view will update automatically.</span>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
    details, 
    loading,
    isRefreshing,
    attendeePage, 
    onAttendeePageChange, 
    attendeesPerPage, 
    activeSubView, 
    onSetSubView,
    requestAttendeeSort,
    attendeeSortConfig,
    requestTicketGroupSort,
    ticketGroupSortConfig,
    loadingAnalysis,
    onTriggerAnalysis,
    filterTicketGroupId,
    onFilterChange,
    availableQuestions,
    filterQuestionId,
    onSetFilterQuestionId,
    filterAnswerText,
    onSetFilterAnswerText,
    filteredAttendees,
    filteredAttendeesCount,
    theme,
}) => {
  const { event, attendees, ticketGroups, stats, financialSummary, salesByChannel, salesVelocity, revenueBySource, bookingQuestionsAnalysis, allOrders, salesByCity, salesByCountry, allLedgerEntries } = details;
  const { totalTicketsSold, currency } = stats;
  const { setModalView } = useContext(AppContext)!;

  const [idCopied, setIdCopied] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTicketTypesExpanded, setIsTicketTypesExpanded] = useState(false);
  const [geoFilterTicketGroupId, setGeoFilterTicketGroupId] = useState<string>('all');

  const validAttendees = useMemo(() =>
    (details.allAttendees || []).filter(a => ['sold', 'manually_generated', 'door_sale'].includes(a.state)),
    [details.allAttendees]
  );

  const handleCopy = (text: string) => {
    if (idCopied) return;
    navigator.clipboard.writeText(text);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
    }).format(value / 100);
  }

  const handleSelectAttendee = (attendeeId: string) => {
    const attendee = (details.allAttendees || []).find(a => a.id === attendeeId);
    setModalView({
        title: attendee ? attendee.name : 'Attendee Details',
        content: (props) => <AttendeeDetailsView {...props} attendeeId={attendeeId} />
    });
  };

  const TabButton: React.FC<{
    label: string;
    count?: number;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
  }> = ({ label, count, isActive, onClick, icon }) => (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className={`flex items-center whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-primary rounded-t-md ${
        isActive
          ? 'border-brand-primary text-brand-primary'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {typeof count !== 'undefined' && <span className="ml-2 bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">{(count || 0).toLocaleString()}</span>}
    </button>
  );
  
  const numberOfOrders = allOrders?.length ?? 0;
  const averageOrderValue = financialSummary && numberOfOrders > 0 
    ? financialSummary.netRevenue / numberOfOrders 
    : 0;
  
  const hasActiveAttendeeFilter = filterQuestionId || filterAnswerText;

  const editorial = details.event.editorial;
  const descriptionHtml = editorial && typeof editorial === 'object' ? editorial.description_html || editorial.description : null;
  const descriptionText = editorial && typeof editorial === 'object' ? editorial.description : null;
  const isLongDescription = descriptionText && descriptionText.length > 250;
  
  const filteredGeoData = useMemo(() => {
    const createFilteredList = (data: GeographicSaleData[] | undefined) => {
        if (!data) return [];
        if (geoFilterTicketGroupId === 'all') {
            return data.map(item => ({ name: item.name, count: item.totalCount }))
                       .sort((a, b) => b.count - a.count);
        }
        return data
            .map(item => ({ name: item.name, count: item.countByTicketType[geoFilterTicketGroupId] || 0 }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count);
    };
    
    return {
        cities: createFilteredList(salesByCity),
        countries: createFilteredList(salesByCountry),
    };
  }, [salesByCity, salesByCountry, geoFilterTicketGroupId]);
  
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const axisColor = isDarkMode ? '#A0AEC0' : '#4A5568';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                <p className="label text-sm text-slate-600 dark:text-slate-300">{`${payload[0].payload.daysBeforeDeadline} days before deadline`}</p>
                <p className="intro text-slate-900 dark:text-white font-semibold">{`Tickets Sold: ${payload[0].value.toLocaleString()}`}</p>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <DetailsRefreshIndicator isRefreshing={isRefreshing} />
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate" title={event.name}>{event.name}</h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
                      <p className="text-slate-500 dark:text-slate-400">{new Date(event.starts_at).toLocaleString()}</p>
                      <div 
                          className="flex items-center gap-1.5 text-slate-500 cursor-pointer hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                          onClick={() => handleCopy(event.id)}
                          title="Copy Event ID"
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCopy(event.id)}
                      >
                          <CopyIcon />
                          <span className="text-xs font-mono">{idCopied ? 'Copied!' : event.id}</span>
                      </div>
                    </div>
                     <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-slate-500 dark:text-slate-400">
                        {event.organization && typeof event.organization === 'object' && (
                            <div className="flex items-center gap-1.5" title={`Organization: ${event.organization.name}`}>
                                <OrganizationIcon />
                                <span>{event.organization.name}</span>
                            </div>
                        )}
                        {event.venue && typeof event.venue === 'object' && (
                            <div className="flex items-center gap-1.5" title={`Venue: ${event.venue.name}`}>
                                <LocationIcon />
                                <span>{event.venue.name}</span>
                            </div>
                        )}
                         {event.location && typeof event.location === 'object' && (
                            <div className="flex items-center gap-1.5" title={`Location: ${event.location.full_address}`}>
                                <LocationIcon />
                                <span>{event.location.name}</span>
                            </div>
                        )}
                    </div>
                </div>
                <a 
                    href={event.public_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-brand-primary"
                >
                    <ExternalLinkIcon />
                    <span>View on Billetto</span>
                </a>
            </div>
            {(descriptionHtml || (editorial && typeof editorial === 'object' && editorial.tags && editorial.tags.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/50">
                    {descriptionHtml && (
                        <div>
                            <div
                                className={`event-description relative text-sm text-slate-600 dark:text-slate-300 max-w-prose transition-all duration-500 ease-in-out overflow-hidden ${isLongDescription && !isDescriptionExpanded ? 'max-h-24' : 'max-h-[1000px]'}`}
                            >
                                <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                                {isLongDescription && !isDescriptionExpanded && (
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none"></div>
                                )}
                            </div>

                            {isLongDescription && (
                                <button
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="text-sm font-semibold text-brand-primary hover:underline mt-2 focus:outline-none focus:ring-2 focus:ring-brand-primary rounded"
                                    aria-expanded={isDescriptionExpanded}
                                >
                                    {isDescriptionExpanded ? 'Show less' : 'Read more'}
                                </button>
                            )}
                        </div>
                    )}
                    {editorial && typeof editorial === 'object' && editorial.tags && editorial.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {editorial.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Sub-navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto hide-scrollbar">
                <nav className="-mb-px flex" aria-label="Tabs" role="tablist">
                    <TabButton 
                        label="Overview"
                        isActive={activeSubView === 'overview'}
                        onClick={() => onSetSubView('overview')}
                        icon={<CalendarIcon/>}
                    />
                     <TabButton 
                        label="Attendees"
                        count={totalTicketsSold}
                        isActive={activeSubView === 'attendees'}
                        onClick={() => onSetSubView('attendees')}
                        icon={<UserIcon/>}
                    />
                    <TabButton 
                        label="Booking Questions"
                        isActive={activeSubView === 'bookingQuestions'}
                        onClick={() => onSetSubView('bookingQuestions')}
                        icon={<QuestionIcon/>}
                    />
                    <TabButton 
                        label="Check-in Analytics"
                        isActive={activeSubView === 'checkin'}
                        onClick={() => onSetSubView('checkin')}
                        icon={<CheckCircleIcon/>}
                    />
                    <TabButton 
                        label="Marketing"
                        isActive={activeSubView === 'marketing'}
                        onClick={() => onSetSubView('marketing')}
                        icon={<MarketingIcon/>}
                    />
                </nav>
            </div>
        </div>
        
        {activeSubView === 'overview' && (
             <div className="space-y-8 animate-fade-in" role="tabpanel">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {loading && !financialSummary ? (
                        <>
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </>
                    ) : financialSummary ? (
                        <>
                            <StatCard title="Gross Revenue" value={formatCurrency(stats.netRevenue, currency)} icon={<CurrencyIcon />} onClick={() => setModalView({ title: 'Gross Revenue Details', content: (props) => <GrossRevenueDetailTable {...props} orders={allOrders || []} ledgerEntries={allLedgerEntries || []} /> })} />
                            <StatCard title="Billetto Fees" value={formatCurrency(financialSummary.billettoFees, currency)} icon={<FeeIcon />} onClick={() => setModalView({ title: 'Billetto Fees Breakdown', content: (props) => <FeeBreakdownDetails {...props} feeEntries={allLedgerEntries?.filter(e => e.entry_type.includes('FEE')) || []} currency={currency} /> })} />
                            <StatCard title="Total Refunded" value={formatCurrency(Math.abs(financialSummary.totalRefunded || 0), currency)} icon={<RefundIcon />} onClick={() => setModalView({ title: 'Refund Details', content: (props) => <LedgerDetailTable {...props} entries={allLedgerEntries?.filter(e => e.entry_type === 'REFUND') || []} /> })} />
                            <StatCard title="Chargebacks" value={formatCurrency(Math.abs(financialSummary.totalChargebacks || 0), currency)} icon={<ChargebackIcon />} onClick={() => setModalView({ title: 'Chargeback Details', content: (props) => <LedgerDetailTable {...props} entries={allLedgerEntries?.filter(e => e.entry_type === 'CHARGEBACK') || []} /> })} />
                            <StatCard title="Net Payout" value={formatCurrency(financialSummary.netPayout, currency)} icon={<NetPayoutIcon />} onClick={() => setModalView({ title: 'Net Payout Calculation (All Ledger Entries)', content: (props) => <LedgerDetailTable {...props} entries={allLedgerEntries || []} /> })} />
                            <StatCard title="Valid Tickets Sold" value={(totalTicketsSold || 0).toLocaleString()} icon={<TicketIcon />} onClick={() => setModalView({ title: `Valid Attendees (${validAttendees.length})`, content: (props) => <AttendeesDetailTable {...props} attendees={validAttendees} currency={currency} /> })} />
                            <StatCard title="Number of Orders" value={numberOfOrders.toLocaleString()} icon={<LedgerIcon />} onClick={() => setModalView({ title: `All Orders (${(details.allOrders || []).length})`, content: (props) => <OrdersDetailTable {...props} orders={details.allOrders || []} /> })} />
                            <StatCard title="Avg. Order Value" value={formatCurrency(averageOrderValue, currency)} icon={<CalculatorIcon />} onClick={() => setModalView({ title: 'All Orders (for Avg. Value Calculation)', content: (props) => <OrdersDetailTable {...props} orders={details.allOrders || []} /> })} />
                        </>
                    ) : (
                        <>
                            <StatCard title="Valid Tickets Sold" value={(totalTicketsSold || 0).toLocaleString()} icon={<TicketIcon />} />
                            <StatCard title="Status" value={event.state} icon={<CalendarIcon />} />
                            <StatCard title="Available Tickets" value={event.availability?.available?.toLocaleString() ?? 'N/A'} icon={<TicketGroupIcon />} />
                        </>
                    )}
                </div>
                
                {/* Charts and Tables with Skeleton Loading */}
                {loading && !salesVelocity ? (
                    <>
                        <ChartSkeleton />
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            <ChartSkeleton className="lg:col-span-2" />
                            <TableSkeleton className="lg:col-span-3" />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Refund Analysis */}
                        {details.refundAnalysis && details.refundAnalysis.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <ClipboardListIcon />
                                    <span className="ml-2">Refund & Cancellation Analysis</span>
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    This analysis shows the reasons provided for refunded tickets, helping you identify trends. Reasons are attributed on a per-ticket basis.
                                </p>
                                <SimpleBarChart
                                    data={details.refundAnalysis.map(d => ({ text: (d.reason || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), count: d.count }))}
                                    sortBy="value"
                                    colorScheme="red"
                                    showValues={true}
                                    showPercentages={true}
                                />
                            </div>
                        )}
                        
                        {/* Sales Velocity Chart */}
                        {salesVelocity && salesVelocity.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                <SalesVelocityChart data={salesVelocity} theme={theme} campaigns={details.activeCampaigns} />
                            </div>
                        )}
                        
                        {/* Purchase Lead Time Chart */}
                        {details.purchaseLeadTime && details.purchaseLeadTime.some(d => d.tickets > 0) && (
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <CalendarIcon />
                                    <span className="ml-2">Purchase Lead Time</span>
                                </h3>
                                <SimpleBarChart
                                    data={details.purchaseLeadTime.map(d => ({ text: d.name, count: d.tickets }))}
                                    sortBy="none" // Data is pre-sorted
                                    colorScheme="purple"
                                    showValues={true}
                                    showPercentages={true}
                                />
                            </div>
                        )}

                        {/* Bottom row: Sales Channels, Attribution & Ticket Types */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {salesByChannel && salesByChannel.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Sales Channels</h3>
                                    <SalesChannelChart data={salesByChannel} theme={theme} />
                                </div>
                            )}
                            {revenueBySource && revenueBySource.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Revenue Attribution</h3>
                                    <RevenueAttributionChart data={revenueBySource} currency={currency} theme={theme} />
                                </div>
                            )}
                        </div>
                        {ticketGroups && ticketGroups.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg mt-8">
                                <button
                                    className="w-full flex justify-between items-center text-left md:pointer-events-none"
                                    onClick={() => setIsTicketTypesExpanded(prev => !prev)}
                                    aria-expanded={isTicketTypesExpanded}
                                    aria-controls="ticket-types-content"
                                >
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                                        <TicketGroupIcon />
                                        <span className="ml-2">Ticket Types</span>
                                    </h3>
                                    <ChevronDownIcon className={`w-6 h-6 text-slate-500 dark:text-slate-400 transition-transform duration-300 md:hidden ${isTicketTypesExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                <div id="ticket-types-content" className={`${isTicketTypesExpanded ? 'block mt-4' : 'hidden'} md:block md:mt-4`}>
                                    <TicketTypesTable 
                                        ticketGroups={ticketGroups} 
                                        currency={currency} 
                                        requestSort={requestTicketGroupSort}
                                        sortConfig={ticketGroupSortConfig}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {activeSubView === 'attendees' && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg animate-fade-in" role="tabpanel">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Attendees {hasActiveAttendeeFilter 
                            ? `(${(filteredAttendeesCount || 0).toLocaleString()} of ${(stats.totalTicketsSold || 0).toLocaleString()})`
                            : `(${(stats.totalTicketsSold || 0).toLocaleString()})`
                        }
                    </h3>
                    <button
                        onClick={() => exportToCsv(filteredAttendees, `${event.name.replace(/ /g, '_')}_attendees_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        <ExportIcon />
                        Export
                    </button>
                </div>

                <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                    <div className="flex-1 min-w-0">
                        <label htmlFor="question-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter by Question</label>
                        <select
                            id="question-filter"
                            value={filterQuestionId}
                            onChange={(e) => onSetFilterQuestionId(e.target.value)}
                            disabled={availableQuestions.length === 0}
                            className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                        >
                            <option value="">Any Question</option>
                            {availableQuestions.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                        <label htmlFor="answer-filter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Answer Contains</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <SearchIcon />
                            </span>
                            <input
                                type="search"
                                id="answer-filter"
                                placeholder="e.g., Vegetarian"
                                value={filterAnswerText}
                                onChange={(e) => onSetFilterAnswerText(e.target.value)}
                                className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2.5 pl-10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => { onSetFilterQuestionId(''); onSetFilterAnswerText(''); }}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-gray-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        aria-label="Clear filters"
                    >
                        <XCircleIcon />
                        Clear
                    </button>
                </div>

                <AttendeesTable 
                    attendees={attendees} 
                    currency={currency}
                    requestSort={requestAttendeeSort}
                    sortConfig={attendeeSortConfig}
                    onSelectAttendee={handleSelectAttendee}
                    currentPage={attendeePage}
                    itemsPerPage={attendeesPerPage}
                />
                <div className="mt-4">
                    <Pagination
                        currentPage={attendeePage}
                        totalItems={filteredAttendeesCount}
                        itemsPerPage={attendeesPerPage}
                        onPageChange={onAttendeePageChange}
                    />
                </div>
            </div>
        )}

        {activeSubView === 'bookingQuestions' && (
            loadingAnalysis ? <Loader message="Analyzing booking questions..." /> :
            <BookingQuestionsAnalysis 
                details={details} 
                analysis={bookingQuestionsAnalysis} 
                onTriggerAnalysis={onTriggerAnalysis} 
                filterTicketGroupId={filterTicketGroupId}
                onFilterChange={onFilterChange}
            />
        )}

        {activeSubView === 'checkin' && (
            <div className="space-y-8 animate-fade-in" role="tabpanel">
                {loading ? (
                    <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                            <StatCardSkeleton />
                        </div>
                        <ChartSkeleton />
                        <TableSkeleton />
                    </div>
                ) : !details.checkinAnalytics ? (
                    <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 border-dashed border-gray-300 dark:border-slate-700">
                        <div className="flex justify-center mb-4 text-slate-400 dark:text-slate-500"><CheckCircleIcon /></div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No Check-in Data Found</h3>
                        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">Scanning data is required for this analysis. Ensure you are scanning tickets at your event to see arrival patterns and scanning issues.</p>
                    </div>
                ) : (
                    (() => {
                        const analytics = details.checkinAnalytics;
                        const totalScans = analytics.totalAcceptedScans + analytics.totalRejectedScans;
                        const rejectionRate = totalScans > 0 ? (analytics.totalRejectedScans / totalScans) * 100 : 0;
                        
                        return (
                            <>
                                {/* Stat Cards */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard title="Accepted Scans" value={analytics.totalAcceptedScans.toLocaleString()} icon={<CheckCircleIcon />} />
                                    <StatCard title="Rejected Scans" value={analytics.totalRejectedScans.toLocaleString()} icon={<XCircleIcon />} />
                                    <StatCard title="Rejection Rate" value={`${rejectionRate.toFixed(1)}%`} icon={<FeeIcon />} />
                                    <StatCard title="Peak Arrival" value={analytics.peakTime || 'N/A'} icon={<CalendarIcon />} />
                                </div>
                                
                                {/* Arrival Chart */}
                                {analytics.arrivalData.length > 0 ? (
                                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Arrival Times (Scans per 15 min)</h3>
                                        <SimpleBarChart 
                                            data={analytics.arrivalData.map(d => ({ text: d.time, count: d.count }))} 
                                            sortBy="none" 
                                            colorScheme="green"
                                            showValues={true}
                                        />
                                    </div>
                                ) : null}
        
                                {/* Rejected Scans Table */}
                                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Rejected Scans Log</h3>
                                    {analytics.rejectedScans.length > 0 ? (
                                        <div className="overflow-x-auto max-h-96">
                                            <table className="min-w-full responsive-table">
                                                <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                                                    <tr>
                                                        <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Time</th>
                                                        <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Attendee</th>
                                                        <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Message</th>
                                                        <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Scanner</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700">
                                                    {analytics.rejectedScans.slice(0, 50).map((scan, index) => (
                                                        <tr key={index}>
                                                            <td data-label="Time" className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{scan.time}</td>
                                                            <td data-label="Attendee" className="py-2 px-4 text-sm font-medium text-slate-900 dark:text-white">{scan.attendeeName}</td>
                                                            <td data-label="Message" className="py-2 px-4 text-sm text-red-500 dark:text-red-400">{scan.message}</td>
                                                            <td data-label="Scanner" className="py-2 px-4 text-sm text-slate-500 dark:text-slate-400">{scan.scannerName || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {analytics.rejectedScans.length > 50 && <p className="text-xs text-center text-slate-500 pt-2">Showing first 50 rejected scans.</p>}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-400 text-center py-8">No rejected scans recorded.</p>
                                    )}
                                </div>
                            </>
                        );
                    })()
                )}
            </div>
        )}

        {activeSubView === 'marketing' && (
            <div className="space-y-8 animate-fade-in" role="tabpanel">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard 
                        title="Newsletter Opt-in Rate" 
                        value={`${(stats.newsletterOptInRate || 0).toFixed(1)}%`}
                        icon={<NewsletterIcon />} 
                    />
                </div>

                {details.groupPurchaseAnalysis && details.groupPurchaseAnalysis.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <TargetGroupIcon />
                            <span className="ml-2">"Bring-a-Friend" Index</span>
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            This chart shows the number of orders based on how many admission tickets were purchased together. A high number of orders with 2+ tickets suggests strong social attendance.
                        </p>
                        <SimpleBarChart
                            data={details.groupPurchaseAnalysis}
                            sortBy="none"
                            colorScheme="purple"
                            showValues={true}
                            showPercentages={true}
                        />
                    </div>
                )}

                {details.addonAffinity && details.addonAffinity.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <PuzzleIcon />
                            <span className="ml-2">Add-on & Merchandise Affinity</span>
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            See which add-ons are most popular with buyers of specific admission tickets. Use these insights for targeted upselling opportunities.
                        </p>
                        <div className="space-y-6">
                            {details.addonAffinity.map(affinity => (
                                <div key={affinity.admissionTicketName} className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700/50">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{affinity.admissionTicketName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Total Sold: {affinity.totalAdmissionTicketsSold.toLocaleString()}</p>
                                    <ul className="space-y-3">
                                        {affinity.topAddons.map(addon => (
                                            <li key={addon.addonName}>
                                                <div className="flex justify-between items-center text-sm mb-1 flex-wrap gap-x-2">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{addon.addonName}</span>
                                                    <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{addon.purchaseCount.toLocaleString()} purchases ({addon.affinity.toFixed(1)}% affinity)</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${addon.affinity}%` }}></div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {details.deadlineUrgency && details.deadlineUrgency.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <ClockIcon />
                            <span className="ml-2">"Deadline Urgency" Impact</span>
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            This analysis tracks sales for ticket types with a specific sales deadline. Spikes in the final days indicate effective "last chance" marketing.
                        </p>
                        <div className="space-y-8">
                            {details.deadlineUrgency.map(item => (
                                <div key={item.ticketTypeName}>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.ticketTypeName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Sales ended {new Date(item.sellsToDate).toLocaleDateString()}. Total in last 8 days: {item.totalTicketsInWindow.toLocaleString()}
                                    </p>
                                    <div className="w-full h-48">
                                        <ResponsiveContainer>
                                            <LineChart data={item.salesData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                                <XAxis 
                                                    dataKey="daysBeforeDeadline"
                                                    stroke={axisColor}
                                                    tick={{ fontSize: 10 }}
                                                    label={{ value: 'Days Before Deadline', position: 'insideBottom', offset: -15, fill: axisColor, fontSize: 12 }}
                                                    reversed={true}
                                                />
                                                <YAxis 
                                                    stroke={axisColor}
                                                    allowDecimals={false}
                                                    tick={{ fontSize: 10 }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="ticketsSold" 
                                                    name="Tickets Sold"
                                                    stroke="#ED8936" // orange color
                                                    strokeWidth={2} 
                                                    dot={{ r: 3 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                            <GlobeIcon />
                            <span className="ml-2">Geographic Hotspots</span>
                        </h3>
                        <select
                            id="geo-ticket-type-filter"
                            value={geoFilterTicketGroupId}
                            onChange={(e) => setGeoFilterTicketGroupId(e.target.value)}
                            disabled={ticketGroups.length === 0}
                            className="ml-auto bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                            aria-label="Filter geographic data by ticket type"
                        >
                            <option value="all">All Ticket Types</option>
                            {ticketGroups.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Sales by Country</h3>
                            {(!filteredGeoData.countries || filteredGeoData.countries.length === 0) ? (
                                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No location data available for this selection.</p>
                            ) : (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                                            <tr>
                                                <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Country</th>
                                                <th className="py-2 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Tickets Sold</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                            {filteredGeoData.countries.map(c => (
                                                <tr key={c.name}>
                                                    <td className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300">{c.name}</td>
                                                    <td className="py-2 px-4 text-sm text-slate-900 dark:text-white font-medium text-right">{c.count.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Top 10 Cities by Sales</h3>
                            {(!filteredGeoData.cities || filteredGeoData.cities.length === 0) ? (
                                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No city data available for this selection.</p>
                            ) : (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                                            <tr>
                                                <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">City</th>
                                                <th className="py-2 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Tickets Sold</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                            {filteredGeoData.cities.slice(0, 10).map(c => (
                                                <tr key={c.name}>
                                                    <td className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300">{c.name}</td>
                                                    <td className="py-2 px-4 text-sm text-slate-900 dark:text-white font-medium text-right">{c.count.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;