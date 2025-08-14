
import React from 'react';
import { BillettoEvent, Attendee } from '../types';
import StatCard from './StatCard';
import AttendeesTable from './EventsTable';
import Pagination from './Pagination';
import { CalendarIcon, TicketIcon, CurrencyIcon } from './icons';

interface DashboardProps {
    details: {
        event: BillettoEvent;
        attendees: Attendee[];
        stats: {
            totalRevenue: number;
            totalTicketsSold: number;
            currency: string;
        };
    };
    attendeePage: number;
    attendeesPerPage: number;
    onAttendeePageChange: (page: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ details, attendeePage, onAttendeePageChange, attendeesPerPage }) => {
  const { event, attendees, stats } = details;
  const { totalRevenue, totalTicketsSold, currency } = stats;

  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(totalRevenue);

  return (
    <div className="space-y-8 animate-fade-in">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-3xl font-bold text-white tracking-tight">{event.name}</h2>
            <p className="text-slate-400 mt-1">{new Date(event.starts_at).toLocaleString()}</p>
        </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Revenue" 
          value={formattedRevenue} 
          icon={<CurrencyIcon />} 
        />
        <StatCard 
          title="Total Tickets Sold" 
          value={totalTicketsSold.toLocaleString()} 
          icon={<TicketIcon />} 
        />
         <StatCard 
          title="Status" 
          value={event.state} 
          icon={<CalendarIcon />} 
        />
      </div>
      
      {/* Attendees Table */}
      <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
         <h3 className="text-xl font-semibold text-white mb-4">Attendees ({stats.totalTicketsSold})</h3>
        <AttendeesTable attendees={attendees} currency={currency} />
        <div className="mt-4">
            <Pagination
                currentPage={attendeePage}
                totalItems={stats.totalTicketsSold}
                itemsPerPage={attendeesPerPage}
                onPageChange={onAttendeePageChange}
            />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
