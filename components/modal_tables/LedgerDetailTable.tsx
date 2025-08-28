import React, { useContext } from 'react';
import { LedgerEntry } from '../../types';
import { ModalContext } from '../DetailsModal';
import OrderDetailsView from '../modal_views/OrderDetailsView';

interface LedgerDetailTableProps {
  entries: LedgerEntry[];
  pushView: (view: any) => void;
}

const LedgerDetailTable: React.FC<LedgerDetailTableProps> = ({ entries, pushView }) => {
    
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

  const formatEntryType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const handleRowClick = (entry: LedgerEntry) => {
    if (entry.order_id) {
        const orderId = String(entry.order_id);
        pushView({
            title: `Order Details`,
            content: (props: any) => <OrderDetailsView {...props} orderId={orderId} />
        });
    }
  };

  if (entries.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No data available for this view.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Date</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Details</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700">
          {entries.map((entry) => {
            const isClickable = !!entry.order_id;
            return (
                <tr 
                    key={entry.id}
                    onClick={() => handleRowClick(entry)}
                    className={isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors' : ''}
                >
                    <td data-label="Date" className="whitespace-nowrap py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.created_at)}</td>
                    <td data-label="Details" className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{formatEntryType(entry.entry_type)}</td>
                    <td data-label="Amount" className={`whitespace-nowrap py-3 px-4 text-sm font-semibold text-right ${entry.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(entry.amount, entry.currency)}
                    </td>
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerDetailTable;