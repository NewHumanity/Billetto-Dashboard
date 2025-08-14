
import React from 'react';
import { Attendee, SortConfig } from '../types';

interface AttendeesTableProps {
  attendees: Attendee[];
  currency: string;
  requestSort: (key: keyof Attendee | string) => void;
  sortConfig: SortConfig<Attendee> | null;
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

const AttendeesTable: React.FC<AttendeesTableProps> = ({ attendees, currency, requestSort, sortConfig }) => {
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100); // Value is in cents
  }

  const statusColorMap: { [key: string]: string } = {
    sold: 'bg-green-500/20 text-green-400',
    refunded: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    reserved: 'bg-blue-500/20 text-blue-400',
    default: 'bg-slate-500/20 text-slate-400'
  };
  
  const SortableHeader: React.FC<{ title: string, sortKey: keyof Attendee}> = ({ title, sortKey }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-slate-700 responsive-table">
        <thead className="bg-slate-800/80">
          <tr>
            <SortableHeader title="Name" sortKey="name" />
            <SortableHeader title="Email" sortKey="email" />
            <SortableHeader title="Status" sortKey="state" />
            <SortableHeader title="Price" sortKey="price" />
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-slate-700 bg-slate-800/50">
          {attendees.map((attendee) => (
            <tr key={attendee.id} className="md:hover:bg-slate-700/50 transition-colors">
              <td data-label="Name" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-white">
                {attendee.name}
              </td>
              <td data-label="Email" className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{attendee.email}</td>
              <td data-label="Status" className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[attendee.state] || statusColorMap.default}`}>
                    {(attendee.state || '').replace(/_/g, ' ')}
                </span>
              </td>
              <td data-label="Price" className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">
                {formatCurrency(attendee.price, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendeesTable;
