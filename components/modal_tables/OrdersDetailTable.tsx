import React from 'react';
import { Order } from '../../types';
import OrderDetailsView from '../modal_views/OrderDetailsView';

interface OrdersDetailTableProps {
  orders: Order[];
  pushView: (view: any) => void;
}

const OrdersDetailTable: React.FC<OrdersDetailTableProps> = ({ orders, pushView }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };
  
  const handleRowClick = (order: Order) => {
    pushView({
        title: `Order Details`,
        content: (props: any) => <OrderDetailsView {...props} orderId={order.id} />
    });
  };
  
  if (orders.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No orders found for this event.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Date</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Buyer</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Total Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700">
          {orders.map((order) => (
            <tr 
                key={order.id}
                onClick={() => handleRowClick(order)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td data-label="Date" className="whitespace-nowrap py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(order.created_at)}</td>
              <td data-label="Buyer" className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{order.buyer_name}</td>
              <td data-label="Payout" className="whitespace-nowrap py-3 px-4 text-sm font-semibold text-right text-slate-900 dark:text-white">
                {formatCurrency(order.payout, order.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersDetailTable;