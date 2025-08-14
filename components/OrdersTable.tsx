
import React from 'react';
import { Order } from '../types';

interface OrdersTableProps {
  orders: Order[];
  onSelectOrder: (orderId: string) => void;
}

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, onSelectOrder }) => {
    
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

  if (orders.length === 0) {
    return <p className="text-slate-400 text-center py-8">No orders found for this account.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Order ID</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Date</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Buyer</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Event</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Total Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {orders.map((order) => (
            <tr 
              key={order.id} 
              className="hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
              onClick={() => onSelectOrder(order.id)}
              tabIndex={0}
              onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectOrder(order.id)}
              aria-label={`View details for order ${order.id}`}
            >
              <td className="whitespace-nowrap py-4 px-4 text-sm font-mono text-brand-primary/80 hover:text-brand-primary">{order.id.split('-')[0]}...</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{formatDate(order.created_at)}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm font-medium text-white">{order.buyer_name}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300 truncate max-w-xs">{order.event?.name || 'N/A'}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-100 font-semibold">{formatCurrency(order.payout, order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
