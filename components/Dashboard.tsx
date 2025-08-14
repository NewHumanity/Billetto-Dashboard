import React from 'react';
import { EventDetails, Attendee, TicketGroup, SortConfig } from '../types';
import StatCard from './StatCard';
import AttendeesTable from './EventsTable';
import Pagination from './Pagination';
import TicketTypesTable from './TicketTypesTable';
import { CalendarIcon, TicketIcon, CurrencyIcon, TicketGroupIcon, UserIcon, FeeIcon, NetPayoutIcon, ExternalLinkIcon, QuestionIcon } from './icons';
import SalesVelocityChart from './SalesVelocityChart';
import SalesChannelChart from './SalesChannelChart';
import BookingQuestionsAnalysis from './BookingQuestionsAnalysis';
import Loader from './Loader';


interface DashboardProps {
    details: EventDetails;
    attendeePage: number;
    attendeesPerPage: number;
    onAttendeePageChange: (page: number) => void;
    activeSubView: 'overview' | 'attendees' | 'bookingQuestions';
    onSetSubView: (view: 'overview' | 'attendees' | 'bookingQuestions') => void;
    requestAttendeeSort: (key: keyof Attendee | string) => void;
    attendeeSortConfig: SortConfig<Attendee> | null;
    requestTicketGroupSort: (key: keyof TicketGroup | string) => void;
    ticketGroupSortConfig: SortConfig<TicketGroup> | null;
    loadingAnalysis: boolean;
    onTriggerAnalysis: (force: boolean) => void;
    filterTicketGroupId: string;
    onFilterChange: (ticketGroupId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    details, 
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
}) => {
  const { event, attendees, ticketGroups, stats, financialSummary, salesByChannel, salesVelocity, bookingQuestionsAnalysis } = details;
  const { totalTicketsSold, currency } = stats;

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
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
      {typeof count !== 'undefined' && <span className="ml-2 bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">{(count || 0).toLocaleString()}</span>}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{event.name}</h2>
                    <p className="text-slate-400 mt-1">{new Date(event.starts_at).toLocaleString()}</p>
                </div>
                <a 
                    href={event.public_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary"
                >
                    <ExternalLinkIcon />
                    <span>View on Billetto</span>
                </a>
            </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="border-b border-slate-700">
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
            </nav>
        </div>
        
        {activeSubView === 'overview' && (
             <div className="space-y-8 animate-fade-in" role="tabpanel">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {financialSummary ? (
                        <>
                            <StatCard title="Gross Revenue" value={formatCurrency(financialSummary.grossRevenue, currency)} icon={<CurrencyIcon />} />
                            <StatCard title="Billetto Fees" value={formatCurrency(financialSummary.billettoFees, currency)} icon={<FeeIcon />} />
                            <StatCard title="Net Payout" value={formatCurrency(financialSummary.netPayout, currency)} icon={<NetPayoutIcon />} />
                        </>
                    ) : (
                        <>
                            <StatCard title="Total Tickets Sold" value={(totalTicketsSold || 0).toLocaleString()} icon={<TicketIcon />} />
                            <StatCard title="Status" value={event.state} icon={<CalendarIcon />} />
                        </>
                    )}
                </div>

                {/* Sales Velocity Chart */}
                {salesVelocity && salesVelocity.length > 0 && (
                     <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold text-white mb-4">Sales Velocity</h3>
                        <SalesVelocityChart data={salesVelocity} />
                    </div>
                )}
                
                {/* Bottom row: Sales Channels & Ticket Types */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {salesByChannel && salesByChannel.length > 0 && (
                        <div className="lg:col-span-2 bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                            <h3 className="text-xl font-semibold text-white mb-4">Sales Channels</h3>
                            <SalesChannelChart data={salesByChannel} />
                        </div>
                    )}
                    {ticketGroups && ticketGroups.length > 0 && (
                        <div className={`lg:col-span-${(salesByChannel && salesByChannel.length > 0) ? '3' : '5'} bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg`}>
                            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
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
                </div>
            </div>
        )}

        {activeSubView === 'attendees' && (
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg animate-fade-in" role="tabpanel">
                <h3 className="text-xl font-semibold text-white mb-4">Attendees ({(stats.totalTicketsSold || 0).toLocaleString()})</h3>
                <AttendeesTable 
                    attendees={attendees} 
                    currency={currency}
                    requestSort={requestAttendeeSort}
                    sortConfig={attendeeSortConfig}
                />
                <div className="mt-4">
                    <Pagination
                        currentPage={attendeePage}
                        totalItems={stats.totalTicketsSold}
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
    </div>
  );
};

export default Dashboard;