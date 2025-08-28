

import React from 'react';
import { TicketGroup, SortConfig } from '../types';

interface TicketTypesTableProps {
  ticketGroups: TicketGroup[];
  currency: string;
  requestSort: (key: keyof TicketGroup | string) => void;
  sortConfig: SortConfig<TicketGroup> | null;
}

const SalesProgress: React.FC<{ sold: number; quantity: number | null }> = ({ sold, quantity }) => {
  if (quantity === null || quantity === 0) {
    return (
      <div className="flex items-center">
        <span className="text-sm text-slate-600 dark:text-slate-300 w-24 text-left">{sold} sold</span>
      </div>
    );
  }
  const percentage = quantity > 0 ? Math.min((sold / quantity) * 100, 100) : 0;
  return (
    <div className="flex items-center w-full">
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mr-3">
        <div
          className={`h-2.5 rounded-full ${percentage > 90 ? 'bg-red-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-brand-primary'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-300 w-24 text-right">{sold} / {quantity}</span>
    </div>
  );
};

const SortIndicator = ({ direction }: { direction?: 'ascending' | 'descending' }) => {
    const iconClass = "h-4 w-4 transition-opacity";
    if (!direction) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={`${iconClass} text-slate-400 dark:text-slate-500 opacity-50 group-hover:opacity-100`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (direction === 'ascending') {
        return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
};

const TicketTypesTable: React.FC<TicketTypesTableProps> = ({ ticketGroups, currency, requestSort, sortConfig }) => {
  
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };
  
  const stateColorMap: { [key: string]: string } = {
    on_sale: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400',
    sold_out: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400',
    off_sale: 'bg-slate-200 dark:bg-slate-600/20 text-slate-700 dark:text-slate-400',
    hidden: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400',
  };

  if (ticketGroups.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-4">No specific ticket types found for this event.</p>;
  }

  const SortableHeader: React.FC<{ title: string, sortKey: keyof TicketGroup | string, className?: string }> = ({ title, sortKey, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-slate-800 dark:text-white ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`flex items-center gap-2 group ${className.includes('text-right') ? 'justify-end w-full' : ''}`}>
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  const hasAnalysisData = ticketGroups.length > 0 && typeof ticketGroups[0].netRevenue !== 'undefined';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/50">
          <tr>
            <SortableHeader title="Name" sortKey="name" className="w-1/4" />
            <SortableHeader title="Status" sortKey="state" />
            <SortableHeader title="Sales" sortKey="sold_count" className="w-1/3" />
            <SortableHeader title="Gross Rev" sortKey="revenue" className="text-right" />
            {hasAnalysisData && (
                <>
                    <SortableHeader title="Est. Fees" sortKey="estimatedFees" className="text-right" />
                    <SortableHeader title="Net Rev" sortKey="netRevenue" className="text-right" />
                    <SortableHeader title="Margin" sortKey="profitMargin" className="text-right" />
                </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700">
          {ticketGroups.map((ticketGroup) => {
             const margin = ticketGroup.profitMargin;
             let marginColor = 'text-slate-500 dark:text-slate-400';
             if (margin !== undefined && margin !== null) {
                 if (margin > 75) marginColor = 'text-green-600 dark:text-green-400';
                 else if (margin > 25) marginColor = 'text-yellow-600 dark:text-yellow-500';
                 else marginColor = 'text-red-600 dark:text-red-400';
             }

            return (
                <tr key={ticketGroup.id} className="md:hover:bg-gray-50 dark:md:hover:bg-slate-700/50 transition-colors">
                  <td data-label="Name" className="py-4 px-4 font-semibold text-slate-900 dark:text-white truncate">{ticketGroup.name}</td>
                  <td data-label="Status" className="whitespace-nowrap py-4 px-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${stateColorMap[ticketGroup.state || ''] || ''}`}>
                      {(ticketGroup.state || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td data-label="Sales" className="py-4 px-4">
                    <SalesProgress sold={ticketGroup.sold_count || 0} quantity={ticketGroup.quantity} />
                  </td>
                  <td data-label="Gross Rev" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-slate-900 dark:text-white text-right">
                    {formatCurrency(ticketGroup.revenue ?? 0, currency)}
                  </td>
                  {hasAnalysisData && (
                    <>
                        <td data-label="Est. Fees" className="whitespace-nowrap py-4 px-4 text-sm text-right text-red-500 dark:text-red-400">
                           ({formatCurrency(ticketGroup.estimatedFees ?? 0, currency)})
                        </td>
                        <td data-label="Net Rev" className="whitespace-nowrap py-4 px-4 text-sm font-bold text-right text-slate-900 dark:text-white">
                           {formatCurrency(ticketGroup.netRevenue ?? 0, currency)}
                        </td>
                        <td data-label="Margin" className="whitespace-nowrap py-4 px-4 text-sm font-bold text-right">
                           {margin !== undefined && margin !== null ? (
                                <span className={marginColor}>{margin.toFixed(1)}%</span>
                            ) : (
                                <span className="text-slate-500 dark:text-slate-400">N/A</span>
                            )}
                        </td>
                    </>
                  )}
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTypesTable;