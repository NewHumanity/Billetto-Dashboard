
import React from 'react';
import { Attendee } from '../types';

interface AttendeesTableProps {
  attendees: Attendee[];
  currency: string;
}

const AttendeesTable: React.FC<AttendeesTableProps> = ({ attendees, currency }) => {
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100); // Value is in cents
  }

  const statusColorMap: { [key: string]: string } = {
    sold: 'bg-green-500/20 text-green-400',
    refunded: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    reserved: 'bg-blue-500/20 text-blue-400',
    default: 'bg-slate-500/20 text-slate-400'
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800/80">
          <tr>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Name</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Email</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Status</th>
            <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {attendees.map((attendee) => (
            <tr key={attendee.id} className="hover:bg-slate-700/50 transition-colors">
              <td className="whitespace-nowrap py-4 px-4 text-sm font-medium text-white">
                {attendee.name}
              </td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{attendee.email}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[attendee.state] || statusColorMap.default}`}>
                    {(attendee.state || '').replace(/_/g, ' ')}
                </span>
              </td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">
                {formatCurrency(attendee.price, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendeesTable;
