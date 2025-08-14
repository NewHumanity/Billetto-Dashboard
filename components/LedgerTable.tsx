
import React from 'react';
import { LedgerEntry } from '../types';

interface LedgerTableProps {
  entries: LedgerEntry[];
}

const LedgerTable: React.FC<LedgerTableProps> = ({ entries }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
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
  
  const typeColorMap: { [key: string]: string } = {
    charge: 'text-green-400',
    refund: 'text-yellow-400',
    payout: 'text-blue-400',
    fee: 'text-red-400',
    adjustment: 'text-purple-400',
    other: 'text-slate-400',
  };

  if (entries.length === 0) {
    return <p className="text-slate-400 text-center py-8">No ledger entries found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Date</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Type</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Description</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Event</th>
            <th scope="col" className="py-3.5 px-4 text-right text-sm font-semibold text-white">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-700/50 transition-colors">
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{formatDate(entry.created_at)}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm font-medium">
                <span className={`capitalize ${typeColorMap[entry.type] || typeColorMap.other}`}>
                  {(entry.type || '').replace('_', ' ')}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-white max-w-sm truncate">{entry.description}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300 truncate max-w-xs">{entry.event?.name || 'N/A'}</td>
              <td className={`whitespace-nowrap py-4 px-4 text-sm text-right font-semibold ${entry.amount > 0 ? 'text-green-400' : entry.amount < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {formatCurrency(entry.amount, entry.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;
