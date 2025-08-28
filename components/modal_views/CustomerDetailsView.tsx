import React, { useContext } from 'react';
import { AudienceMember, Order, Attendee } from '../../types';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import StatCard from '../StatCard';
import { AppContext } from '../../contexts/AppContext';
import { CalendarIcon, CurrencyIcon, TicketIcon, UserIcon, BarChartIcon } from '../icons';
import OrdersDetailTable from '../modal_tables/OrdersDetailTable';
import AttendeesDetailTable from '../modal_tables/AttendeesDetailTable';


interface CustomerDetailsViewProps {
  customerId: string; // This is the email
  pushView: (view: any) => void;
}

const segmentColorMap: Record<string, string> = {
    'Champions': 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/30',
    'Loyal Customers': 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    'Potential Loyalists': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
    'New Customers': 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    'At Risk': 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
    'Hibernating': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    'Needs Attention': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
    'Regular': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500'
};

const RFMScoreDisplay: React.FC<{ score?: number, label: string, colorClass: string }> = ({ score = 0, label, colorClass }) => (
    <div className="flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white ${colorClass}`}>
            {score}
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">(Score)</p>
    </div>
);

const CustomerDetailsView: React.FC<CustomerDetailsViewProps> = ({ customerId, pushView }) => {
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
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(value / 100);
        } catch (e) {
            return `${(value / 100).toFixed(2)} ${currencyCode}`;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (!customer) return <Loader message="Loading customer data..." />

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <StatCard title="Lifetime Value (CLV)" value={formatCurrency(customer.totalSpent, customer.currency)} icon={<CurrencyIcon />} />
               <StatCard title="Events Attended" value={customer.eventsAttended.toLocaleString()} icon={<TicketIcon />} />
               <StatCard title="Last Attended" value={formatDate(customer.lastAttendedDate)} icon={<CalendarIcon />} />
            </div>
            
            <div className="space-y-6">
                {customer.rfmSegment && (
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center"><BarChartIcon /> <span className="ml-2">RFM Analysis</span></h3>
                        <div className="flex justify-around p-4 rounded-lg bg-white dark:bg-slate-800">
                            <RFMScoreDisplay score={customer.recencyScore} label="Recency" colorClass="bg-blue-500" />
                            <RFMScoreDisplay score={customer.frequencyScore} label="Frequency" colorClass="bg-green-500" />
                            <RFMScoreDisplay score={customer.monetaryScore} label="Monetary" colorClass="bg-purple-500" />
                        </div>
                         <div className="text-center mt-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Customer Segment</p>
                            <span className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-base font-semibold border ${segmentColorMap[customer.rfmSegment || 'default']}`}>
                                {customer.rfmSegment}
                            </span>
                        </div>
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Order History ({customer.orders.length})</h3>
                    <OrdersDetailTable orders={customer.orders} pushView={pushView} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Attendance History ({customer.attendees.length})</h3>
                    <AttendeesDetailTable attendees={customer.attendees} currency={customer.currency} pushView={pushView} />
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailsView;