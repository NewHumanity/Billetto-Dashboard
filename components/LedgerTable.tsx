import React, { useRef } from 'react';
import { LedgerEntry, SortConfig } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';

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
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Estimated row height (slightly taller due to transaction types)
    overscan: 10,
  });
    
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
    ORDER_REVENUE: 'text-green-600 dark:text-green-400',
    REFUND: 'text-yellow-600 dark:text-yellow-400',
    PAYOUT: 'text-blue-600 dark:text-blue-400',
    IMMEDIATE_PAYOUT: 'text-blue-600 dark:text-blue-400',
    IMMEDIATE_PAYOUT_WITHDRAWAL: 'text-blue-600 dark:text-blue-400',
    ORGANIZER_PAYMENT_FEE: 'text-red-600 dark:text-red-400',
    TICKETS_FEE: 'text-red-600 dark:text-red-400',
    PROMOTION_FEE: 'text-red-600 dark:text-red-400',
    INVOICE_FEE: 'text-red-600 dark:text-red-400',
    CHARGEBACK: 'text-red-700 dark:text-red-500 font-bold',
    default: 'text-slate-600 dark:text-slate-400',
  };

  const transactionTypeColorMap: { [key: string]: string } = {
    PAYMENT: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    REFUND: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    CANCELLATION: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    FAILED: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    default: 'bg-slate-100 dark:bg-slate-600/20 text-slate-600 dark:text-slate-400',
  };

  const formatEntryType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const SortableHeader: React.FC<{ title: string, sortKey: keyof LedgerEntry | string, className?: string }> = ({ title, sortKey, className = '' }) => {
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

  if (entries.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No ledger entries found.</p>;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div ref={parentRef} className="overflow-y-auto max-h-[70vh] border border-gray-200 dark:border-slate-700 rounded-lg">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm">
          <tr>
            <SortableHeader title="Date" sortKey="created_at" />
            <SortableHeader title="Details" sortKey="entry_type" />
            <SortableHeader title="Event" sortKey="event.name" />
            <SortableHeader title="VAT" sortKey="vat" className="text-right" />
            <SortableHeader title="Amount" sortKey="amount" className="text-right"/>
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const entry = entries[virtualRow.index];
            const isClickable = !!entry.order_id;
            return (
                <tr 
                  key={entry.id}
                  className={`transition-colors ${isClickable ? 'cursor-pointer md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50' : 'md:hover:bg-gray-50 dark:md:hover:bg-slate-700/20'}`}
                  onClick={() => isClickable && entry.order_id && onSelectOrder(String(entry.order_id))}
                  onKeyPress={(e) => isClickable && entry.order_id && (e.key === 'Enter' || e.key === ' ') && onSelectOrder(String(entry.order_id))}
                  tabIndex={isClickable ? 0 : -1}
                  aria-label={isClickable ? `View details for order related to this ledger entry` : undefined}
                >
                    <td data-label="Date" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.created_at)}</td>
                    <td data-label="Details" className="py-4 px-4 text-sm font-medium">
                        <div className="flex items-center justify-between gap-2">
                           <div>
                             <p className={`font-semibold ${typeColorMap[entry.entry_type] || typeColorMap.default}`}>
                                {formatEntryType(entry.entry_type)}
                             </p>
                             <div className="flex items-center gap-2 flex-wrap mt-1">
                                {entry.transaction_type && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${transactionTypeColorMap[entry.transaction_type] || transactionTypeColorMap.default}`}>
                                    {entry.transaction_type.toLowerCase().replace(/_/g, ' ')}
                                  </span>
                                )}
                                {entry.source && <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{entry.source}</p>}
                             </div>
                           </div>
                           {isClickable && (
                              <span className="flex-shrink-0 text-xs font-semibold text-brand-primary/90 dark:text-brand-primary/80 hover:text-brand-primary">[View Order]</span>
                           )}
                        </div>
                    </td>
                    <td data-label="Event" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300 truncate max-w-xs">{entry.event?.name || 'N/A'}</td>
                    <td data-label="VAT" className={`whitespace-nowrap py-4 px-4 text-sm font-semibold text-slate-500 dark:text-slate-400`}>
                        {formatCurrency(entry.vat, entry.currency)}
                    </td>
                    <td data-label="Amount" className={`whitespace-nowrap py-4 px-4 text-sm font-semibold ${entry.amount > 0 ? 'text-green-600 dark:text-green-400' : entry.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-300'}`}>
                        {formatCurrency(entry.amount, entry.currency)}
                    </td>
                </tr>
            )
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;