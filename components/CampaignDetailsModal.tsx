
import React from 'react';
import { Campaign, Order } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import Pagination from './Pagination';
import { TicketIcon } from './icons';

// A small, local version of OrdersTable, simplified for this modal.
const CampaignOrdersTable: React.FC<{ orders: Order[] }> = ({ orders }) => {
    const formatCurrency = (value: number, currencyCode: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value / 100);
    };
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (orders.length === 0) {
        return <p className="text-slate-400 text-center py-8">No orders found for this campaign on this page.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-slate-900/80">
                    <tr>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Buyer</th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Event</th>
                        <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider text-right">Payout</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {orders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-700/50">
                            <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-300">{formatDate(order.created_at)}</td>
                            <td className="whitespace-nowrap py-3 px-4 text-sm text-white font-medium">{order.buyer_name}</td>
                            <td className="py-3 px-4 text-sm text-slate-300 truncate max-w-xs">{order.event?.name || 'N/A'}</td>
                            <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-100 font-semibold text-right">{formatCurrency(order.payout, order.currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


interface CampaignDetailsModalProps {
  campaign: Campaign | null;
  orders: Order[];
  pagination: { currentPage: number; total: number; };
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ campaign, orders, pagination, loading, error, onClose, onPageChange, itemsPerPage }) => {
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  const stateColorMap: { [key: string]: string } = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-slate-600/20 text-slate-400',
    expired: 'bg-red-500/20 text-red-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" aria-modal="true" role="dialog" onClick={handleBackdropClick}>
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10" aria-label="Close details">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {campaign && (
            <>
                <h2 id="campaign-details-title" className="text-2xl font-bold text-white mb-1 truncate">{campaign.name}</h2>
                <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${stateColorMap[campaign.state] || ''}`}>
                        {campaign.state}
                    </span>
                    <span className="text-slate-400">{campaign.event?.name || 'Global Campaign'}</span>
                </div>
            </>
        )}
        
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
            {loading ? <div className="flex-grow flex items-center justify-center min-h-[300px]"><Loader message="Fetching campaign orders..." /></div> : 
             error ? <ErrorMessage message={error} /> :
             campaign ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center"><TicketIcon /> <span className="ml-2">Orders Using This Campaign ({(pagination.total || 0).toLocaleString()})</span></h3>
                    <CampaignOrdersTable orders={orders} />
                    <Pagination 
                        currentPage={pagination.currentPage} 
                        totalItems={pagination.total} 
                        itemsPerPage={itemsPerPage} 
                        onPageChange={onPageChange} 
                    />
                </div>
             ) : null
            }
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsModal;
