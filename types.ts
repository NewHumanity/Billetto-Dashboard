

export interface ListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  total: number;
  url: string;
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

export type EventDetails = {
    event: BillettoEvent;
    attendees: Attendee[];
    stats: {
        totalRevenue: number;
        totalTicketsSold: number;
        currency: string;
    };
}