

import React from 'react';
import cloud from 'd3-cloud';
import { EventDetails, BookingQuestionsAnalysis, AggregatedQuestion, BookingQuestionResponse, WordCloudData } from '../types';
import SimpleBarChart from './EventsChart';

interface BookingQuestionsAnalysisProps {
    details: EventDetails;
    analysis?: BookingQuestionsAnalysis;
    onTriggerAnalysis: (force: boolean) => void;
    filterTicketGroupId: string;
    onFilterChange: (ticketGroupId: string) => void;
}

// Responsive wrapper for WordCloud using d3-cloud
const ResponsiveWordCloud: React.FC<{data: WordCloudData[]}> = ({data}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [words, setWords] = React.useState<cloud.Word[]>([]);
    const [size, setSize] = React.useState<{width: number, height: number} | null>(null);

    React.useLayoutEffect(() => {
        if (containerRef.current) {
            const observer = new ResizeObserver(entries => {
                const entry = entries[0];
                if (entry && entry.contentRect) {
                    setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
                }
            });
            observer.observe(containerRef.current);
            // Set initial size
            setSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
            return () => observer.disconnect();
        }
    }, []);

    React.useEffect(() => {
        if (!size || !size.width || data.length === 0) {
            setWords([]);
            return;
        };
        
        const minVal = data.length > 0 ? data[data.length - 1].value : 0;
        const maxVal = data.length > 0 ? data[0].value : 0;

        const fontScale = (value: number) => {
            if (maxVal === minVal) return 30; // middle of 14-60 range
            const minSize = 14;
            const maxSize = 60;
            // Use a sqrt scale for better distribution of font sizes
            const percent = (Math.sqrt(value) - Math.sqrt(minVal)) / (Math.sqrt(maxVal) - Math.sqrt(minVal));
            return percent * (maxSize - minSize) + minSize;
        };

        const layout = cloud()
            .size([size.width, size.height])
            .words(data.map(d => ({ ...d, size: fontScale(d.value) })))
            .padding(1)
            .rotate((d) => (d as WordCloudData).value % 2 === 0 ? 0 : -90)
            .font("sans-serif")
            .fontWeight("bold")
            .fontSize(d => d.size!)
            .on("end", (newWords) => {
                setWords(newWords);
            });
        
        layout.start();

        // Add a cleanup function to stop the layout calculation if the component unmounts.
        return () => {
            layout.stop();
        };

    }, [data, size]);

    const colors = ["#1E90FF", "#38B2AC", "#9F7AEA", "#ED8936", "#F56565", "#4299E1"];
    const fill = React.useCallback((d: cloud.Word, i: number) => colors[i % colors.length], []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            {size && (
                <svg width={size.width} height={size.height}>
                    <g transform={`translate(${size.width / 2},${size.height / 2})`}>
                        {words.map((word, i) => (
                            <text
                                key={word.text}
                                textAnchor="middle"
                                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                                style={{
                                    fontFamily: 'sans-serif',
                                    fontSize: word.size,
                                    fontWeight: 'bold',
                                    fill: fill(word, i),
                                }}
                            >
                                {word.text}
                            </text>
                        ))}
                    </g>
                </svg>
            )}
        </div>
    );
};


const BookingQuestionsAnalysis: React.FC<BookingQuestionsAnalysisProps> = ({ details, analysis, onTriggerAnalysis, filterTicketGroupId, onFilterChange }) => {

    const handleDownloadCsv = (question: AggregatedQuestion) => {
        const { allOrders = [], allAttendees = [] } = details;
        
        let rows = [['attendee_name', 'attendee_email', 'response_text']];
        const addedResponses = new Set<string>();

        const processResponses = (responses: BookingQuestionResponse[], name: string, email: string) => {
             for (const response of responses) {
                const answerText = response.answer || response.text;
                let responseMatches = false;

                if (typeof response.question === 'string') {
                    // In analysis, string question name is used as the unique ID
                    responseMatches = response.question === question.id;
                } else {
                    // For expanded question objects, use the ID
                    responseMatches = response.question.id === question.id;
                }

                if (responseMatches && answerText) {
                    const uniqueKey = `${name}-${email}-${answerText}`;
                    if (!addedResponses.has(uniqueKey)) {
                        rows.push([name, email, `"${answerText.replace(/"/g, '""')}"`]);
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
                             <div className="w-full">
                                <SimpleBarChart 
                                    data={question.answers}
                                    maxBars={10}
                                    sortBy="none"
                                    colorScheme="gradient"
                                    className="pr-4"
                                />
                            </div>
                        )}

                        {question.type === 'open-ended' && question.wordCloudData && question.wordCloudData.length > 0 && (
                            <div style={{ width: '100%', height: 300 }}>
                               <ResponsiveWordCloud data={question.wordCloudData} />
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