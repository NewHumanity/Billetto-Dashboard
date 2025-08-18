
import React from 'react';
import { LedgerEntry } from '../../types';

interface LedgerDetailTableProps {
  entries: LedgerEntry[];
}

const LedgerDetailTable: React.FC<LedgerDetailTableProps> = ({ entries }) => {
    
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

  if (entries.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No data available for this view.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Date</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Details</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(entry.created_at)}</td>
              <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{formatEntryType(entry.entry_type)}</td>
              <td className={`whitespace-nowrap py-3 px-4 text-sm font-semibold text-right ${entry.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(entry.amount, entry.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerDetailTable;