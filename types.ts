





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

export interface BookingQuestionResponse {
  id:string;
  object: 'booking_question_response';
  text?: string; // Some API versions might use this
  answer?: string; // API seems to be sending this now
  question: BookingQuestion | string; // Handle both expanded object and string name from API
  description?: string;
  required?: boolean;
  created_at?: string;
  updated_at?: string;
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
  ticket_buyer?: string; // ID of the buyer
  membership?: string | null;
  subscription?: string | null;

  // Ticket Details
  barcode: string;
  type: string; // e.g., 'ticket'
  fee_included: boolean;
  space?: string | null;

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
  scannings?: ListResponse<any>; // Type for Scanning object is unknown, so using any
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
  refunds?: ListResponse<any>; // Type for Refund object is unknown
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
  address?: string;
  subscription?: string | null;
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
  created_at: string;
  entry_type: 'ORDER_REVENUE' | 'ORGANIZER_PAYMENT_FEE' | 'TICKETS_FEE' | 'IMMEDIATE_PAYOUT' | 'COMMISSION' | 'IMMEDIATE_PAYOUT_WITHDRAWAL' | 'CHARGEBACK' | 'PROMOTION_FEE' | 'INVOICE_FEE' | 'WALLET_CHARGE' | 'DISCOUNTS' | 'PAYOUT' | 'REFUND';
  entry_subtype?: string;
  amount: number; // in cents
  vat: number; // in cents
  currency: string;
  event?: {
    id: string;
    name: string;
  };
  order_id?: string;
  source?: string;
  medium?: string;
}

export interface Campaign {
  id: string;
  object: 'campaign';
  name: string;
  type: 'discount_code' | 'voucher';
  state: 'active' | 'inactive' | 'expired' | 'scheduled';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number; // in cents for fixed_amount
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
  valid_from: string | null;
  valid_to: string | null;
  event?: { // Expanded
    id: string;
    name: string;
  };
}

export interface TicketGroup {
  id: string;
  object: 'ticket_group';
  name: string;
  price: number; // in cents
  fee: number; // in cents
  currency: string;
  sold_count: number;
  capacity: number | null;
  state: 'on_sale' | 'sold_out' | 'off_sale' | 'hidden';
  starts_at: string | null;
  ends_at: string | null;
  revenue?: number; // Calculated field for sorting
}

export interface TargetGroup {
  id: string;
  object: 'target_group';
  name: string;
  members_count: number;
  created_at: string;
}

export interface TargetGroupMember {
  id: string;
  object: 'target_group_member';
  name: string;
  email: string;
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
    };
    salesByChannel?: { name: string; count: number; }[];
    salesByCity?: { name: string; count: number; }[];
    salesByCountry?: { name: string; count: number; }[];
    salesVelocity?: { date: string; tickets: number; }[];
    revenueBySource?: { name: string; revenue: number; }[];
    bookingQuestionsAnalysis?: BookingQuestionsAnalysis;
    // Full datasets for analysis
    allOrders?: Order[];
    allAttendees?: Attendee[];
    bookingQuestionsLoaded?: boolean;
}


export type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
  key: keyof T | string; // Allow string for nested paths e.g. 'event.name'
  direction: SortDirection;
}