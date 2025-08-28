import React from 'react';
import cloud from 'd3-cloud';
import { EventDetails, BookingQuestionsAnalysis, AggregatedQuestion, BookingQuestionResponse, WordCloudData } from '../types';
import SimpleBarChart from './EventsChart';
import BookingQuestionDetailsModal from './BookingQuestionDetailsModal';
import SimpleDonutChart from './SimpleDonutChart';
import { BarChartIcon, PieChartIcon, CloudIcon } from './icons';

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
            .rotate(() => 0) // Render all words horizontally for clarity
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

const BQ_CHART_PREFS_KEY = 'billetto-bq-chart-preferences';

const processAgeQuestion = (question: AggregatedQuestion): AggregatedQuestion => {
    // Check if it's an age question based on its name.
    if (!question.name.toLowerCase().includes('age')) {
        return question;
    }

    const ageRanges: { [range: string]: { count: number; sortOrder: number } } = {};

    // Group individual age answers into decade ranges (e.g., 20-29, 30-39).
    question.answers.forEach(answer => {
        const age = parseInt(answer.text, 10);
        // Validate that the answer is a reasonable number for an age.
        if (!isNaN(age) && age >= 0 && age < 150) {
            const lowerBound = Math.floor(age / 10) * 10;
            const upperBound = lowerBound + 9;
            const rangeLabel = `${lowerBound}-${upperBound}`;

            if (!ageRanges[rangeLabel]) {
                ageRanges[rangeLabel] = { count: 0, sortOrder: lowerBound };
            }
            ageRanges[rangeLabel].count += answer.count;
        }
    });

    // If no valid age data was found, return the original question data.
    if (Object.keys(ageRanges).length === 0) {
        return question;
    }

    // Convert the aggregated ranges back into the format expected by the chart components.
    const newAnswers = Object.entries(ageRanges)
        .map(([range, data]) => ({
            text: range,
            count: data.count,
            sortOrder: data.sortOrder
        }))
        // Sort by age range descending (oldest first) as requested.
        .sort((a, b) => b.sortOrder - a.sortOrder)
        // Remove the temporary sortOrder property.
        .map(({ text, count }) => ({ text, count }));

    // Return a new question object with the aggregated and sorted answers.
    // Force the type to 'multiple-choice' to ensure it's always displayed as a chart.
    return {
        ...question,
        answers: newAnswers,
        type: 'multiple-choice',
    };
};


const BookingQuestionsAnalysis: React.FC<BookingQuestionsAnalysisProps> = ({ details, analysis, onTriggerAnalysis, filterTicketGroupId, onFilterChange }) => {
    const [selectedQuestion, setSelectedQuestion] = React.useState<AggregatedQuestion | null>(null);

    // Store all preferences in one state object, keyed by event ID.
    const [allChartPrefs, setAllChartPrefs] = React.useState<{[eventId: string]: {[questionId: string]: 'bar' | 'donut' | 'cloud'}}>(() => {
        try {
            const savedPrefs = localStorage.getItem(BQ_CHART_PREFS_KEY);
            return savedPrefs ? JSON.parse(savedPrefs) : {};
        } catch (error) {
            console.error("Failed to parse chart preferences from localStorage", error);
            return {};
        }
    });

    // Persist preferences to localStorage whenever they change.
    React.useEffect(() => {
        try {
            localStorage.setItem(BQ_CHART_PREFS_KEY, JSON.stringify(allChartPrefs));
        } catch (error) {
            console.error("Failed to save chart preferences to localStorage", error);
        }
    }, [allChartPrefs]);

    const eventId = details.event.id;

    const handleChartTypeChange = (questionId: string, type: 'bar' | 'donut' | 'cloud') => {
        setAllChartPrefs(prev => {
            const eventPrefs = prev[eventId] || {};
            return {
                ...prev,
                [eventId]: {
                    ...eventPrefs,
                    [questionId]: type
                }
            };
        });
    };

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

    return (
        <div className="space-y-8 animate-fade-in" role="tabpanel">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 flex-wrap">
                <div>
                     <label htmlFor="ticket-type-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300 mr-2">Filter by Ticket Type:</label>
                    <select 
                        id="ticket-type-filter" 
                        disabled={details.ticketGroups.length === 0} 
                        className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
                        value={filterTicketGroupId}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value="all">All Ticket Types</option>
                        {details.ticketGroups.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
                    </select>
                </div>
                <button onClick={() => onTriggerAnalysis(true)} className="bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    Re-Analyze Data
                </button>
            </div>

            {(!analysis || analysis.length === 0) ? (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <div className="text-center py-16 bg-white/50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400">
                            {filterTicketGroupId !== 'all'
                                ? 'No booking question responses found for the selected ticket type.'
                                : 'No booking question responses found for this event.'
                            }
                        </p>
                    </div>
                </div>
            ) : (
                analysis.map(originalQuestion => {
                    const question = processAgeQuestion(originalQuestion);
                    const currentChartType = allChartPrefs[eventId]?.[question.id] || 'bar';

                    const availableViews: {type: 'bar' | 'donut' | 'cloud', icon: React.ReactNode, label: string}[] = [];
                    if (question.type === 'multiple-choice') {
                        availableViews.push({ type: 'bar', icon: <BarChartIcon />, label: 'Bar Chart' });
                        availableViews.push({ type: 'donut', icon: <PieChartIcon />, label: 'Donut Chart' });
                    } else { // open-ended
                        availableViews.push({ type: 'bar', icon: <BarChartIcon />, label: 'Bar Chart' });
                        if(question.wordCloudData && question.wordCloudData.length > 0) {
                            availableViews.push({ type: 'cloud', icon: <CloudIcon />, label: 'Word Cloud' });
                        }
                    }

                    const renderChart = () => {
                        switch (currentChartType) {
                            case 'bar':
                                return (
                                    <div className="w-full">
                                        <SimpleBarChart 
                                            data={question.answers}
                                            maxBars={15}
                                            sortBy={question.name.toLowerCase().includes('age') ? 'none' : 'value'}
                                            colorScheme="gradient"
                                            className="pr-4"
                                            showPercentages={true}
                                        />
                                    </div>
                                );
                            case 'donut':
                                return <SimpleDonutChart data={question.answers} />;
                            case 'cloud':
                                if (question.wordCloudData && question.wordCloudData.length > 0) {
                                    return (
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveWordCloud data={question.wordCloudData} />
                                        </div>
                                    );
                                }
                                return <p className="text-slate-500 dark:text-slate-400">Not enough data for word cloud.</p>;
                            default:
                                return null;
                        }
                    }

                    return (
                        <div key={question.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                            <div className="flex justify-between items-start gap-4 mb-1">
                                <button onClick={() => setSelectedQuestion(question)} className="text-left group flex-1 min-w-0">
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors truncate" title={question.name}>
                                        {question.name}
                                    </h4>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex items-center gap-1">
                                        {availableViews.map(view => (
                                            <button 
                                                key={view.type}
                                                onClick={() => handleChartTypeChange(question.id, view.type)}
                                                className={`p-1.5 rounded-md transition-colors ${currentChartType === view.type ? 'bg-brand-primary text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-white'}`}
                                                aria-label={`Switch to ${view.label}`}
                                                title={view.label}
                                            >
                                                {view.icon}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => handleDownloadCsv(question)} className="flex-shrink-0 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-1 px-3 rounded-lg transition-colors">
                                        Download CSV
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Total Responses: {question.totalResponses.toLocaleString()}</p>
                            
                            <div className="w-full min-h-[300px] flex items-center justify-center">
                                {renderChart()}
                            </div>

                            {question.answers.length > 15 && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Other Answers ({question.answers.length - 15} more)</h5>
                                    <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 space-y-1 columns-1 md:columns-2">
                                        {question.answers.slice(15).map(answer => (
                                            <li key={answer.text} className="truncate" title={answer.text}>
                                                {answer.text}: <span className="font-semibold text-slate-600 dark:text-slate-300">{answer.count}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {selectedQuestion && (
                <BookingQuestionDetailsModal
                    question={selectedQuestion}
                    details={details}
                    onClose={() => setSelectedQuestion(null)}
                />
            )}
        </div>
    );
};

export default BookingQuestionsAnalysis;