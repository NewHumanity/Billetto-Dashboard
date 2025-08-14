
import React from 'react';
import { Order, OrderLine } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { TicketIcon } from './icons';

interface OrderDetailsModalProps {
  order: Order | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, loading, error, onClose }) => {
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" 
        aria-modal="true" 
        role="dialog"
        onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Close details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="order-details-title" className="text-2xl font-bold text-white mb-2">Order Details</h2>
        
        {loading && <div className="flex-grow flex items-center justify-center"><Loader /></div>}
        {error && <ErrorMessage message={error} />}
        {order && (
          <div className="overflow-y-auto space-y-6 mt-4 pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-300 mb-2">Buyer Information</h3>
                    <p><strong className="text-white">Name:</strong> {order.buyer_name}</p>
                    <p><strong className="text-white">Email:</strong> <a href={`mailto:${order.email}`} className="text-brand-primary hover:underline">{order.email}</a></p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-300 mb-2">Order Summary</h3>
                    <p><strong className="text-white">Order ID:</strong> <span className="font-mono">{order.id}</span></p>
                    <p><strong className="text-white">Date:</strong> {formatDate(order.created_at)}</p>
                    <p><strong className="text-white">Channel:</strong> <span className="capitalize">{(order.sales_channel || '').replace('_', ' ')}</span></p>
                </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-300 mb-2">Event</h3>
                <p><strong className="text-white">Name:</strong> {order.event.name}</p>
                <p><strong className="text-white">Starts:</strong> {formatDate(order.event.starts_at)}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center"><TicketIcon /> <span className="ml-2">Order Items</span></h3>
              <div className="space-y-3">
                {order.order_lines && order.order_lines.data && order.order_lines.data.map((item: OrderLine) => (
                  <div key={item.id} className="bg-slate-900/50 p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-white">{formatCurrency(item.unit_price, item.currency)}</p>
                      <p className="text-xs text-slate-400">Unit Price</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg mt-6">
                <h3 className="font-semibold text-slate-300 mb-2">Financials</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <p className="text-slate-400">Subtotal:</p><p className="text-right text-white">{formatCurrency(order.subtotal, order.currency)}</p>
                    <p className="text-slate-400">Payment Fees:</p><p className="text-right text-white">{formatCurrency(order.payment_fees, order.currency)}</p>
                    <p className="text-slate-400">Billetto Fees:</p><p className="text-right text-white">{formatCurrency(order.billetto_fees, order.currency)}</p>
                    <hr className="col-span-2 border-slate-700 my-1" />
                    <p className="font-bold text-slate-300">Payout to You:</p><p className="text-right font-bold text-white">{formatCurrency(order.payout, order.currency)}</p>
                </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsModal;
