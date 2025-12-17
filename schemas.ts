
import { z } from 'zod';
import { 
    BillettoEvent, Order, Attendee, LedgerEntry, Campaign, TicketGroup, TargetGroup, 
    TargetGroupMember, CampaignCondition, CampaignEffect, OrderLine, OrderTransaction, 
    Refund, Venue, Location, Organization 
} from './types';

// Helper for ListResponse structure used across API to match strict type requirements
const createListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    total: z.number(),
    // API sometimes omits URL in nested structures or returns null
    url: z.string().nullish(), 
    next_url: z.string().nullish(),
}).passthrough();

// Basic shared schemas
export const VenueSchema: z.ZodType<Venue> = z.object({
    id: z.string(),
    name: z.string(),
}).passthrough();

export const LocationSchema: z.ZodType<Location> = z.object({
    id: z.string(),
    full_address: z.string().optional().nullable().transform(v => v === null ? undefined : v),
    name: z.string().optional().nullable().transform(v => v === null ? undefined : v),
}).passthrough();

export const OrganizationSchema: z.ZodType<Organization> = z.object({
    id: z.string(),
    name: z.string(),
}).passthrough();

// Recursive schema for Event
export const BillettoEventSchema: z.ZodType<BillettoEvent> = z.lazy(() => z.object({
    id: z.string(),
    object: z.literal('event'),
    name: z.string().nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    state: z.string(),
    currency: z.string(),
    public_url: z.string(),
    kind: z.union([
        z.literal('regular'), z.literal('recurring'), z.literal('scheduled'), 
        z.literal('sub_event'), z.literal('subscription')
    ]).or(z.string()) as z.ZodType<any>,
    parent: z.union([BillettoEventSchema, z.string(), z.null()]).optional(),
    availability: z.object({
        available: z.number().nullable().optional(),
    }).optional().nullable(),
    venue: z.union([VenueSchema, z.string()]).optional().nullable(),
    location: z.union([LocationSchema, z.string()]).optional().nullable(),
    organization: z.union([OrganizationSchema, z.string()]).optional().nullable(),
    total_capacity: z.number().nullable().optional(),
    online_event: z.boolean().optional(),
    editorial: z.any().optional(),
    categorisation: z.any().optional(),
    plans: z.any().optional(),
}).passthrough());

// Order related schemas
export const OrderLineSchema: z.ZodType<OrderLine> = z.object({
    id: z.string(),
    object: z.literal('order_line'),
    name: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    currency: z.string(),
}).passthrough();

export const RefundSchema: z.ZodType<Refund> = z.object({
    id: z.string(),
    object: z.union([z.literal('refund'), z.literal('order_transaction_refund')]).optional(),
    amount: z.number(),
    currency: z.string(),
    reason: z.string().nullable().default(null),
    created_at: z.string(),
}).passthrough();

export const OrderTransactionSchema: z.ZodType<OrderTransaction> = z.object({
    id: z.string(),
    object: z.literal('order_transaction'),
    state: z.string(),
    amount: z.number(),
    currency: z.string(),
    created_at: z.string(),
    payment_method: z.string().nullable().optional().transform(v => v === undefined ? null : v),
    payment_gateway_identifier: z.string().optional().nullable(),
    payment_gateway_transaction_id: z.string().optional(),
    payment_gateway_order_id: z.string().optional(),
    sales_channel: z.string().optional(),
    revenue_channel: z.string().optional(),
    // Use union to strictly allow null, addressing validation errors
    terminal_name: z.union([z.string(), z.null()]).optional().transform(v => v === null ? undefined : v),
    refunded_amount: z.number().optional(),
    balance: z.number().optional(),
    updated_at: z.string().optional(),
    successful_at: z.string().nullable().optional(),
    refunded_at: z.string().nullable().optional(),
    captured_at: z.string().nullable().optional(),
    refunds: createListResponseSchema(RefundSchema).optional().nullable()
}).passthrough();

export const OrderSchema: z.ZodType<Order> = z.object({
    id: z.string(),
    object: z.literal('order'),
    created_at: z.string(),
    buyer_name: z.string(),
    email: z.string(),
    state: z.string(),
    payout: z.number(),
    currency: z.string(),
    subtotal: z.number(),
    payment_fees: z.number(),
    billetto_fees: z.number(),
    phone: z.string().optional(),
    ip: z.string().optional(),
    manage_url: z.string().optional(),
    sold_by: z.string().optional(),
    sales_channel: z.string().optional(),
    revenue_channel: z.string().optional(),
    // Use union to strictly allow null, addressing validation errors
    terminal_name: z.union([z.string(), z.null()]).optional().transform(v => v === null ? undefined : v),
    address: z.any().optional(),
    subscription: z.any().optional(),
    booking_question_responses: z.any().optional(),
    order_lines: createListResponseSchema(OrderLineSchema),
    order_transactions: createListResponseSchema(OrderTransactionSchema),
    event: z.union([BillettoEventSchema, z.string()]).optional(),
}).passthrough();

// Ticket Group Schema
export const TicketGroupSchema: z.ZodType<TicketGroup> = z.object({
    id: z.string(),
    object: z.literal('ticket_type'),
    name: z.string(),
    price: z.number(),
    state: z.string().transform(val => val as TicketGroup['state']),
    quantity: z.number().nullable(),
    sells_from: z.string().nullable(),
    sells_to: z.string().nullable(),
    uuid: z.string().optional().default(''),
    admission: z.boolean().optional().default(false),
    description: z.string().optional(),
    min_tickets_per_order: z.number().optional(),
    max_tickets_per_order: z.number().nullable().optional(),
    sales_period: z.string().optional(),
    vat_rate: z.number().nullable().optional(),
    addons: z.boolean().optional(),
    vip: z.boolean().optional(),
    type: z.string().optional(),
    event: z.string().optional(),
}).passthrough().transform(obj => obj as TicketGroup);

// Attendee Schema
export const AttendeeSchema: z.ZodType<Attendee> = z.object({
    id: z.string(),
    object: z.literal('attendee'),
    name: z.string(),
    email: z.string(),
    state: z.string(),
    price: z.number(),
    fee: z.number(),
    created_at: z.string(),
    photo: z.string().nullable().optional(),
    type: z.string().optional(),
    booking_question_responses: z.any().optional(),
    scannings: z.any().optional(),
    ticket_buyer: z.union([z.any(), z.string()]).optional(),
    space: z.union([z.any(), z.string()]).optional(),
    membership: z.union([z.any(), z.string()]).optional(),
    subscription: z.union([z.any(), z.string()]).optional(),
    newsletter_permission: z.boolean().optional(),
    city: z.string().optional(),
    country_code: z.string().optional(),
    phone_number: z.string().optional(),
    // Use union to strictly allow null for attendees (e.g. manual tickets)
    order: z.union([z.string(), z.null()]).optional(),
    event: z.union([BillettoEventSchema, z.string()]).optional(),
    ticket_type: z.union([TicketGroupSchema, z.string()]).optional().nullable(),
}).passthrough();

// Ledger Schema
export const LedgerEntrySchema: z.ZodType<LedgerEntry> = z.object({
    id: z.string(),
    object: z.literal('ledger_entry'),
    created_at: z.string(),
    entry_type: z.string(),
    amount: z.number(),
    currency: z.string(),
    order_id: z.union([z.string(), z.number()]).transform(v => v === null || v === undefined ? undefined : String(v)).nullable().optional(),
    event_id: z.union([z.string(), z.number()]).transform(v => v === null || v === undefined ? undefined : String(v)).nullable().optional(),
    vat: z.number(),
    time: z.string().optional(),
    entry_subtype: z.string().nullable().optional().transform(v => v === null ? undefined : v),
    revenue_subtype: z.string().nullable().optional().transform(v => v === null ? undefined : v),
    event: z.union([BillettoEventSchema, z.null()]).optional(),
    vat_rate: z.string().nullable().optional(),
    transaction_type: z.string().optional(),
    purchase_terminal: z.string().optional(),
    terminal_name: z.string().optional(),
    cash_register_session_uuid: z.string().nullable().optional().transform(v => v === null ? undefined : v),
    payment_gateway: z.string().optional(),
    revenue_channel: z.string().optional(),
    source: z.string().nullable().optional(),
    medium: z.string().nullable().optional(),
}).passthrough();

// Campaign Schemas
export const CampaignConditionSchema: z.ZodType<CampaignCondition> = z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.string(), z.any()),
}).passthrough();

export const CampaignEffectSchema: z.ZodType<CampaignEffect> = z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.string(), z.any()),
    usage_limit: z.number().nullable().optional(),
    orders_limit: z.number().nullable().optional(),
    order_limit: z.number().nullable().optional(),
}).passthrough();

export const CampaignSchema: z.ZodType<Campaign> = z.object({
    id: z.string(),
    object: z.literal('campaign'),
    name: z.string(),
    state: z.string(),
    applications_count: z.number(),
    conditions: createListResponseSchema(CampaignConditionSchema),
    effects: createListResponseSchema(CampaignEffectSchema),
    event: z.union([BillettoEventSchema, z.string()]).optional().nullable(),
}).passthrough();

// Target Group Schemas
export const TargetGroupSchema: z.ZodType<TargetGroup> = z.object({
    id: z.string(),
    object: z.literal('target_group'),
    name: z.string(),
    kind: z.string(),
    segments: z.array(z.any()).optional(),
}).passthrough();

export const TargetGroupMemberSchema: z.ZodType<TargetGroupMember> = z.object({
    id: z.string(),
    object: z.literal('target_group_member'),
    name: z.string().optional(),
    email: z.string().optional(),
    code: z.string().optional(),
    limit: z.number().nullable().optional(),
    quantity: z.number().nullable().optional(),
}).passthrough();
