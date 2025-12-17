
import { describe, it, expect } from 'vitest';
import { processAndBuildEventDetails } from '../../utils/eventProcessing';
import { BillettoEvent, Order, Attendee, LedgerEntry, TicketGroup } from '../../types';

describe('processAndBuildEventDetails', () => {
    const mockEvent: BillettoEvent = {
        id: 'evt_1',
        object: 'event',
        name: 'Test Event',
        currency: 'EUR',
        state: 'published',
        starts_at: '2023-01-01T12:00:00Z',
        public_url: 'http://test.url',
        kind: 'regular'
    };

    const mockTicketGroups: TicketGroup[] = [
        {
            id: 'tg_1',
            object: 'ticket_type',
            uuid: 'uuid_1',
            name: 'General Admission',
            price: 1000, // 10.00 EUR
            state: 'on_sale',
            quantity: 100,
            sells_from: null,
            sells_to: null,
            admission: true
        }
    ];

    it('should calculate correct net revenue from ledger entries', () => {
        const mockLedger: LedgerEntry[] = [
            {
                id: 'le_1',
                object: 'ledger_entry',
                created_at: '2023-01-01T12:00:00Z',
                entry_type: 'ORDER_REVENUE',
                amount: 1000,
                currency: 'EUR',
                vat: 0,
                event_id: 'evt_1'
            },
            {
                id: 'le_2',
                object: 'ledger_entry',
                created_at: '2023-01-01T12:00:00Z',
                entry_type: 'ORDER_REVENUE',
                amount: 2000,
                currency: 'EUR',
                vat: 0,
                event_id: 'evt_1'
            }
        ];

        const result = processAndBuildEventDetails(
            mockEvent,
            [],
            [],
            mockLedger,
            mockTicketGroups,
            []
        );

        expect(result.financialSummary.netRevenue).toBe(3000);
        expect(result.financialSummary.netPayout).toBe(3000); // No fees
    });

    it('should deduct fees correctly in net payout', () => {
        const mockLedger: LedgerEntry[] = [
            {
                id: 'le_1',
                object: 'ledger_entry',
                created_at: '2023-01-01T12:00:00Z',
                entry_type: 'ORDER_REVENUE',
                amount: 1000,
                currency: 'EUR',
                vat: 0
            },
            {
                id: 'le_2',
                object: 'ledger_entry',
                created_at: '2023-01-01T12:00:00Z',
                entry_type: 'TICKETS_FEE',
                amount: -100, // -1.00 EUR
                currency: 'EUR',
                vat: 0
            }
        ];

        const result = processAndBuildEventDetails(
            mockEvent,
            [],
            [],
            mockLedger,
            mockTicketGroups,
            []
        );

        expect(result.financialSummary.netRevenue).toBe(1000);
        expect(result.financialSummary.billettoFees).toBe(-100);
        expect(result.financialSummary.netPayout).toBe(900);
    });

    it('should correctly attribute sales to ticket groups based on orders', () => {
        const mockOrders: Order[] = [
            {
                id: 'ord_1',
                object: 'order',
                created_at: '2023-01-01T12:00:00Z',
                buyer_name: 'John Doe',
                email: 'john@example.com',
                state: 'successful',
                payout: 900,
                currency: 'EUR',
                subtotal: 1000,
                payment_fees: 50,
                billetto_fees: 50,
                order_lines: {
                    object: 'list',
                    data: [
                        { id: 'ol_1', object: 'order_line', name: 'General Admission', quantity: 2, unit_price: 500, currency: 'EUR' }
                    ],
                    has_more: false,
                    total: 1,
                    url: ''
                },
                order_transactions: { object: 'list', data: [], has_more: false, total: 0, url: '' }
            }
        ];

        const result = processAndBuildEventDetails(
            mockEvent,
            mockOrders,
            [],
            [],
            mockTicketGroups,
            []
        );

        expect(result.ticketGroups[0].sold_count).toBe(2);
        expect(result.ticketGroups[0].revenue).toBe(2000); // 2 * 1000
    });
});
