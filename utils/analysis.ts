
import { BookingQuestionResponse, BookingQuestionsAnalysis, WordCloudData, AggregatedQuestion, QuestionType, EventDetails } from '../types';

// Simple stop words list for word cloud
const stopWords = new Set(['i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','am','is','are','was','were','be','been','being','have','has','had','having','do','does','did','doing','a','an','the','and','but','if','or','because','as','until','while','of','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']);


interface AnalysisInput {
    allOrders: EventDetails['allOrders'];
    allAttendees: EventDetails['allAttendees'];
    ticketGroups: EventDetails['ticketGroups'];
    filterTicketGroupId: string;
}

export const runBookingQuestionsAnalysis = async ({
    allOrders = [],
    allAttendees = [],
    ticketGroups = [],
    filterTicketGroupId
}: AnalysisInput): Promise<BookingQuestionsAnalysis | null> => {
    
    let ordersToProcess = allOrders;
    let attendeesToProcess = allAttendees;

    if (filterTicketGroupId !== 'all') {
        const selectedTicketGroup = ticketGroups.find(tg => tg.id === filterTicketGroupId);
        if (selectedTicketGroup) {
            ordersToProcess = allOrders.filter(order =>
                order.order_lines.data.some(line => line.name === selectedTicketGroup.name)
            );
            // CRITICAL: We cannot reliably link attendees to ticket types with the current data model.
            // Therefore, when filtering by ticket type, we only analyze order-scoped questions.
            attendeesToProcess = [];
        }
    }

    const questionMap: { [key: string]: { name: string; answers: { [key: string]: number } } } = {};

    const processResponses = (responses: BookingQuestionResponse[]) => {
        if (!responses) return;
        for (const response of responses) {
            if (!response.question || !response.text) continue;
            const questionId = response.question.id;
            const questionName = response.question.name;
            const answerText = response.text.trim();
            if (!answerText) continue;
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
