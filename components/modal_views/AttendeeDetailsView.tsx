import React, { useContext, useEffect, useState } from 'react';
import { Attendee } from '../../types';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import { CalendarIcon, CurrencyIcon, TicketIcon, QuestionIcon, CheckCircleIcon, XCircleIcon, UserIcon, SparklesIcon } from '../icons';
import { AppContext } from '../../contexts/AppContext';

interface AttendeeDetailsViewProps {
  attendeeId: string;
  pushView: (view: any) => void;
}

const AttendeeDetailsView: React.FC<AttendeeDetailsViewProps> = ({ attendeeId, pushView }) => {
  const { apiClient } = useContext(AppContext)!;

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendeeDetails = async () => {
        if (!attendeeId || !apiClient) return;
        setLoading(true);
        setError(null);
        try {
            const fetchedAttendee = await apiClient.getAttendee(attendeeId, ['event', 'booking_question_responses', 'scannings', 'ticket_buyer', 'space', 'membership', 'subscription']);
            setAttendee(fetchedAttendee);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred fetching attendee details.');
        } finally {
            setLoading(false);
        }
    };
    fetchAttendeeDetails();
  }, [attendeeId, apiClient]);


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
    sold: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    refunded: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    reserved: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    manually_generated: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
    default: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
  };

  if (loading) return <div className="flex-grow flex items-center justify-center"><Loader /></div>
  if (error) return <ErrorMessage message={error} />
  if (!attendee) return <ErrorMessage message="Attendee data could not be loaded." />

  return (
    <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Attendee Information</h3>
            <p><strong className="text-slate-900 dark:text-white">Name:</strong> {attendee.name}</p>
            <p><strong className="text-slate-900 dark:text-white">Email:</strong> <a href={`mailto:${attendee.email}`} className="text-brand-primary hover:underline">{attendee.email}</a></p>
            <p><strong className="text-slate-900 dark:text-white">ID:</strong> <span className="font-mono text-xs">{attendee.id}</span></p>
        </div>
        
        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Ticket Information</h3>
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
                    <span className="ml-auto font-semibold">{formatCurrency(attendee.price, (attendee.event && typeof attendee.event === 'object') ? attendee.event.currency : undefined)}</span>
                </div>
                 <div className="flex items-center">
                    <CalendarIcon />
                    <span className="ml-3">Purchased On:</span>
                    <span className="ml-auto">{formatDate(attendee.created_at)}</span>
                </div>
            </div>
        </div>

        {attendee.ticket_buyer && typeof attendee.ticket_buyer === 'object' && (
             <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center">
                    <div className="w-6 h-6"><UserIcon /></div>
                    <span className="ml-2">Ticket Buyer</span>
                </h3>
                <p><strong className="text-slate-900 dark:text-white">Name:</strong> {attendee.ticket_buyer.name}</p>
                <p><strong className="text-slate-900 dark:text-white">Email:</strong> <a href={`mailto:${attendee.ticket_buyer.email}`} className="text-brand-primary hover:underline">{attendee.ticket_buyer.email}</a></p>
            </div>
        )}
        
        {(attendee.space || attendee.membership || attendee.subscription) && (
             <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center">
                     <div className="w-6 h-6"><SparklesIcon /></div>
                     <span className="ml-2">Additional Info</span>
                </h3>
                <div className="space-y-2 text-sm">
                    {attendee.space && typeof attendee.space === 'object' && (
                        <p><strong className="text-slate-900 dark:text-white">Seat:</strong> {attendee.space.label} {attendee.space.seat_category && `(${attendee.space.seat_category})`}</p>
                    )}
                    {attendee.membership && typeof attendee.membership === 'object' && (
                        <p><strong className="text-slate-900 dark:text-white">Membership:</strong> {attendee.membership.name}</p>
                    )}
                    {attendee.subscription && typeof attendee.subscription === 'object' && (
                         <p><strong className="text-slate-900 dark:text-white">Subscription:</strong> {attendee.subscription.name} <span className="capitalize text-slate-500 dark:text-slate-400">({attendee.subscription.state})</span></p>
                    )}
                </div>
            </div>
        )}

        {attendee.event && typeof attendee.event === 'object' && (
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Event Details</h3>
                <p><strong className="text-slate-900 dark:text-white">Name:</strong> {attendee.event.name}</p>
                <p><strong className="text-slate-900 dark:text-white">Starts:</strong> {formatDate(attendee.event.starts_at)}</p>
            </div>
        )}
        
        {attendee.scannings && attendee.scannings.data.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-3">Scanning History</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                    {attendee.scannings.data.map(scan => (
                        <div key={scan.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                                {scan.status === 'accepted' ? (
                                    <span className="text-green-500 dark:text-green-400" title="Accepted"><CheckCircleIcon /></span>
                                ) : (
                                    <span className="text-red-500 dark:text-red-400" title="Rejected"><XCircleIcon /></span>
                                )}
                                <div>
                                    <p className="text-slate-900 dark:text-white capitalize">{scan.status}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(scan.created_at)}</p>
                                </div>
                            </div>
                            {scan.scanner_name && <p className="text-xs text-slate-500 dark:text-slate-500">{scan.scanner_name}</p>}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {attendee.booking_question_responses && attendee.booking_question_responses.data.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center">
                    <div className="w-6 h-6"><QuestionIcon /></div>
                    <span className="ml-2">Booking Question Responses</span>
                </h3>
                <div className="space-y-4">
                    {attendee.booking_question_responses.data.map((response) => (
                       <div key={response.id} className="border-t border-gray-200 dark:border-slate-700/50 pt-3 first:border-t-0 first:pt-0">
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                                {typeof response.question === 'string' ? response.question : response.question.name}
                                {response.required && <span className="text-red-500 dark:text-red-400/70 ml-1" title="Required field">*</span>}
                            </label>
                            {response.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 whitespace-pre-wrap">{response.description}</p>
                            )}
                            <p className="text-base text-slate-900 dark:text-white mt-2 pl-2 border-l-2 border-brand-primary/50">
                                {response.answer || response.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default AttendeeDetailsView;