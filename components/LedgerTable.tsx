

import React from 'react';
import { LedgerEntry, SortConfig } from '../types';

interface LedgerTableProps {
  entries: LedgerEntry[];
  requestSort: (key: keyof LedgerEntry | string) => void;
  sortConfig: SortConfig<LedgerEntry> | null;
  onSelectOrder: (orderId: string) => void;
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

const LedgerTable: React.FC<LedgerTableProps> = ({ entries, requestSort, sortConfig, onSelectOrder }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const typeColorMap: { [key: string]: string } = {
    charge: 'text-green-400',
    refund: 'text-yellow-400',
    payout: 'text-blue-400',
    fee: 'text-red-400',
    adjustment: 'text-purple-400',
    other: 'text-slate-400',
  };

  const SortableHeader: React.FC<{ title: string, sortKey: keyof LedgerEntry | string, className?: string }> = ({ title, sortKey, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-white ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`flex items-center gap-2 group ${className.includes('text-right') ? 'justify-end w-full' : ''}`}>
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (entries.length === 0) {
    return <p className="text-slate-400 text-center py-8">No ledger entries found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Date" sortKey="created_at" />
            <SortableHeader title="Type" sortKey="type" />
            <SortableHeader title="Description" sortKey="description" />
            <SortableHeader title="Event" sortKey="event.name" />
            <SortableHeader title="Amount" sortKey="amount" className="text-right"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {entries.map((entry) => {
            const isClickable = !!entry.order_id;
            return (
                <tr 
                  key={entry.id}
                  className={`transition-colors ${isClickable ? 'cursor-pointer hover:bg-slate-700/50' : 'hover:bg-slate-700/20'}`}
                  onClick={() => isClickable && entry.order_id && onSelectOrder(entry.order_id)}
                  onKeyPress={(e) => isClickable && entry.order_id && (e.key === 'Enter' || e.key === ' ') && onSelectOrder(entry.order_id)}
                  tabIndex={isClickable ? 0 : -1}
                  aria-label={isClickable ? `View details for order related to this ledger entry` : undefined}
                >
                    <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{formatDate(entry.created_at)}</td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm font-medium">
                        <span className={`capitalize ${typeColorMap[entry.type] || typeColorMap.other}`}>
                        {(entry.type || '').replace('_', ' ')}
                        </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-white max-w-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{entry.description}</span>
                        {isClickable && (
                           <span className="flex-shrink-0 text-xs font-semibold text-brand-primary/80 hover:text-brand-primary">[View Order]</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300 truncate max-w-xs">{entry.event?.name || 'N/A'}</td>
                    <td className={`whitespace-nowrap py-4 px-4 text-sm text-right font-semibold ${entry.amount > 0 ? 'text-green-400' : entry.amount < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                        {formatCurrency(entry.amount, entry.currency)}
                    </td>
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;