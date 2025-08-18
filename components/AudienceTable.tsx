import React from 'react';
import { AudienceMember, SortConfig } from '../types';
import { CalendarIcon, CurrencyIcon, TicketIcon, UserIcon } from './icons';

interface AudienceTableProps {
  audienceMembers: AudienceMember[];
  requestSort: (key: keyof AudienceMember | string) => void;
  sortConfig: SortConfig<AudienceMember> | null;
  onSelectCustomer: (customerId: string) => void;
}

const SortIndicator = ({ direction }: { direction?: 'ascending' | 'descending' }) => {
    const iconClass = "h-4 w-4 transition-opacity";
    if (!direction) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={`${iconClass} text-slate-500 opacity-50 group-hover:opacity-100`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (direction === 'ascending') {
        return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
};

const AudienceTable: React.FC<AudienceTableProps> = ({ audienceMembers, requestSort, sortConfig, onSelectCustomer }) => {
    
  const formatCurrency = (value: number | undefined, currencyCode: string | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (!currencyCode || currencyCode === 'N/A') {
        return (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(value / 100);
    } catch (e) {
        return `${(value / 100).toFixed(2)} ${currencyCode}`;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const SortableHeader: React.FC<{ title: string, sortKey: keyof AudienceMember | string, className?: string }> = ({ title, sortKey, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-slate-900 dark:text-white ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`flex items-center gap-2 group ${className.includes('text-right') ? 'justify-end w-full' : ''}`}>
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (audienceMembers.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No audience data found. Try refreshing the analysis.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Customer" sortKey="name" />
            <SortableHeader title="Total Spent (CLV)" sortKey="totalSpent" className="text-right" />
            <SortableHeader title="Events Attended" sortKey="eventsAttended" className="text-right"/>
            <SortableHeader title="Last Attended" sortKey="lastAttendedDate" />
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {audienceMembers.map((member) => (
            <tr 
              key={member.id} 
              className="md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
              onClick={() => onSelectCustomer(member.id)}
              tabIndex={0}
              onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectCustomer(member.id)}
              aria-label={`View details for ${member.name}`}
            >
              <td data-label="Customer" className="py-4 px-4">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{member.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
              </td>
              <td data-label="Total Spent" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(member.totalSpent, member.currency)}
              </td>
              <td data-label="Events Attended" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-slate-900 dark:text-white">{member.eventsAttended.toLocaleString()}</td>
              <td data-label="Last Attended" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(member.lastAttendedDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AudienceTable;