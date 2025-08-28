
export interface ListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  total: number;
  url: string;
  next_url?: string;
}

export interface BookingQuestion {
  id: string;
  object: 'booking_question';
  name: string;
  description?: string;
  required: boolean;
  scope: 'order' | 'ticket';
}

/**
 * Represents a response to a booking question.
 * Note on API inconsistencies:
 * - The response text is primarily in the `answer` field in recent API versions.
 *   The `text` field may be present in older data and is used as a fallback.
 * - The `question` field can be either a simple `string` (the question's name/title)
 *   or an expanded `BookingQuestion` object if requested via `expand`. The application
 *   logic must handle both formats.
 */
export interface BookingQuestionResponse {
  id:string;
  object: 'booking_question_response';
  text?: string;
  answer?: string;
  question: BookingQuestion | string;
  description?: string;
  required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Scanning {
  id: string;
  object: 'scanning';
  created_at: string;
  status: 'accepted' | 'rejected' | string;
  message: string | null;
  scanner_name: string | null;
}

export interface TicketBuyer {
    id: string;
    object: 'ticket_buyer';
    name: string;
    email: string;
}

export interface Space {
    id: string;
    object: 'space';
    label: string;
    seat_category?: string;
}

export interface Subscription {
    id: string;
    object: 'subscription';
    name: string;
    state: string;
    created_at: string;
    expires_at?: string;
}

export interface Membership {
    id: string;
    object: 'membership';
    name: string;
    state: string;
    created_at: string;
    expires_at?: string;
}

// ---- START OF ADDED TYPES ----

export type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
    key: keyof T | string;
    direction: SortDirection;
}

export interface ModalView {
  title: string;
  content: (props: any) => React.ReactNode;
}

export interface Venue {
    id: string;
    name: string;
}

export interface Location {
    id: string;
    full_address: string;
    name: string;
}

export interface Organization {
    id: string;
    name: string;
}

export interface Editorial {
    description_html?: string;
    description?: string;
    tags?: string[];
}

export interface BillettoEvent {
    id: string;
    object: 'event';
    name: string;
    starts_at: string;
    state: string;
    currency: string;
    public_url: string;
    parent?: BillettoEvent | string;
    availability?: {
        available?: number;
    };
    venue?: Venue | string;
    location?: Location | string;
    organization?: Organization | string;
    editorial?: Editorial | string;
}

export interface EventGroup extends BillettoEvent {
    isGroup: true;
    children: BillettoEvent[];
}

export type EventListItemType = BillettoEvent | EventGroup;

export interface TicketGroup {
    id: string;
    object: 'ticket_type';
    name: string;
    price: number;
    state: 'on_sale' | 'sold_out' | 'off_sale' | 'hidden';
    quantity: number | null;
    admission: boolean;
    sells_from: string | null;
    sells_to: string | null;
    type?: string; // e.g., "PayTicketType", "AddonTicketType"
    // Calculated fields
    sold_count?: number;
    revenue?: number;
    estimatedFees?: number;
    netRevenue?: number;
    profitMargin?: number;
}

export interface Attendee {
    id: string;
    object: 'attendee';
    name: string;
    email: string;
    state: string;
    price: number;
    created_at: string;
    event?: BillettoEvent | string;
    order?: string;
    booking_question_responses?: ListResponse<BookingQuestionResponse>;
    scannings?: ListResponse<Scanning>;
    ticket_buyer?: TicketBuyer | string;
    space?: Space | string;
    membership?: Membership | string;
    subscription?: Subscription | string;
    newsletter_permission?: boolean;
    city?: string;
    country_code?: string;
}

export interface OrderLine {
    id: string;
    object: 'order_line';
    name: string;
    quantity: number;
    unit_price: number;
    currency: string;
}

export interface Refund {
    id: string;
    object: 'refund';
    reason: string | null;
    created_at: string;
    amount: number;
    currency: string;
}

export interface OrderTransaction {
    id: string;
    object: 'order_transaction';
    state: 'successful' | 'failed' | string;
    payment_method: string | null;
    payment_gateway_identifier?: string;
    terminal_name?: string;
    created_at: string;
    amount: number;
    currency: string;
    refunds?: ListResponse<Refund>;
}

export interface Order {
    id: string;
    object: 'order';
    created_at: string;
    buyer_name: string;
    email: string;
    event?: BillettoEvent | string;
    state: string;
    payout: number;
    currency: string;
    manage_url?: string;
    sales_channel?: string;
    subtotal: number;
    payment_fees: number;
    billetto_fees: number;
    order_lines: ListResponse<OrderLine>;
    order_transactions: ListResponse<OrderTransaction>;
    booking_question_responses?: ListResponse<BookingQuestionResponse>;
}

export interface LedgerEntry {
    id: string;
    object: 'ledger_entry';
    created_at: string;
    entry_type: string;
    entry_subtype?: string;
    event?: BillettoEvent | null;
    event_id?: string | null;
    vat: number;
    amount: number;
    currency: string;
    order_id?: string | number | null;
    transaction_type?: string;
    source?: string | null;
}

export interface CampaignConditionData {
    code?: string;
    start?: string;
    end?: string;
    target_group?: string;
}

export interface CampaignCondition {
    id: string;
    type: string;
    data: CampaignConditionData;
}

export interface CampaignEffectData {
    percentage_discount?: string;
    ticket_types?: ListResponse<{ id: string, name: string }>;
    usage_limit?: number | null;
}

export interface CampaignEffect {
    id: string;
    type: string;
    data: CampaignEffectData;
}

export interface Campaign {
    id: string;
    object: 'campaign';
    name: string;
    event?: BillettoEvent | string | null;
    state: string;
    applications_count: number;
    conditions: ListResponse<CampaignCondition>;
    effects: ListResponse<CampaignEffect>;
}

export interface TicketTypePerformance {
    text: string;
    count: number;
}

export interface ProcessedCampaign extends Campaign {
    eventName: string;
    discountDisplay: string;
    discountValueForSort: number;
    usageCount: number;
    usageLimit: number | null;
    generatedRevenue?: number;
    totalDiscounts?: number;
    netRevenue?: number;
    averageOrderValue?: number;
    currency?: string;
    roi?: number;
    ticketTypePerformance?: TicketTypePerformance[];
}

export interface SegmentRule {
    field: string;
    operator: string;
    value: string | string[];
}

export interface Segment {
    id: string;
    rules: SegmentRule[];
}

export interface TargetGroup {
    id: string;
    object: 'target_group';
    name: string;
    kind: string;
    segments?: Segment[];
}

export interface TargetGroupMember {
    id: string;
    object: 'target_group_member';
    name?: string;
    email?: string;
    code?: string;
    limit?: number | null;
    quantity?: number | null;
}

export interface AvailableQuestion {
    id: string;
    name: string;
}

export interface SalesChannelData {
    name: string;
    count: number;
    children?: SalesChannelData[];
}

export interface CampaignTimeBlock {
    name: string;
    start: string;
    end: string;
}

export interface ScanningDataPoint {
    time: string;
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

export interface GeographicSaleData {
    name: string;
    totalCount: number;
    countByTicketType: Record<string, number>;
}

export interface PurchaseLeadTimeData {
    name: string;
    tickets: number;
    sortOrder: number;
}

export interface FinancialSummary {
    grossRevenue: number;
    billettoFees: number;
    netPayout: number;
    totalRefunded: number;
    totalChargebacks: number;
}

export interface EventStats {
    totalTicketsSold: number;
    totalRevenue: number;
    currency: string;
    newsletterOptInRate: number;
}

export interface AddonAffinityInfo {
    addonName: string;
    purchaseCount: number;
    affinity: number; // as a percentage, 0-100
}

export interface AddonAffinity {
    admissionTicketName: string;
    totalAdmissionTicketsSold: number;
    topAddons: AddonAffinityInfo[];
}

export type RefundAnalysis = { reason: string; count: number }[];

export interface DeadlineUrgencyData {
    ticketTypeName: string;
    sellsToDate: string;
    totalTicketsInWindow: number;
    salesData: {
        date: string;
        ticketsSold: number;
        daysBeforeDeadline: number;
    }[];
}

export interface EventDetails {
    event: BillettoEvent;
    attendees: Attendee[];
    ticketGroups: TicketGroup[];
    stats: EventStats;
    financialSummary?: FinancialSummary;
    salesByChannel?: SalesChannelData[];
    salesVelocity?: { date: string; tickets: number }[];
    revenueBySource?: { name: string; revenue: number }[];

    allOrders?: Order[];
    allAttendees?: Attendee[];
    allLedgerEntries?: LedgerEntry[];
    bookingQuestionsAnalysis?: BookingQuestionsAnalysis;
    bookingQuestionsLoaded: boolean;
    checkinAnalytics?: CheckinAnalytics;
    purchaseLeadTime?: PurchaseLeadTimeData[];
    groupPurchaseAnalysis?: { text: string; count: number }[];
    salesByCity?: GeographicSaleData[];
    salesByCountry?: GeographicSaleData[];
    activeCampaigns?: CampaignTimeBlock[];
    addonAffinity?: AddonAffinity[];
    refundAnalysis?: RefundAnalysis;
    deadlineUrgency?: DeadlineUrgencyData[];
}

export type QuestionType = 'open-ended' | 'multiple-choice';

export interface WordCloudData {
    text: string;
    value: number;
}

export interface AggregatedQuestion {
    id: string;
    name: string;
    totalResponses: number;
    answers: { text: string; count: number }[];
    type: QuestionType;
    wordCloudData?: WordCloudData[];
}

export type BookingQuestionsAnalysis = AggregatedQuestion[];

export interface AudienceMember {
    id: string; // email
    email: string;
    name: string;
    totalSpent: number;
    currency: string;
    eventsAttended: number;
    lastAttendedDate: string | null;
    orders: Order[];
    attendees: Attendee[];
    // RFM Fields
    recencyScore?: number;
    frequencyScore?: number;
    monetaryScore?: number;
    rfmSegment?: string;
}

export interface AnalyzedEvent extends BillettoEvent {
    grossRevenue: number;
    totalFees: number;
    totalRefundsAndChargebacks: number;
    netProfit: number;
    profitMargin: number;
    ticketCount: number;
}
export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface BackgroundTask {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'error';
    progress?: number;
    message?: string;
}

export type RunTaskInBackgroundSignature = <T>(
    id: string,
    name: string,
    taskFn: (updateProgress: (progress: { value: number; message: string }) => void) => Promise<T>,
    onSuccess?: (result: T) => void
) => void;
