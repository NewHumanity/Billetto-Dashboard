

export interface ListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  total: number;
  url: string;
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
  id: string;
  object: 'booking_question_response';
  text: string;
  question: BookingQuestion; // Expanded
}

export interface Attendee {
  id: string;
  object: 'attendee';
  name: string;
  email: string;
  price: number; // in cents
  fee: number; // in cents
  created_at: string;
  state: 'sold' | 'reserved' | 'refunded' | 'manually_generated' | 'cancelled' | 'available' | 'door_sale' | 'draft' | 'failed' | 'mass_generated';
  event?: {
    id: string;
    name: string;
    starts_at: string;
    currency: string;
  };
  booking_question_responses?: ListResponse<BookingQuestionResponse>;
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
}

export interface OrderLine {
  id: string;
  object: 'order_line';
  name: string;
  quantity: number;
  unit_price: number;
  fee: number;
  currency: string;
}

export interface Order {
  id:string;
  object: 'order';
  email: string;
  buyer_name: string;
  created_at: string;
  currency: string;
  event: BillettoEvent; // Expanded
  order_lines: ListResponse<OrderLine>;
  subtotal: number;
  payment_fees: number;
  billetto_fees: number;
  payout: number; // in cents
  sales_channel: string;
  booking_question_responses?: ListResponse<BookingQuestionResponse>;
}

export interface LedgerEntry {
  id: string;
  object: 'ledger_entry';
  created_at: string;
  type: 'charge' | 'refund' | 'fee' | 'payout' | 'adjustment' | 'other';
  description: string;
  amount: number; // in cents
  currency: string;
  event?: {
    id: string;
    name: string;
  };
  order_id?: string;
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
        totalRevenue: number; // This is gross revenue from tickets
        currency: string;
    };
    // New optional fields for combined data
    financialSummary?: {
        grossRevenue: number;
        billettoFees: number;
        netPayout: number;
    };
    salesByChannel?: { name: string; count: number; }[];
    salesVelocity?: { date: string; tickets: number; }[];
    bookingQuestionsAnalysis?: BookingQuestionsAnalysis;
    // Full datasets for analysis
    allOrders?: Order[];
    allAttendees?: Attendee[];
}


export type SortDirection = 'ascending' | 'descending';

export interface SortConfig<T> {
  key: keyof T | string; // Allow string for nested paths e.g. 'event.name'
  direction: SortDirection;
}