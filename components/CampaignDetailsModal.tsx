import React, { useContext, useState, useEffect } from 'react';
import { Campaign, Order, CampaignCondition, CampaignEffect, ProcessedCampaign } from '../types';
import Loader from './Loader';
import ErrorMessage from '../ErrorMessage';
import Pagination from './Pagination';
import { TicketIcon, LockOpenIcon, SparklesIcon, CurrencyIcon, FeeIcon, NetPayoutIcon, CalculatorIcon } from './icons';
import { AppContext } from '../contexts/AppContext';
import StatCard from './StatCard';
import OrdersDetailTable from './modal_tables/OrdersDetailTable';

interface CampaignDetailsModalProps {
  campaignId: string;
  onClose: () => void;
  pushView: (view: any) => void;
}

const CAMPAIGN_ORDERS_PER_PAGE = 100;

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ campaignId, onClose, pushView }) => {
  const { apiClient, sortedCampaigns } = useContext(AppContext)!;
  const [campaign, setCampaign] = useState<ProcessedCampaign | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number | undefined, currencyCode: string | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (!currencyCode || currencyCode === 'N/A') {
        return (value / 100).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(value / 100);
    } catch (e) {
        return `${(value / 100).toFixed(2)} ${currencyCode}`;
    }
  };
  
  useEffect(() => {
    const fetchCampaignData = async () => {
        if (!campaignId || !apiClient) return;
        setLoading(true);
        setError(null);
        
        const foundCampaign = sortedCampaigns.find(c => c.id === campaignId);
        if (!foundCampaign) {
            setError('Campaign not found.');
            setLoading(false);
            return;
        }
        setCampaign(foundCampaign);

        try {
            const ordersResponse = await apiClient.getCampaignOrders(campaignId, 1, CAMPAIGN_ORDERS_PER_PAGE, ['event']);
            setOrders(ordersResponse.data);
            setPagination({ currentPage: 1, total: ordersResponse.total });
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred while fetching campaign data.');
        } finally {
            setLoading(false);
        }
    };
    fetchCampaignData();
  }, [campaignId, apiClient, sortedCampaigns]);

  const handlePageChange = async (page: number) => {
    if (!apiClient) return;
    setLoading(true);
    try {
        const ordersResponse = await apiClient.getCampaignOrders(campaignId, page, CAMPAIGN_ORDERS_PER_PAGE, ['event']);
        setOrders(ordersResponse.data);
        setPagination(prev => ({ ...prev, currentPage: page, total: ordersResponse.total }));
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred while fetching orders.');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  const renderCondition = (condition: CampaignCondition) => {
    const { type, data } = condition;
    switch (type) {
        case 'accesscode': return <li key={condition.id}>Requires Access Code: <strong className="text-slate-900 dark:text-white font-mono">{data.code}</strong></li>;
        case 'time':
            const start = data.start ? new Date(data.start).toLocaleString() : 'N/A';
            const end = data.end ? new Date(data.end).toLocaleString() : 'N/A';
            return <li key={condition.id}>Active between <strong className="text-slate-900 dark:text-white">{start}</strong> and <strong className="text-slate-900 dark:text-white">{end}</strong>.</li>;
        case 'targetgroup': return <li key={condition.id}>Requires membership in Target Group: <strong className="text-slate-900 dark:text-white">{data.target_group || 'Unknown'}</strong>.</li>;
        default: return <li key={condition.id}>Condition: <span className="capitalize">{type}</span></li>;
    }
  };

  const renderEffect = (effect: CampaignEffect) => {
    const { type, data } = effect;
    switch (type) {
        case 'percentage-discount-ticket-type-price':
            const ticketNames = data.ticket_types?.data.map(tt => tt.name).join(', ') || 'specific tickets';
            return <li key={effect.id}>Grants a <strong className="text-slate-900 dark:text-white">{data.percentage_discount}% discount</strong> on: {ticketNames}.</li>;
        case 'unlock-ticket-types':
            const unlockedTicketNames = data.ticket_types?.data.map(tt => tt.name).join(', ') || 'specific tickets';
            return <li key={effect.id}>Unlocks hidden ticket types: <strong className="text-slate-900 dark:text-white">{unlockedTicketNames}</strong>.</li>;
        default: return <li key={effect.id}>Effect: <span className="capitalize">{type.replace(/-/g, ' ')}</span></li>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" aria-modal="true" role="dialog" onClick={handleBackdropClick}>
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-10" aria-label="Close details">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {campaign && (
            <div className="mb-4">
                <h2 id="campaign-details-title" className="text-2xl font-bold text-slate-900 dark:text-white mb-1 truncate">{campaign.name}</h2>
                <div className="flex items-center gap-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize`}>{campaign.state}</span>
                    <span className="text-slate-500 dark:text-slate-400">{campaign.eventName}</span>
                </div>
            </div>
        )}
        
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
            {loading && !campaign ? <div className="flex-grow flex items-center justify-center min-h-[300px]"><Loader message="Fetching campaign data..." /></div> : 
             error ? <ErrorMessage message={error} /> :
             campaign ? (
                <div className="space-y-6">
                    {campaign.generatedRevenue !== undefined && (
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Financial Summary</h3>
                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard title="Gross Revenue Generated" value={formatCurrency(campaign.generatedRevenue, campaign.currency)} icon={<CurrencyIcon />} />
                                <StatCard title="Total Discounts Given" value={formatCurrency(campaign.totalDiscounts, campaign.currency)} icon={<FeeIcon />} />
                                <StatCard title="Net Revenue" value={formatCurrency(campaign.netRevenue, campaign.currency)} icon={<NetPayoutIcon />} />
                                <StatCard title="Avg. Order Value" value={formatCurrency(campaign.averageOrderValue, campaign.currency)} icon={<CalculatorIcon />} />
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center"><SparklesIcon /> <span className="ml-2">Configuration</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center"><LockOpenIcon /> <span className="ml-2">Conditions (Activates When)</span></h4>
                                <ul className="space-y-1 pl-6 list-disc text-slate-500 dark:text-slate-400">
                                    {campaign.conditions.data.length > 0 ? campaign.conditions.data.map(renderCondition) : <li>Always active (no specific conditions).</li>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center"><SparklesIcon /> <span className="ml-2">Effects (Grants)</span></h4>
                                <ul className="space-y-1 pl-6 list-disc text-slate-500 dark:text-slate-400">
                                    {campaign.effects.data.length > 0 ? campaign.effects.data.map(renderEffect) : <li>No effects defined.</li>}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center"><TicketIcon /> <span className="ml-2">Orders Using This Campaign ({(pagination.total || 0).toLocaleString()})</span></h3>
                      {loading && orders.length > 0 ? <Loader message="Fetching more orders..." /> :
                        <>
                          <OrdersDetailTable orders={orders} pushView={pushView} />
                          <Pagination currentPage={pagination.currentPage} totalItems={pagination.total} itemsPerPage={CAMPAIGN_ORDERS_PER_PAGE} onPageChange={handlePageChange} />
                        </>
                      }
                    </div>
                </div>
             ) : null
            }
        </div>
      </div>
    </div>
  );
};

export default CampaignDetailsModal;