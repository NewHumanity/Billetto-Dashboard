import React from 'react';
import { EventDetails, AggregatedQuestion, BookingQuestionResponse } from '../types';

interface ResponseDetail {
    sourceName: string;
    sourceEmail: string;
    responseText: string;
}

interface BookingQuestionDetailsModalProps {
    question: AggregatedQuestion;
    details: EventDetails;
    onClose: () => void;
}

const BookingQuestionDetailsModal: React.FC<BookingQuestionDetailsModalProps> = ({ question, details, onClose }) => {
    const [responseDetails, setResponseDetails] = React.useState<ResponseDetail[]>([]);

    React.useEffect(() => {
        if (!question || !details) return;

        const allDetails: ResponseDetail[] = [];
        const addedResponses = new Set<string>();

        const processResponses = (responses: BookingQuestionResponse[] = [], name: string, email: string) => {
             for (const response of responses) {
                const answerText = (response.answer || response.text || '').trim();
                if (!answerText) continue;

                let responseMatches = false;
                if (typeof response.question === 'string') {
                    responseMatches = response.question === question.id;
                } else if (response.question) {
                    responseMatches = response.question.id === question.id;
                }

                if (responseMatches) {
                    const uniqueKey = `${name}-${email}-${answerText}`;
                    if (!addedResponses.has(uniqueKey)) {
                        allDetails.push({
                            sourceName: name,
                            sourceEmail: email,
                            responseText: answerText,
                        });
                        addedResponses.add(uniqueKey);
                    }
                }
            }
        }
        
        (details.allOrders || []).forEach(order => processResponses(order.booking_question_responses?.data, order.buyer_name, order.email));
        (details.allAttendees || []).forEach(attendee => processResponses(attendee.booking_question_responses?.data, attendee.name, attendee.email));
        
        setResponseDetails(allDetails);

    }, [question, details]);

    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
            <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                    aria-label="Close details"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 id="question-details-title" className="text-2xl font-bold text-white mb-2 pr-8">{question.name}</h2>
                <p className="text-sm text-slate-400 mb-6">Showing {responseDetails.length.toLocaleString()} individual responses.</p>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-900/80 sticky top-0">
                                <tr>
                                    <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Buyer / Attendee</th>
                                    <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Email</th>
                                    <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Response</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {responseDetails.map((response, index) => (
                                    <tr key={index} className="hover:bg-slate-700/50">
                                        <td className="whitespace-nowrap py-3 px-4 text-sm text-white font-medium">{response.sourceName}</td>
                                        <td className="whitespace-nowrap py-3 px-4 text-sm text-slate-300">{response.sourceEmail}</td>
                                        <td className="py-3 px-4 text-sm text-slate-200 whitespace-normal">{response.responseText}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {responseDetails.length === 0 && (
                            <p className="text-slate-400 text-center py-12">No detailed responses found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingQuestionDetailsModal;
