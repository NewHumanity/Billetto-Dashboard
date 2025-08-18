

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
    event_id: string;
}

export interface Attendee {
  id: string;
  object: 'attendee';
  name: string;
  email: string;
  price: number; // in cents
  fee: number; // in cents
  created_at: string;
  updated_at: string;
  state: 'sold' | 'reserved' | 'refunded' | 'manually_generated' | 'cancelled' | 'available' | 'door_sale' | 'draft' | 'failed' | 'mass_generated';
  
  // Relationships
  event?: {
    id: string;
    name: string;
    starts_at: string;
    currency: string;
  } | string; // Can be expanded object or string ID
  events?: ListResponse<BillettoEvent>; // Added based on API docs (hidden but expandable)
  order?: string;
  order_line?: string;
  ticket_type?: string;
  ticket_buyer?: TicketBuyer | string; // ID of the buyer
  membership?: Membership | string | null;
  subscription?: Subscription | string | null;

  // Ticket Details
  barcode: string;
  type: string; // e.g., 'ticket'
  fee_included: boolean;
  space?: Space | string | null;

  // Personal Info
  newsletter_permission: boolean;
  address_line_1?: string;
  address_line_2?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
  phone_number?: string;
  photo?: string | null;
  
  // Nested Data
  booking_question_responses?: ListResponse<BookingQuestionResponse>;
  scannings?: ListResponse<Scanning>;
}

export interface Venue {
  id: string;
  object: 'venue';
  name: string;
}

export interface Location {
  id: string;
  object: 'location';
  name: string;
  full_address: string;
}

export interface Organization {
  id: string;
  object: 'organization';
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

export interface Categorisation {
    category?: string | null;
    subcategory?: string | null;
    type?: string | null;
}

export interface Editorial {
  host?: string;
  description?: string;
  description_html?: string;
  tags?: string[];
  gallery_items?: ListResponse<GalleryItem>;
  headliners?: ListResponse<Headliner>;
}

export interface BillettoEvent {
  id: string;
  object: 'event';
  name: string;
  currency: string;
  state: 'canceled' | 'completed' | 'deleted' | 'draft' | 'published' | 'publishing';
  public: boolean;
  starts_at: string;
  ends_at: string;
  public_url: string;
  availability: {
    available: number;
    status: 'sold_out' | 'low' | 'medium' | 'high';
  };
  kind?: 'recurring' | 'regular' | 'scheduled' | 'sub_event' | 'subscription';
  parent?: { id: string; name?: string } | string;
  venue?: Venue | string | null;
  location?: Location | string | null;
  organization?: Organization | string | null;
  editorial?: Editorial | string | null;
  categorisation?: Categorisation;
}

export interface EventGroup extends BillettoEvent {
  isGroup: true;
  children: BillettoEvent[];
}

export type EventListItemType = BillettoEvent | EventGroup;


export interface OrderLine {
  id: string;
  object: 'order_line';
  name: string;
  quantity: number;
  unit_price: number;
  fee: number;
  currency: string;
}

export interface Refund {
  id: string;
  object: 'refund';
  amount: number; // in cents
  currency: string;
  reason: 'duplicate' | 'fraudulent' | 'customer_requested' | string | null;
  created_at: string;
  order_transaction: string; // ID of the parent transaction
}

export interface OrderTransaction {
  id: string;
  object: 'order_transaction';
  currency: string;
  state: 'successful' | 'failed' | 'pending';
  payment_gateway_transaction_id?: string;
  payment_method: string;
  payment_gateway_identifier?: string;
  payment_gateway_order_id?: string;
  sales_channel?: string;
  revenue_channel?: string;
  terminal_name?: string | null;
  amount: number; // in cents
  refunded_amount?: number; // in cents
  balance?: number; // in cents
  created_at: string;
  updated_at?: string;
  successful_at: string | null;
  refunded_at?: string | null;
  captured_at?: string | null;
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
  id:string;
  object: 'order';
  email: string;
  state: 'successful' | 'failed' | 'pending' | string;
  buyer_name: string;
  phone?: string;
  ip?: string;
  sold_by?: string;
  terminal_name?: string;
  revenue_channel?: string;
  created_at: string;
  updated_at?: string;
  currency: string;
  event: BillettoEvent | string; // Can be an expanded object or just the ID
  address?: Address | string | null;
  subscription?: Subscription | string | null;
  order_lines: ListResponse<OrderLine>;
  subtotal: number;
  payment_fees: number;
  billetto_fees: number;
  payout: number; // in cents
  sales_channel: string;
  booking_question_responses?: ListResponse<BookingQuestionResponse>;
  manage_url?: string;
  order_transactions?: ListResponse<OrderTransaction>;
}

export interface LedgerEntry {
  id: string;
  object: 'ledger_entry';
  time?: string;
  created_at: string;
  entry_type: 'ORDER_REVENUE' | 'ORGANIZER_PAYMENT_FEE' | 'TICKETS_FEE' | 'IMMEDIATE_PAYOUT' | 'COMMISSION' | 'IMMEDIATE_PAYOUT_WITHDRAWAL' | 'CHARGEBACK' | 'PROMOTION_FEE' | 'INVOICE_FEE' | 'WALLET_CHARGE' | 'DISCOUNTS' | 'PAYOUT' | 'REFUND';
  entry_subtype?: string;
  revenue_subtype?: string | null;
  purchase_terminal?: string;
  terminal_name?: string | null;
  cash_register_session_uuid?: string | null;
  payment_gateway?: string;
  revenue_channel?: string;
  transaction_type?: string;
  amount: number; // in cents
  vat: number; // in cents
  currency: string;
  vat_rate?: string | null;
  event?: {
    id: string;
    name: string;
  };
  event_id?: string | number;
  order_id?: string | number;
  source?: string;
  medium?: string;
}

export interface CampaignConditionData {
  code?: string;
  target_group?: string;
  start?: string;
  end?: string;
}

export interface CampaignCondition {
  id: string;
  object: 'campaign_condition';
  type: 'accesscode' | 'targetgroup' | 'time' | string;
  data: CampaignConditionData;
}

export interface CampaignEffectData {
  percentage_discount?: string | number;
  ticket_types?: ListResponse<{ id: string; name: string }>;
  categories?: any[];
}

export interface CampaignEffect {
  id: string;
  object: 'campaign_effect';
  type: 'percentage-discount-ticket-type-price' | 'unlock-ticket-types' | string;
  usage_limit: number | null;
  orders_limit: number | null;
  order_limit: number | null;
  data: CampaignEffectData;
}

export interface Campaign {
  id: string;
  object: 'campaign';
  name: string;
  state: 'running' | 'prepared' | 'paused' | 'active' | 'inactive' | 'expired' | 'scheduled' | 'completed';
  applications_count: number;
  event: string | { id: string; name: string; } | null;
  conditions: ListResponse<CampaignCondition>;
  effects: ListResponse<CampaignEffect>;
}

export interface ProcessedCampaign extends Campaign {
  eventName: string;
  discountDisplay: string;
  discountValueForSort: number;
  usageCount: number;
  usageLimit: number | null;
  currency?: string;
  // New optional fields for financial analysis
  generatedRevenue?: number;
  totalDiscounts?: number;
  netRevenue?: number;
  averageOrderValue?: number;
}


export interface Plan {
    id: string;
    object: 'plan';
    name: string;
    price: number; // in cents
    interval: 'day' | 'week' | 'month' | 'year';
}

export interface TicketTypePrice {
    id: string;
    type: 'price';
    price: number;
    plan: Plan | null;
}

// Represents a TicketType from API, but named TicketGroup for consistency in the app.
export interface TicketGroup {
  id: string;
  object: 'ticket_type';
  uuid: string;
  type: string; // e.g. "AddonTicketType", "PayTicketType"
  name: string;
  created_at: string;
  updated_at: string;
  quantity: number | null;
  fee_included: boolean;
  vip: boolean;
  description: string;
  min_tickets_per_order: number;
  max_tickets_per_order: number | null;
  sales_period: string;
  sells_from: string | null;
  sells_to: string | null;
  vat_rate: number | null;
  price: number;
  index: number;
  admission: boolean;
  pdf: boolean;
  donation: boolean;
  merchandise: boolean;
  addons: boolean;
  group: string | null;
  event: string;
  prices?: ListResponse<TicketTypePrice>;

  // Calculated fields added by hooks/useEvents.ts
  sold_count?: number;
  state?: 'on_sale' | 'sold_out' | 'off_sale' | 'hidden';
  revenue?: number;
}


export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | string;
  value: string | number | (string | number)[];
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
  segments: Segment[];
  event: string | null;
}

export interface TargetGroupMember {
  id: string;
  object: 'target_group_member';
  // Personal info (old format)
  name?: string;
  email?: string;
  // Code-based info (new format)
  target_group?: string;
  ticket_buyer?: string | null;
  code?: string | null;
  space_identifier?: string | null;
  limit?: number | null;
  quantity?: number | null;
  category_key?: string | null;
}

// Types for Booking Question Analysis
export type QuestionType = 'multiple-choice' | 'open-ended';

export interface WordCloudData {
  text: string;
  value: number;
}

export interface AggregatedAnswer {
  text: string;
  count: number;
}

export interface AggregatedQuestion {
  id: string;
  name: string;
  type: QuestionType;
  totalResponses: number;
  answers: AggregatedAnswer[];
  wordCloudData?: WordCloudData[];
}

export type BookingQuestionsAnalysis = AggregatedQuestion[];

export interface SalesChannelData {
  name: string;
  count: number;
  children?: SalesChannelData[];
}


export type EventDetails = {
    event: BillettoEvent;
    attendees: Attendee[]; // For paginated display
    ticketGroups: TicketGroup[];
    stats: {
        totalTicketsSold: number;
        totalRevenue: number; // This is gross revenue from tickets, in cents
        currency: string;
        newsletterOptInRate?: number;
    };
    // New optional fields for combined data
    financialSummary?: {
        grossRevenue: number;
        billettoFees: number;
        netPayout: number;
        totalRefunded: number;
        totalChargebacks: number;
    };
    salesByChannel?: SalesChannelData[];
    salesByCity?: { name: string; count: number; }[];
    salesByCountry?: { name: string; count: number; }[];
    salesVelocity?: { date: string; tickets: number; }[];
    revenueBySource?: { name: string; revenue: number; }[];
    bookingQuestionsAnalysis?: BookingQuestionsAnalysis;
    // Full datasets for analysis
    allOrders?: Order[];
    allAttendees?: Attendee[];
    allLedgerEntries?: LedgerEntry[];
    bookingQuestionsLoaded?: boolean;
}


export type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
  key: keyof T | string; // Allow string for nested paths e.g. 'event.name'
  direction: SortDirection;
}

export interface AvailableQuestion {
    id: string;
    name: string;
}

// New type for Audience Analysis
export interface AudienceMember {
  id: string; // email
  name: string;
  email: string;
  totalSpent: number; // in cents
  eventsAttended: number;
  lastAttendedDate: string | null;
  currency: string;
  orders: Order[];
  attendees: Attendee[];
}