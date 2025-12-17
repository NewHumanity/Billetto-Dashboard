
import React from 'react';
import { AnalyzedEvent, SortConfig } from '../types';

interface PerformanceTableProps {
  analyzedEvents: AnalyzedEvent[];
  requestSort: (key: keyof AnalyzedEvent | string) => void;
  sortConfig: SortConfig<AnalyzedEvent> | null;
  onSelectEvent: (eventId: string) => void;
  currentPage: number;
  itemsPerPage: number;
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

const PerformanceTable: React.FC<PerformanceTableProps> = ({ analyzedEvents, requestSort, sortConfig, onSelectEvent, currentPage, itemsPerPage }) => {
    
  const formatCurrency = (value: number | undefined, currencyCode: string | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (!currencyCode || currencyCode === 'N/A') {
        return (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value / 100);
    } catch (e) {
        return `${(value / 100).toFixed(2)} ${currencyCode}`;
    }
  };
  
  const SortableHeader: React.FC<{ title: string, sortKey: keyof AnalyzedEvent | string, className?: string }> = ({ title, sortKey, className = '' }) => {
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3.5 px-4 text-left text-sm font-semibold text-slate-900 dark:text-white">#</th>
            <SortableHeader title="Event" sortKey="name" />
            <SortableHeader title="Tickets Sold" sortKey="ticketCount" className="text-right"/>
            <SortableHeader title="Gross Revenue" sortKey="grossRevenue" className="text-right"/>
            <SortableHeader title="Total Costs" sortKey="totalFees" className="text-right"/>
            <SortableHeader title="Net Profit" sortKey="netProfit" className="text-right"/>
            <SortableHeader title="Profit Margin" sortKey="profitMargin" className="text-right"/>
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {analyzedEvents.map((event, index) => {
            const totalCosts = event.totalFees + event.totalRefundsAndChargebacks;
            const rank = (currentPage - 1) * itemsPerPage + index + 1;
            return (
                <tr 
                  key={event.id} 
                  className="md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
                  onClick={() => onSelectEvent(event.id)}
                  tabIndex={0}
                  onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectEvent(event.id)}
                  aria-label={`View dashboard for ${event.name}`}
                >
                    <td data-label="#" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">{rank}</td>
                    <td data-label="Event" className="py-4 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{event.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'N/A'}</p>
                    </td>
                    <td data-label="Tickets Sold" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-slate-900 dark:text-white">{event.ticketCount.toLocaleString()}</td>
                    <td data-label="Gross Revenue" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{formatCurrency(event.grossRevenue, event.currency)}</td>
                    <td data-label="Total Costs" className="whitespace-nowrap py-4 px-4 text-sm text-red-600 dark:text-red-400">{formatCurrency(totalCosts, event.currency)}</td>
                    <td data-label="Net Profit" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(event.netProfit, event.currency)}</td>
                    <td data-label="Profit Margin" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{event.profitMargin.toFixed(1)}%</td>
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceTable;
