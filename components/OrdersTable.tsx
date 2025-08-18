import React from 'react';
import { Order, SortConfig } from '../types';

interface OrdersTableProps {
  orders: Order[];
  onSelectOrder: (orderId: string) => void;
  requestSort: (key: keyof Order | string) => void;
  sortConfig: SortConfig<Order> | null;
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

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onSelectOrder, requestSort, sortConfig, currentPage, itemsPerPage }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100); // Value is in cents
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
  
  const statusColorMap: { [key: string]: string } = {
    successful: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    default: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
  };

  const SortableHeader: React.FC<{ title: string, sortKey: keyof Order | string }> = ({ title, sortKey }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (orders.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No orders found for this account.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white">#</th>
            <SortableHeader title="Order ID" sortKey="id" />
            <SortableHeader title="Date" sortKey="created_at" />
            <SortableHeader title="Buyer" sortKey="buyer_name" />
            <SortableHeader title="Event" sortKey="event.name" />
            <SortableHeader title="Status" sortKey="state" />
            <SortableHeader title="Total Payout" sortKey="payout" />
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {orders.map((order, index) => (
            <tr 
              key={order.id} 
              className="md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
              onClick={() => onSelectOrder(order.id)}
              tabIndex={0}
              onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectOrder(order.id)}
              aria-label={`View details for order ${order.id}`}
            >
              <td data-label="#" className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-500 dark:text-slate-400">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td data-label="Order ID" className="whitespace-nowrap py-4 px-4 text-sm font-mono text-brand-primary/90 dark:text-brand-primary/80 hover:text-brand-primary">{order.id.split('-')[0]}...</td>
              <td data-label="Date" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(order.created_at)}</td>
              <td data-label="Buyer" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-slate-900 dark:text-white">{order.buyer_name}</td>
              <td data-label="Event" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300 truncate max-w-xs">{(order.event && typeof order.event === 'object') ? order.event.name : 'N/A'}</td>
              <td data-label="Status" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[order.state] || statusColorMap.default}`}>
                    {order.state}
                </span>
              </td>
              <td data-label="Total Payout" className="whitespace-nowrap py-4 px-4 text-sm text-slate-800 dark:text-slate-100 font-semibold">{formatCurrency(order.payout, order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;