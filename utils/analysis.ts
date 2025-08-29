

import { BookingQuestionResponse, BookingQuestionsAnalysis, WordCloudData, AggregatedQuestion, QuestionType, EventDetails, Attendee, Scanning, TicketGroup } from '../types';

// Simple stop words list for word cloud
const stopWords = new Set(['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']);


interface AnalysisInput {
    allOrders: EventDetails['allOrders'];
    allAttendees: EventDetails['allAttendees'];
    ticketGroups: EventDetails['ticketGroups'];
    filterTicketGroupId: string;
}

export interface ScanningDataPoint {
    time: string; // e.g., "18:00 - 18:15"
    count: number;
}

export interface RejectedScan {
    time: string;
    message: string;
    scannerName: string | null;
    attendeeName: string; 
}

export interface CheckinAnalytics {
    arrivalData: ScanningDataPoint[];
    rejectedScans: RejectedScan[];
    totalAcceptedScans: number;
    totalRejectedScans: number;
    peakTime: string | null;
}

export const analyzeCheckinData = (allAttendees: Attendee[]): CheckinAnalytics | undefined => {
    const allScans: (Scanning & { attendeeName: string })[] = [];
    allAttendees.forEach(attendee => {
        if (attendee.scannings?.data) {
            attendee.scannings.data.forEach(scan => {
                allScans.push({ ...scan, attendeeName: attendee.name });
            });
        }
    });

    if (allScans.length === 0) {
        return undefined;
    }

    const acceptedScans = allScans.filter(s => s.status === 'accepted');
    const rejectedScansRaw = allScans.filter(s => s.status === 'rejected');

    const arrivalIntervals: { [key: string]: number } = {};
    acceptedScans.forEach(scan => {
        const scanTime = new Date(scan.created_at);
        const minutes = scanTime.getMinutes();
        const startMinute = Math.floor(minutes / 15) * 15;
        
        const intervalStart = new Date(scanTime);
        intervalStart.setMinutes(startMinute, 0, 0);

        const intervalEnd = new Date(intervalStart);
        intervalEnd.setMinutes(intervalStart.getMinutes() + 15);

        const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        const key = `${formatTime(intervalStart)} - ${formatTime(intervalEnd)}`;
        arrivalIntervals[key] = (arrivalIntervals[key] || 0) + 1;
    });

    const arrivalData: ScanningDataPoint[] = Object.entries(arrivalIntervals)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));

    const rejectedScans: RejectedScan[] = rejectedScansRaw
        .map(scan => ({
            time: new Date(scan.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            message: scan.message || 'No message provided',
            scannerName: scan.scanner_name,
            attendeeName: scan.attendeeName,
        }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const totalAcceptedScans = acceptedScans.length;
    const totalRejectedScans = rejectedScansRaw.length;
    const peakInterval = arrivalData.length > 0
        ? arrivalData.reduce((peak, current) => (current.count > peak.count ? current : peak))
        : null;

    return {
        arrivalData,
        rejectedScans,
        totalAcceptedScans,
        totalRejectedScans,
        peakTime: peakInterval ? peakInterval.time : null,
    };
};


export const runBookingQuestionsAnalysis = async ({
    allOrders = [],
    allAttendees = [],
    ticketGroups = [],
    filterTicketGroupId
}: AnalysisInput): Promise<BookingQuestionsAnalysis | null> => {
    
    let ordersToProcess = allOrders;
    let attendeesToProcess = allAttendees;

    if (filterTicketGroupId !== 'all') {
        // Use the new direct link from attendee to ticket_type for more accurate filtering.
        attendeesToProcess = allAttendees.filter(attendee => {
            const ticketType = attendee.ticket_type;
            if (typeof ticketType === 'string') {
                return ticketType === filterTicketGroupId;
            } else if (ticketType && typeof ticketType === 'object' && 'id' in ticketType) {
                return (ticketType as TicketGroup).id === filterTicketGroupId;
            }
            return false;
        });

        // Filter orders to only include those associated with the filtered attendees.
        // This is still needed for order-scoped questions.
        const relevantOrderIds = new Set(attendeesToProcess.map(a => a.order).filter(Boolean));
        ordersToProcess = allOrders.filter(o => relevantOrderIds.has(o.id));
    }

    const questionMap: { [key: string]: { name: string; answers: { [key: string]: number } } } = {};

    const processResponses = (responses: BookingQuestionResponse[]) => {
        if (!responses) return;
        for (const response of responses) {
            const answerText = (response.answer || response.text || '').trim();

            if (!response.question || !answerText) {
                continue;
            }

            let questionId: string;
            let questionName: string;

            // Handle cases where API sends question as a string (name) instead of an expanded object
            if (typeof response.question === 'string') {
                questionName = response.question;
                questionId = response.question; // Use the name as a unique key for grouping
            } else {
                // This is the expected expanded object case
                questionId = response.question.id;
                questionName = response.question.name;
            }

            if (!questionMap[questionId]) {
                questionMap[questionId] = { name: questionName, answers: {} };
            }
            if (!questionMap[questionId].answers[answerText]) {
                questionMap[questionId].answers[answerText] = 0;
            }
            questionMap[questionId].answers[answerText]++;
        }
    };

    ordersToProcess.forEach(order => processResponses(order.booking_question_responses?.data || []));
    attendeesToProcess.forEach(attendee => processResponses(attendee.booking_question_responses?.data || []));

    const analysisResult: AggregatedQuestion[] = Object.entries(questionMap).map(([id, data]) => {
        const sortedAnswers = Object.entries(data.answers)
            .map(([text, count]) => ({ text, count }))
            .sort((a, b) => b.count - a.count);

        const totalResponses = sortedAnswers.reduce((sum, answer) => sum + answer.count, 0);
        const is_open_ended = sortedAnswers.length > 15 || totalResponses < sortedAnswers.length * 1.5;

        const questionType: QuestionType = is_open_ended ? 'open-ended' : 'multiple-choice';

        let wordCloudData: WordCloudData[] | undefined;
        if (is_open_ended) {
            const wordCounts: { [key: string]: number } = {};
            sortedAnswers.forEach(answer => {
                const words: string[] = answer.text.toLowerCase().match(/\b(\w+)\b/g) || [];
                words.forEach(word => {
                    if (word.length > 2 && !stopWords.has(word)) {
                        wordCounts[word] = (wordCounts[word] || 0) + answer.count;
                    }
                });
            });
            wordCloudData = Object.entries(wordCounts)
                .map(([text, value]) => ({ text, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 100);
        }

        return {
            id,
            name: data.name,
            totalResponses,
            answers: sortedAnswers,
            type: questionType,
            wordCloudData,
        };
    }).sort((a, b) => b.totalResponses - a.totalResponses);

    return analysisResult.length > 0 ? analysisResult : null;
};