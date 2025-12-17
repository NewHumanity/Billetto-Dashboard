import { describe, it, expect } from 'vitest';
import { analyzeAudience, analyzePerformance } from '../../utils/analysisLogic';
import { Order, Attendee, LedgerEntry, BillettoEvent } from '../../types';

describe('analyzeAudience (RFM Logic)', () => {
    // Helper to create mock objects
    const createMockOrder = (id: string, email: string): Order => ({
        id, email, buyer_name: 'Test Buyer', created_at: '2023-01-01', state: 'successful', 
        payout: 0, currency: 'EUR', subtotal: 0, payment_fees: 0, billetto_fees: 0, 
        order_lines: { object: 'list', data: [], has_more: false, total: 0, url: '' },
        order_transactions: { object: 'list', data: [], has_more: false, total: 0, url: '' }
    } as Order);

    const createMockAttendee = (id: string, email: string, eventDate: string): Attendee => ({
        id, email, name: 'Test Attendee', state: 'sold', price: 0, fee: 0, created_at: '2023-01-01',
        event: { id: 'evt_1', starts_at: eventDate } as any
    } as Attendee);

    const createMockRevenue = (orderId: string, amount: number): LedgerEntry => ({
        id: `le_${orderId}`, object: 'ledger_entry', created_at: '2023-01-01', 
        entry_type: 'ORDER_REVENUE', amount, currency: 'EUR', vat: 0, order_id: orderId
    } as LedgerEntry);

    it('should correctly calculate Total Spent (CLV)', () => {
        const orders = [createMockOrder('ord_1', 'alice@test.com')];
        const attendees = [createMockAttendee('att_1', 'alice@test.com', '2023-01-01')];
        const ledger = [createMockRevenue('ord_1', 5000)]; // 50.00 EUR

        const result = analyzeAudience(orders, attendees, ledger);
        
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('alice@test.com');
        expect(result[0].totalSpent).toBe(5000);
    });

    it('should segment High Value/Frequent/Recent as Champions', () => {
        // Create 5 users to establish quintiles. 
        // User 1 will be top across all metrics.
        const user1 = 'champion@test.com'; // Top spender, recent, frequent
        const others = ['u2@test.com', 'u3@test.com', 'u4@test.com', 'u5@test.com'];

        const orders = [createMockOrder('o1', user1), ...others.map((e, i) => createMockOrder(`o${i+2}`, e))];
        
        const attendees = [
            createMockAttendee('a1', user1, '2024-01-01'), // Recent
            createMockAttendee('a1_2', user1, '2024-01-02'), // Frequent
            ...others.map((e, i) => createMockAttendee(`a${i+2}`, e, '2020-01-01')) // Old date
        ];

        const ledger = [
            createMockRevenue('o1', 100000), // High spend
            ...others.map((e, i) => createMockRevenue(`o${i+2}`, 100)) // Low spend
        ];

        const result = analyzeAudience(orders, attendees, ledger);
        const champion = result.find(r => r.email === user1);

        expect(champion).toBeDefined();
        expect(champion?.recencyScore).toBe(5); // Top quintile
        expect(champion?.frequencyScore).toBe(5); // Top quintile (2 events vs 1)
        expect(champion?.monetaryScore).toBe(5); // Top quintile
        expect(champion?.rfmSegment).toBe('Champions');
    });
});

describe('analyzePerformance (Profitability)', () => {
    const mockEvent: BillettoEvent = {
        id: 'evt_1', object: 'event', name: 'Profit Event', currency: 'EUR', state: 'published'
    } as BillettoEvent;

    it('should calculate Net Profit = Revenue + Fees(neg) + Refunds(neg)', () => {
        const ledger: LedgerEntry[] = [
            { id: '1', entry_type: 'ORDER_REVENUE', amount: 1000, event_id: 'evt_1' } as LedgerEntry,
            { id: '2', entry_type: 'TICKETS_FEE', amount: -100, event_id: 'evt_1' } as LedgerEntry, // Cost
            { id: '3', entry_type: 'REFUND', amount: -200, event_id: 'evt_1' } as LedgerEntry // Refund
        ];

        const result = analyzePerformance([mockEvent], ledger, []);
        
        expect(result).toHaveLength(1);
        expect(result[0].grossRevenue).toBe(1000);
        expect(result[0].totalFees).toBe(-100);
        expect(result[0].totalRefundsAndChargebacks).toBe(-200);
        expect(result[0].netProfit).toBe(700); // 1000 - 100 - 200
        expect(result[0].profitMargin).toBe(70); // (700 / 1000) * 100
    });
});