
import React from 'react';
import { Attendee } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import { CalendarIcon, CurrencyIcon, TicketIcon } from './icons';

interface AttendeeDetailsModalProps {
  attendee: Attendee | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const AttendeeDetailsModal: React.FC<AttendeeDetailsModalProps> = ({ attendee, loading, error, onClose }) => {
  const formatCurrency = (value: number, currencyCode?: string) => {
    if (!currencyCode) return (value / 100).toFixed(2);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const statusColorMap: { [key: string]: string } = {
    sold: 'bg-green-500/20 text-green-400',
    refunded: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    reserved: 'bg-blue-500/20 text-blue-400',
    manually_generated: 'bg-purple-500/20 text-purple-400',
    default: 'bg-slate-500/20 text-slate-400'
  };


  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" 
        aria-modal="true" 
        role="dialog"
        onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Close details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="attendee-details-title" className="text-2xl font-bold text-white mb-2">Attendee Details</h2>
        
        {loading && <div className="flex-grow flex items-center justify-center"><Loader /></div>}
        {error && <ErrorMessage message={error} />}
        {attendee && (
          <div className="overflow-y-auto space-y-6 mt-4 pr-2">
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-300 mb-2">Attendee Information</h3>
                <p><strong className="text-white">Name:</strong> {attendee.name}</p>
                <p><strong className="text-white">Email:</strong> <a href={`mailto:${attendee.email}`} className="text-brand-primary hover:underline">{attendee.email}</a></p>
                <p><strong className="text-white">ID:</strong> <span className="font-mono text-xs">{attendee.id}</span></p>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-300 mb-2">Ticket Information</h3>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <TicketIcon />
                        <span className="ml-3">Status:</span>
                        <span className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[attendee.state] || statusColorMap.default}`}>
                            {(attendee.state || '').replace(/_/g, ' ')}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <CurrencyIcon/>
                        <span className="ml-3">Price Paid:</span>
                        <span className="ml-auto font-semibold">{formatCurrency(attendee.price, attendee.event?.currency)}</span>
                    </div>
                     <div className="flex items-center">
                        <CalendarIcon />
                        <span className="ml-3">Purchased On:</span>
                        <span className="ml-auto">{formatDate(attendee.created_at)}</span>
                    </div>
                </div>
            </div>

            {attendee.event && (
                <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-slate-300 mb-2">Event Details</h3>
                    <p><strong className="text-white">Name:</strong> {attendee.event.name}</p>
                    <p><strong className="text-white">Starts:</strong> {formatDate(attendee.event.starts_at)}</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendeeDetailsModal;
