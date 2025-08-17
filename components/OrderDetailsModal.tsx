import React from 'react';
import { Order, OrderLine, OrderTransaction } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { TicketIcon, ExternalLinkIcon, CreditCardIcon, CheckCircleIcon, XCircleIcon, QuestionIcon } from './icons';

interface OrderDetailsModalProps {
  order: Order | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, loading, error, onClose }) => {
  const [showPayoutTooltip, setShowPayoutTooltip] = React.useState(false);

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
          (() => {
            const totalFees = (order.payment_fees || 0) + (order.billetto_fees || 0);
            const calculatedNet = order.subtotal - totalFees;
            const tooltipText = "This is the payout amount reported by the Billetto API. It may differ from the calculated net revenue due to factors like VAT, refunds, or specific payout timing adjustments not reflected in this view.";
            
            return (
              <div className="overflow-y-auto space-y-6 mt-4 pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-slate-300 mb-2">Buyer Information</h3>
                        <p><strong className="text-white">Name:</strong> {order.buyer_name}</p>
                        <p><strong className="text-white">Email:</strong> <a href={`mailto:${order.email}`} className="text-brand-primary hover:underline">{order.email}</a></p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-slate-300">Order Summary</h3>
                            {order.manage_url && (
                                <a 
                                    href={order.manage_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 flex items-center gap-1 text-xs text-brand-primary/80 hover:text-brand-primary hover:underline transition-colors"
                                    aria-label="Manage order on Billetto"
                                >
                                    <span>Manage</span>
                                    <ExternalLinkIcon />
                                </a>
                            )}
                        </div>
                        <p><strong className="text-white">Order ID:</strong> <span className="font-mono">{order.id}</span></p>
                        <p><strong className="text-white">Date:</strong> {formatDate(order.created_at)}</p>
                        <p><strong className="text-white">Channel:</strong> <span className="capitalize">{(order.sales_channel || '').replace('_', ' ')}</span></p>
                    </div>
                </div>

                {order.event && typeof order.event === 'object' && (
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                      <h3 className="font-semibold text-slate-300 mb-2">Event</h3>
                      <p><strong className="text-white">Name:</strong> {order.event.name}</p>
                      <p><strong className="text-white">Starts:</strong> {formatDate(order.event.starts_at)}</p>
                  </div>
                )}
                
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

                {order.order_transactions && order.order_transactions.data.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center"><CreditCardIcon /> <span className="ml-2">Payment History</span></h3>
                    <div className="space-y-2">
                      {order.order_transactions.data.map((tx: OrderTransaction) => (
                        <div key={tx.id} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {tx.state === 'successful' ? (
                              <span className="text-green-400" title="Successful"><CheckCircleIcon /></span>
                            ) : (
                              <span className="text-red-400" title="Failed"><XCircleIcon /></span>
                            )}
                            <div>
                              <p className="font-semibold text-white capitalize">
                                {(tx.payment_method || '').replace('_', ' ')}
                                {tx.payment_gateway_identifier && <span className="text-slate-400 font-normal"> via {tx.payment_gateway_identifier}</span>}
                              </p>
                              <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className={`font-bold text-lg ${tx.state === 'successful' ? 'text-white' : 'text-slate-500 line-through'}`}>
                              {formatCurrency(tx.amount, tx.currency)}
                            </p>
                            {tx.refunded_amount && tx.refunded_amount > 0 && (
                                <p className="text-xs text-yellow-400">-{formatCurrency(tx.refunded_amount, tx.currency)} refunded</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-slate-300 mb-2">Sale Breakdown</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-slate-400">Gross Sale (Subtotal):</p>
                            <p className="text-right text-white font-semibold">{formatCurrency(order.subtotal, order.currency)}</p>
                            
                            <p className="text-slate-400">Total Fees:</p>
                            <p className="text-right text-red-400/90">- {formatCurrency(totalFees, order.currency)}</p>
                            
                            <hr className="col-span-2 border-slate-700 my-1" />
                            
                            <p className="font-bold text-slate-300">Calculated Net Revenue:</p>
                            <p className="text-right font-bold text-white text-lg">{formatCurrency(calculatedNet, order.currency)}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowPayoutTooltip(!showPayoutTooltip)}
                                    onBlur={() => setShowPayoutTooltip(false)}
                                    className="flex items-center gap-2 text-left"
                                    aria-describedby="payout-tooltip"
                                >
                                    <h3 className="font-semibold text-slate-300">Billetto Reported Payout</h3>
                                    <div className="text-slate-500 w-5 h-5 flex-shrink-0">
                                        <QuestionIcon />
                                    </div>
                                </button>
                                {showPayoutTooltip && (
                                    <div
                                        id="payout-tooltip"
                                        role="tooltip"
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-xs p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-lg text-xs text-slate-300 z-20"
                                    >
                                        {tooltipText}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"></div>
                                    </div>
                                )}
                            </div>
                            <p className="text-right font-bold text-white text-lg">{formatCurrency(order.payout, order.currency)}</p>
                        </div>
                    </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default OrderDetailsModal;