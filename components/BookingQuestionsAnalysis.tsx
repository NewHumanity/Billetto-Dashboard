import React from 'react';
import WordCloud from 'react-wordcloud';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { EventDetails, BookingQuestionsAnalysis, AggregatedQuestion, BookingQuestionResponse } from '../types';

interface BookingQuestionsAnalysisProps {
    details: EventDetails;
    analysis?: BookingQuestionsAnalysis;
    onTriggerAnalysis: (force: boolean) => void;
    filterTicketGroupId: string;
    onFilterChange: (ticketGroupId: string) => void;
}

const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const { value } = payload;
    const truncatedValue = value.length > 25 ? `${value.substring(0, 25)}...` : value;

    return (
        <g transform={`translate(${x},${y})`}>
            <title>{value}</title>
            <text x={0} y={0} dy={4} textAnchor="end" fill="#CBD5E0" fontSize={12}>
                {truncatedValue}
            </text>
        </g>
    );
};

const wordCloudOptions = {
  colors: ["#1E90FF", "#38B2AC", "#9F7AEA", "#ED8936", "#F56565", "#4299E1"],
  enableTooltip: true,
  deterministic: true,
  fontFamily: "sans-serif",
  fontSizes: [14, 60] as [number, number],
  fontStyle: "normal",
  fontWeight: "bold",
  padding: 1,
  rotations: 2,
  rotationAngles: [-90, 0] as [number, number],
  scale: "sqrt" as const,
  spiral: "archimedean" as const,
  transitionDuration: 1000,
};

const BookingQuestionsAnalysis: React.FC<BookingQuestionsAnalysisProps> = ({ details, analysis, onTriggerAnalysis, filterTicketGroupId, onFilterChange }) => {

    const handleDownloadCsv = (question: AggregatedQuestion) => {
        const { allOrders = [], allAttendees = [] } = details;
        
        let rows = [['attendee_name', 'attendee_email', 'response_text']];
        const addedResponses = new Set<string>();

        const processResponses = (responses: BookingQuestionResponse[], name: string, email: string) => {
             for (const response of responses) {
                if (response.question.id === question.id && response.text) {
                    const uniqueKey = `${name}-${email}-${response.text}`;
                    if (!addedResponses.has(uniqueKey)) {
                        rows.push([name, email, `"${response.text.replace(/"/g, '""')}"`]);
                        addedResponses.add(uniqueKey);
                    }
                }
            }
        }
        
        allOrders.forEach(order => processResponses(order.booking_question_responses?.data || [], order.buyer_name, order.email));
        allAttendees.forEach(attendee => processResponses(attendee.booking_question_responses?.data || [], attendee.name, attendee.email));

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeFilename = question.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute("download", `${safeFilename}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    if (!analysis || analysis.length === 0) {
        return (
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg animate-fade-in" role="tabpanel">
                <h3 className="text-xl font-semibold text-white mb-4">Booking Questions Analysis</h3>
                <div className="text-center py-16 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700">
                    <p className="text-slate-400 mb-4">
                        {filterTicketGroupId !== 'all'
                            ? 'No booking question responses found for the selected ticket type.'
                            : 'No booking question responses found for this event.'
                        }
                    </p>
                    <button onClick={() => onTriggerAnalysis(true)} className="bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Re-Analyze All Data
                    </button>
                </div>
            </div>
        );
    }
    
    const CustomTooltipContent: React.FC<any> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg shadow-lg">
                    <p className="text-sm text-slate-200 mb-1">{label}</p>
                    <p className="text-white font-semibold">{`Responses: ${payload[0].value.toLocaleString()}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-fade-in" role="tabpanel">
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 flex-wrap">
                <div>
                     <label htmlFor="ticket-type-filter" className="text-sm font-medium text-slate-300 mr-2">Filter by Ticket Type:</label>
                    <select 
                        id="ticket-type-filter" 
                        disabled={details.ticketGroups.length === 0} 
                        className="bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                        value={filterTicketGroupId}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="all">All Ticket Types</option>
                        {details.ticketGroups.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
                    </select>
                     {filterTicketGroupId !== 'all' && (
                        <p className="text-xs text-yellow-400/80 mt-1">
                            Note: Filtering only shows answers from order-level questions.
                        </p>
                    )}
                </div>
                <button onClick={() => onTriggerAnalysis(true)} className="bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    Re-Analyze Data
                </button>
            </div>

            {analysis.map(question => {
                const chartData = question.answers.slice(0, 10).reverse(); // Reverse for top-down display in chart
                
                return (
                    <div key={question.id} className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        <div className="flex justify-between items-start gap-4 mb-1">
                            <h4 className="text-lg font-semibold text-white">{question.name}</h4>
                            <button onClick={() => handleDownloadCsv(question)} className="flex-shrink-0 text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 px-3 rounded-lg transition-colors">
                                Download CSV
                            </button>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">Total Responses: {question.totalResponses.toLocaleString()}</p>
                        
                        {question.type === 'multiple-choice' && (
                            <div style={{ width: '100%', height: Math.max(80, chartData.length * 45) }}>
                                <ResponsiveContainer>
                                    <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <XAxis type="number" stroke="#A0AEC0" tick={{ fontSize: 12 }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="text" stroke="#A0AEC0" width={180} tick={<CustomYAxisTick />} interval={0} />
                                        <Tooltip cursor={{ fill: 'rgba(30, 144, 255, 0.1)' }} content={<CustomTooltipContent />} />
                                        <Bar dataKey="count" fill="#1E90FF" radius={[0, 4, 4, 0]}>
                                           <LabelList dataKey="count" position="right" style={{ fill: '#E2E8F0', fontSize: 12 }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {question.type === 'open-ended' && question.wordCloudData && (
                            <div style={{ width: '100%', height: 300 }}>
                               <WordCloud words={question.wordCloudData} options={wordCloudOptions} />
                            </div>
                        )}

                        {question.answers.length > 10 && (
                            <div className="mt-6 pt-4 border-t border-slate-700">
                                <h5 className="text-sm font-semibold text-slate-300 mb-2">Other Answers ({question.answers.length - 10} more)</h5>
                                <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 columns-1 md:columns-2">
                                    {question.answers.slice(10).map(answer => (
                                        <li key={answer.text} className="truncate" title={answer.text}>
                                            {answer.text}: <span className="font-semibold text-slate-300">{answer.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default BookingQuestionsAnalysis;