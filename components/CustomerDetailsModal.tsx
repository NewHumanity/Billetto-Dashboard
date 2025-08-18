import React, { useContext } from 'react';
import { AudienceMember, Order, Attendee } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import StatCard from './StatCard';
import { AppContext } from '../contexts/AppContext';
import { CalendarIcon, CurrencyIcon, TicketIcon, UserIcon } from './icons';

interface CustomerDetailsModalProps {
  customerId: string;
  onClose: () => void;
}

const OrdersTable: React.FC<{ orders: Order[], currency: string }> = ({ orders, currency }) => {
    if (orders.length === 0) return <p className="text-slate-500 dark:text-slate-400 text-center py-4">No orders found.</p>;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { year: '2-digit', month: 'short', day: 'numeric' });
    const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v / 100);
    return (
        <div className="overflow-x-auto max-h-64">
            <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                    <tr>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase">Date</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase">Event</th>
                        <th className="py-2 px-3 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase">Payout</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {orders.map(o => (
                        <tr key={o.id}>
                            <td className="whitespace-nowrap py-2 px-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(o.created_at)}</td>
                            <td className="py-2 px-3 text-sm text-slate-900 dark:text-white truncate max-w-xs">{typeof o.event === 'object' ? o.event.name : 'N/A'}</td>
                            <td className="whitespace-nowrap py-2 px-3 text-sm text-right font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(o.payout)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AttendeesTable: React.FC<{ attendees: Attendee[], currency: string }> = ({ attendees, currency }) => {
    if (attendees.length === 0) return <p className="text-slate-500 dark:text-slate-400 text-center py-4">No attendee records found.</p>;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { year: '2-digit', month: 'short', day: 'numeric' });
    return (
         <div className="overflow-x-auto max-h-64">
            <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                    <tr>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase">Event</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase">Event Date</th>
                        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase">Ticket Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {attendees.map(a => (
                        <tr key={a.id}>
                            <td className="py-2 px-3 text-sm text-slate-900 dark:text-white truncate max-w-xs">{typeof a.event === 'object' ? a.event.name : 'N/A'}</td>
                            <td className="whitespace-nowrap py-2 px-3 text-sm text-slate-600 dark:text-slate-300">{typeof a.event === 'object' ? formatDate(a.event.starts_at) : 'N/A'}</td>
                            <td className="whitespace-nowrap py-2 px-3 text-sm text-slate-600 dark:text-slate-300 capitalize">{a.state.replace(/_/g, ' ')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({ customerId, onClose }) => {
    const { fullAudience } = useContext(AppContext)!;
    
    const customer = React.useMemo(() => {
        return fullAudience.find(c => c.id === customerId);
    }, [customerId, fullAudience]);

    const formatCurrency = (value: number | undefined, currencyCode: string | undefined): string => {
        if (value === undefined || value === null) return 'N/A';
        
        if (!currencyCode || currencyCode === 'N/A') {
            return (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" 
            aria-modal="true" 
            role="dialog"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-10" aria-label="Close details">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {!customer ? <Loader message="Loading customer data..." /> : (
                    <>
                        <div className="mb-6">
                            <h2 id="customer-details-title" className="text-2xl font-bold text-slate-900 dark:text-white mb-1 truncate">{customer.name}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                           <StatCard title="Lifetime Value (CLV)" value={formatCurrency(customer.totalSpent, customer.currency)} icon={<CurrencyIcon />} />
                           <StatCard title="Events Attended" value={customer.eventsAttended.toLocaleString()} icon={<TicketIcon />} />
                           <StatCard title="Last Attended" value={formatDate(customer.lastAttendedDate)} icon={<CalendarIcon />} />
                        </div>
                        
                        <div className="flex-grow overflow-y-auto space-y-6 -mx-6 px-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Order History ({customer.orders.length})</h3>
                                <OrdersTable orders={customer.orders} currency={customer.currency} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Attendance History ({customer.attendees.length})</h3>
                                <AttendeesTable attendees={customer.attendees} currency={customer.currency} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomerDetailsModal;