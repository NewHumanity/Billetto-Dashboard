import React from 'react';
import { Attendee } from '../../types';
import AttendeeDetailsView from '../modal_views/AttendeeDetailsView';

interface AttendeesDetailTableProps {
  attendees: Attendee[];
  currency: string;
  pushView: (view: any) => void;
}

const AttendeesDetailTable: React.FC<AttendeesDetailTableProps> = ({ attendees, currency, pushView }) => {
    
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };
  
  const handleRowClick = (attendee: Attendee) => {
    pushView({
        title: `Attendee Details`,
        content: (props: any) => <AttendeeDetailsView {...props} attendeeId={attendee.id} />
    });
  };

  if (attendees.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No attendees found for this event.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Name</th>
            <th className="py-3 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Email</th>
            <th className="py-3 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Price Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700">
          {attendees.map((attendee) => (
            <tr 
                key={attendee.id}
                onClick={() => handleRowClick(attendee)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td data-label="Name" className="whitespace-nowrap py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{attendee.name}</td>
              <td data-label="Email" className="whitespace-nowrap py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{attendee.email}</td>
              <td data-label="Price Paid" className="whitespace-nowrap py-3 px-4 text-sm text-right text-slate-600 dark:text-slate-300">
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