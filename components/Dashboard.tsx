
import React, { useState } from 'react';
import { EventDetails, Attendee, TicketGroup, SortConfig, AvailableQuestion } from '../types';
import StatCard from './StatCard';
import AttendeesTable from './EventsTable';
import Pagination from './Pagination';
import TicketTypesTable from './TicketTypesTable';
import { CalendarIcon, TicketIcon, CurrencyIcon, TicketGroupIcon, UserIcon, FeeIcon, NetPayoutIcon, ExternalLinkIcon, QuestionIcon, CopyIcon, LedgerIcon, CalculatorIcon, MarketingIcon, NewsletterIcon, GlobeIcon, SearchIcon, XCircleIcon, RefundIcon, ChargebackIcon, OrganizationIcon, LocationIcon } from './icons';
import SalesVelocityChart from './SalesVelocityChart';
import SalesChannelChart from './SalesChannelChart';
import RevenueAttributionChart from './RevenueAttributionChart';
import BookingQuestionsAnalysis from './BookingQuestionsAnalysis';
import Loader from './Loader';
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from './Skeleton';
import DetailsModal from './DetailsModal';
import LedgerDetailTable from './modal_tables/LedgerDetailTable';
import OrdersDetailTable from './modal_tables/OrdersDetailTable';
import AttendeesDetailTable from './modal_tables/AttendeesDetailTable';
import { Theme } from '../../App';
import FeeBreakdownDetails from './FeeBreakdownDetails';


interface DashboardProps {
    details: EventDetails;
    loading: boolean;
    attendeePage: number;
    attendeesPerPage: number;
    onAttendeePageChange: (page: number) => void;
    activeSubView: 'overview' | 'attendees' | 'bookingQuestions' | 'marketing';
    onSetSubView: (view: 'overview' | 'attendees' | 'bookingQuestions' | 'marketing') => void;
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
    filteredAttendeesCount: number;
    theme: Theme;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    details, 
    loading,
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
    filteredAttendeesCount,
    theme,
}) => {
  const { event, attendees, ticketGroups, stats, financialSummary, salesByChannel, salesVelocity, revenueBySource, bookingQuestionsAnalysis, allOrders, salesByCity, salesByCountry, allLedgerEntries } = details;
  const { totalTicketsSold, currency } = stats;

  const [idCopied, setIdCopied] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
    ? financialSummary.grossRevenue / numberOfOrders 
    : 0;
  
  const hasActiveAttendeeFilter = filterQuestionId || filterAnswerText;

  const editorial = details.event.editorial;
  const descriptionHtml = editorial && typeof editorial === 'object' ? editorial.description_html || editorial.description : null;
  const descriptionText = editorial && typeof editorial === 'object' ? editorial.description : null;
  const isLongDescription = descriptionText && descriptionText.length > 250;

  return (
    <div className="space-y-6 animate-fade-in">
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
            <nav className="-mb-px flex space-x-2" aria-label="Tabs" role="tablist">
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
                    label="Marketing"
                    isActive={activeSubView === 'marketing'}
                    onClick={() => onSetSubView('marketing')}
                    icon={<MarketingIcon/>}
                />
            </nav>
        </div>
        
        {activeSubView === 'overview' && (
             <div className="space-y-8 animate-fade-in" role="tabpanel">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {loading ? (
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
                            <StatCard title="Gross Revenue" value={formatCurrency(financialSummary.grossRevenue, currency)} icon={<CurrencyIcon />} onClick={() => setModalContent({ title: 'Gross Revenue Details', content: <LedgerDetailTable entries={allLedgerEntries?.filter(e => e.entry_type === 'ORDER_REVENUE') || []} /> })} />
                            <StatCard title="Billetto Fees" value={formatCurrency(financialSummary.billettoFees, currency)} icon={<FeeIcon />} onClick={() => setModalContent({ title: 'Billetto Fees Breakdown', content: <FeeBreakdownDetails feeEntries={allLedgerEntries?.filter(e => e.entry_type.includes('FEE')) || []} currency={currency} /> })} />
                            <StatCard title="Total Refunded" value={formatCurrency(Math.abs(financialSummary.totalRefunded || 0), currency)} icon={<RefundIcon />} onClick={() => setModalContent({ title: 'Refund Details', content: <LedgerDetailTable entries={allLedgerEntries?.filter(e => e.entry_type === 'REFUND') || []} /> })} />
                            <StatCard title="Chargebacks" value={formatCurrency(Math.abs(financialSummary.totalChargebacks || 0), currency)} icon={<ChargebackIcon />} onClick={() => setModalContent({ title: 'Chargeback Details', content: <LedgerDetailTable entries={allLedgerEntries?.filter(e => e.entry_type === 'CHARGEBACK') || []} /> })} />
                            <StatCard title="Net Payout" value={formatCurrency(financialSummary.netPayout, currency)} icon={<NetPayoutIcon />} onClick={() => setModalContent({ title: 'Net Payout Calculation (All Ledger Entries)', content: <LedgerDetailTable entries={allLedgerEntries || []} /> })} />
                            <StatCard title="Total Tickets Sold" value={(totalTicketsSold || 0).toLocaleString()} icon={<TicketIcon />} onClick={() => setModalContent({ title: `All Attendees (${(details.allAttendees || []).length})`, content: <AttendeesDetailTable attendees={details.allAttendees || []} currency={currency} /> })} />
                            <StatCard title="Number of Orders" value={numberOfOrders.toLocaleString()} icon={<LedgerIcon />} onClick={() => setModalContent({ title: `All Orders (${(details.allOrders || []).length})`, content: <OrdersDetailTable orders={details.allOrders || []} /> })} />
                            <StatCard title="Avg. Order Value" value={formatCurrency(averageOrderValue, currency)} icon={<CalculatorIcon />} onClick={() => setModalContent({ title: 'All Orders (for Avg. Value Calculation)', content: <OrdersDetailTable orders={details.allOrders || []} /> })} />
                        </>
                    ) : (
                        <>
                            <StatCard title="Total Tickets Sold" value={(totalTicketsSold || 0).toLocaleString()} icon={<TicketIcon />} />
                            <StatCard title="Status" value={event.state} icon={<CalendarIcon />} />
                            <StatCard title="Available Tickets" value={event.availability?.available?.toLocaleString() ?? 'N/A'} icon={<TicketGroupIcon />} />
                        </>
                    )}
                </div>
                
                {/* Charts and Tables with Skeleton Loading */}
                {loading ? (
                    <>
                        <ChartSkeleton />
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            <ChartSkeleton className="lg:col-span-2" />
                            <TableSkeleton className="lg:col-span-3" />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Sales Velocity Chart */}
                        {salesVelocity && salesVelocity.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Sales Velocity</h3>
                                <SalesVelocityChart data={salesVelocity} theme={theme} />
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
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                                    <TicketGroupIcon />
                                    <span className="ml-2">Ticket Types</span>
                                </h3>
                                <TicketTypesTable 
                                    ticketGroups={ticketGroups} 
                                    currency={currency} 
                                    requestSort={requestTicketGroupSort}
                                    sortConfig={ticketGroupSortConfig}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {activeSubView === 'attendees' && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg animate-fade-in" role="tabpanel">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    Attendees {hasActiveAttendeeFilter 
                        ? `(${(filteredAttendeesCount || 0).toLocaleString()} of ${(stats.totalTicketsSold || 0).toLocaleString()})`
                        : `(${(stats.totalTicketsSold || 0).toLocaleString()})`
                    }
                </h3>

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

        {activeSubView === 'marketing' && (
            <div className="space-y-8 animate-fade-in" role="tabpanel">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard 
                        title="Newsletter Opt-in Rate" 
                        value={`${(stats.newsletterOptInRate || 0).toFixed(1)}%`}
                        icon={<NewsletterIcon />} 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <GlobeIcon />
                            <span className="ml-2">Sales by Country</span>
                        </h3>
                        {(!salesByCountry || salesByCountry.length === 0) ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No location data available for this event.</p>
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
                                    {salesByCountry.map(c => (
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
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                            <GlobeIcon />
                            <span className="ml-2">Top 10 Cities by Sales</span>
                        </h3>
                         {(!salesByCity || salesByCity.length === 0) ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No city data available for this event.</p>
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
                                    {salesByCity.slice(0, 10).map(c => (
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
        )}
        {modalContent && (
            <DetailsModal title={modalContent.title} onClose={() => setModalContent(null)}>
                {modalContent.content}
            </DetailsModal>
        )}
    </div>
  );
};

export default Dashboard;