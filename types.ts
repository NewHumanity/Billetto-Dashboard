

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

export interface GalleryItem {
    id: string;
    object: 'gallery_item';
    type: 'unsplash' | 'upload';
    original_url: string;
    cropped_url: string;
    position: number;
}

export interface Headliner {
    id: string;
    object: 'headliner';
    name: string;
    title?: string;
    description?: string;
    image_url?: string;
}

export interface Editorial {
    host?: string;
    description?: string;
    description_html?: string;
    tags?: string[];
    gallery_items?: ListResponse<GalleryItem>;
    headliners?: ListResponse<Headliner>;
}

export interface Categorisation {
    category?: string;
    subcategory?: string;
    type?: string;
}

export interface Plan {
    id: string;
    object: 'plan';
    name: string;
    price: number;
    interval: 'day' | 'week' | 'month' | 'year';
}

export interface BillettoEvent {
    id: string;
    object: 'event';
    name: string;
    starts_at: string;
    ends_at?: string;
    state: string;
    currency: string;
    public_url: string;
    parent?: BillettoEvent | string | null;
    kind: 'regular' | 'recurring' | 'scheduled' | 'sub_event' | 'subscription';
    total_capacity?: number | null;
    online_event?: boolean;
    availability?: {
        available?: number;
    };
    venue?: Venue | string;
    location?: Location | string;
    organization?: Organization | string;
    editorial?: Editorial | string;
    categorisation?: Categorisation;
    plans?: ListResponse<Plan>;
}

export interface EventGroup extends BillettoEvent {
    isGroup: true;
    children: BillettoEvent[];
}

export type EventListItemType = BillettoEvent | EventGroup;

export interface TicketGroup {
    id: string;
    object: 'ticket_type';
    uuid: string;
    name: string;
    price: number;
    state: 'on_sale' | 'sold_out' | 'off_sale' | 'hidden';
    quantity: number | null;
    description?: string;
    min_tickets_per_order?: number;
    max_tickets_per_order?: number | null;
    sales_period?: string;
    sells_from: string | null;
    sells_to: string | null;
    vat_rate?: number | null;
    admission: boolean;
    addons?: boolean;
    vip?: boolean;
    type?: string; // e.g., "PayTicketType", "AddonTicketType"
    event?: string;
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
    photo?: string | null;
    type?: string;
    state: string;
    price: number;
    fee: number;
    created_at: string;
    event?: BillettoEvent | string;
    order?: string;
    booking_question_responses?: ListResponse<BookingQuestionResponse>;
    scannings?: ListResponse<Scanning>;
    ticket_buyer?: TicketBuyer | string;
    ticket_type?: TicketGroup | string;
    space?: Space | string;
    membership?: Membership | string;
    subscription?: Subscription | string;
    newsletter_permission?: boolean;
    city?: string;
    country_code?: string;
    phone_number?: string;
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
    payment_gateway_transaction_id?: string;
    payment_gateway_order_id?: string;
    sales_channel?: string;
    revenue_channel?: string;
    terminal_name?: string;
    amount: number;
    refunded_amount?: number;
    balance?: number;
    created_at: string;
    updated_at?: string;
    successful_at?: string;
    refunded_at?: string;
    captured_at?: string;
    currency: string;
    refunds?: ListResponse<Refund>;
}

export interface Address {
    id: string;
    object: 'address';
    type: 'personal' | 'company';
    first_name?: string;
    last_name?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    postal_code: string;
    country_code: string;
    company_name?: string;
    company_vat_number?: string;
}

export interface Order {
    id: string;
    object: 'order';
    created_at: string;
    buyer_name: string;
    email: string;
    phone?: string;
    ip?: string;
    event?: BillettoEvent | string;
    state: string;
    payout: number;
    currency: string;
    manage_url?: string;
    sold_by?: string;
    sales_channel?: string;
    revenue_channel?: string;
    terminal_name?: string;
    subtotal: number;
    payment_fees: number;
    billetto_fees: number;
    address?: Address | string;
    subscription?: Subscription | null;
    order_lines: ListResponse<OrderLine>;
    order_transactions: ListResponse<OrderTransaction>;
    booking_question_responses?: ListResponse<BookingQuestionResponse>;
}

export interface LedgerEntry {
    id: string;
    object: 'ledger_entry';
    time?: string;
    created_at: string;
    entry_type: string;
    entry_subtype?: string;
    revenue_subtype?: string;
    event?: BillettoEvent | null;
    event_id?: string | null;
    vat: number;
    vat_rate?: string | null;
    amount: number;
    currency: string;
    order_id?: string | number | null;
    transaction_type?: string;
    purchase_terminal?: string;
    terminal_name?: string;
    cash_register_session_uuid?: string;
    payment_gateway?: string;
    revenue_channel?: string;
    source?: string | null;
    medium?: string | null;
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
}

export interface CampaignEffect {
    id: string;
    type: string;
    data: CampaignEffectData;
    usage_limit?: number | null;
    orders_limit?: number | null;
    order_limit?: number | null;
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
    object: 'segment';
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
    netRevenue: number;
    billettoFees: number;
    netPayout: number;
    totalRefunded: number;
    totalChargebacks: number;
}

export interface EventStats {
    totalTicketsSold: number;
    netRevenue: number;
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
    count?: number;
}

export interface BackgroundTask {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'error' | 'cancelled';
    progress?: number;
    message?: string;
}

export type RunTaskInBackgroundSignature = <T>(
    id: string,
    name: string,
    taskFn: (
        updateProgress: (progress: { value: number; message: string }) => void,
        signal: AbortSignal
    ) => Promise<T>,
    onSuccess?: (result: T) => void
) => void;

// Fix: Moved from App.tsx to break circular dependencies
export type View = 'dashboard' | 'performance' | 'orders' | 'ledger' | 'campaigns' | 'targetGroups' | 'attendees' | 'audience';
export type Theme = 'light' | 'dark' | 'system';
export type AddToastFn = (message: string, type: Toast['type']) => void;
