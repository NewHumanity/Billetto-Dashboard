
import React from 'react';
import { Attendee } from '../../types';

interface AttendeesDetailTableProps {
  attendees: Attendee[];
  currency: string;
}

const AttendeesDetailTable: React.FC<AttendeesDetailTableProps> = ({ attendees, currency }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };

  if (attendees.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No attendees found for this event.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Name</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Email</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Price Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {attendees.map((attendee) => (
            <tr key={attendee.id}>
              <td className="whitespace-nowrap py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{attendee.name}</td>
              <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{attendee.email}</td>
              <td className="whitespace-nowrap py-3 px-4 text-sm text-right text-slate-600 dark:text-slate-300">
                {formatCurrency(attendee.price, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendeesDetailTable;