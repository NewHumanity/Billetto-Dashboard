import { Order, Attendee, LedgerEntry, AudienceMember, BillettoEvent, AnalyzedEvent } from '../types';

export const analyzeAudience = (allOrders: Order[], allAttendees: Attendee[], allLedgerEntries: LedgerEntry[]): AudienceMember[] => {
    const customerData: { [email: string]: Partial<AudienceMember> & { nameSet: Set<string> } } = {};
    const orderMap = new Map<string, Order>(allOrders.map(o => [o.id, o]));

    allAttendees.forEach(attendee => {
        const email = attendee.email.toLowerCase();
        if (!customerData[email]) {
            customerData[email] = { attendees: [], nameSet: new Set() };
        }
        customerData[email].attendees!.push(attendee);
        if (attendee.name) customerData[email].nameSet!.add(attendee.name);
    });
    
    allOrders.forEach(order => {
        const email = order.email.toLowerCase();
            if (!customerData[email]) {
            customerData[email] = { attendees: [], nameSet: new Set() };
        }
        if (!customerData[email].orders) customerData[email].orders = [];
        customerData[email].orders!.push(order);
        if (order.buyer_name) customerData[email].nameSet!.add(order.buyer_name);
    });
    
    allLedgerEntries.forEach(entry => {
        if (entry.entry_type === 'ORDER_REVENUE' && entry.order_id) {
            const order = orderMap.get(String(entry.order_id));
            if (order) {
                const email = order.email.toLowerCase();
                if (customerData[email]) {
                    customerData[email].totalSpent = (customerData[email].totalSpent || 0) + entry.amount;
                    if (!customerData[email].currency) customerData[email].currency = entry.currency;
                }
            }
        }
    });

    const finalAudience: AudienceMember[] = Object.entries(customerData).map(([email, data]) => {
        const attendees = data.attendees || [];
        const uniqueEventIds = new Set(attendees.map(a => typeof a.event === 'object' ? a.event.id : a.event).filter(Boolean));
        
        let lastAttendedDate: string | null = null;
        if (attendees.length > 0) {
            const sorted = [...attendees].sort((a, b) => {
                const dateA = new Date(typeof a.event === 'object' ? a.event.starts_at || 0 : 0).getTime();
                const dateB = new Date(typeof b.event === 'object' ? b.event.starts_at || 0 : 0).getTime();
                return dateB - dateA;
            });
            const lastEvent = sorted[0].event;
            lastAttendedDate = (lastEvent && typeof lastEvent === 'object') ? (lastEvent.starts_at || null) : null;
        }

        return {
            id: email, email, name: Array.from(data.nameSet!)[0] || 'Unknown',
            totalSpent: data.totalSpent || 0, currency: data.currency || 'N/A',
            eventsAttended: uniqueEventIds.size,
            lastAttendedDate,
            orders: data.orders || [], attendees: attendees,
        };
    });

    if (finalAudience.length > 0) {
        const sortedByRecency = [...finalAudience].sort((a, b) => (new Date(b.lastAttendedDate || 0).getTime()) - (new Date(a.lastAttendedDate || 0).getTime()));
        const sortedByFrequency = [...finalAudience].sort((a, b) => b.eventsAttended - a.eventsAttended);
        const sortedByMonetary = [...finalAudience].sort((a, b) => b.totalSpent - a.totalSpent);
        const quintileSize = Math.max(1, Math.ceil(finalAudience.length / 5));
        
        const addScores = (member: AudienceMember, scoreType: 'recencyScore' | 'frequencyScore' | 'monetaryScore', sortedArray: AudienceMember[]) => {
            const index = sortedArray.findIndex(m => m.id === member.id);
            member[scoreType] = Math.max(1, 5 - Math.floor(index / quintileSize));
        };

        finalAudience.forEach(member => {
            addScores(member, 'recencyScore', sortedByRecency);
            addScores(member, 'frequencyScore', sortedByFrequency);
            addScores(member, 'monetaryScore', sortedByMonetary);
            const R = String(member.recencyScore); const F = String(member.frequencyScore);
            if (R >= '4' && F >= '4') member.rfmSegment = 'Champions';
            else if (F >= '4') member.rfmSegment = 'Loyal Customers';
            else if (R >= '4' && F < '2') member.rfmSegment = 'New Customers';
            else if (R >= '3' && F >= '2' && F < '4') member.rfmSegment = 'Potential Loyalists';
            else if (R < '3' && F >= '3') member.rfmSegment = 'At Risk';
            else if (R < '3' && F < '3') member.rfmSegment = 'Hibernating';
            else member.rfmSegment = 'Needs Attention';
        });
    }

    return finalAudience;
}

export const analyzePerformance = (allEvents: BillettoEvent[], allLedgerEntries: LedgerEntry[], allAttendees: Attendee[]): AnalyzedEvent[] => {
    const eventsById = new Map<string, BillettoEvent>(allEvents.map(e => [e.id, e]));
    const ledgerByEvent = allLedgerEntries.reduce((map, entry) => {
        if (entry.event_id) {
            const eventId = String(entry.event_id);
            if (!map.has(eventId)) map.set(eventId, []);
            map.get(eventId)!.push(entry);
        }
        return map;
    }, new Map<string, LedgerEntry[]>());
    
    const attendeesByEvent = allAttendees.reduce((map, attendee) => {
            const eventId = attendee.event && typeof attendee.event === 'object' ? attendee.event.id : String(attendee.event);
        if (eventId) {
            if (!map.has(eventId)) map.set(eventId, []);
            map.get(eventId)!.push(attendee);
        }
        return map;
    }, new Map<string, Attendee[]>());
    
    const analysisResults: AnalyzedEvent[] = [];

    for (const [eventId, entries] of ledgerByEvent.entries()) {
        const event = eventsById.get(eventId);
        if (!event) continue;

        let grossRevenue = 0, totalFees = 0, totalRefundsAndChargebacks = 0;
        entries.forEach(entry => {
            if (entry.entry_type === 'ORDER_REVENUE') grossRevenue += entry.amount;
            else if (entry.entry_type.includes('FEE') || entry.entry_type === 'DISCOUNTS') totalFees += entry.amount;
            else if (entry.entry_type === 'REFUND' || entry.entry_type === 'CHARGEBACK') totalRefundsAndChargebacks += entry.amount;
        });

        const netProfit = grossRevenue + totalFees + totalRefundsAndChargebacks;
        const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
        const ticketCount = (attendeesByEvent.get(eventId) || []).filter(a => ['sold', 'manually_generated', 'door_sale'].includes(a.state)).length;

        analysisResults.push({ ...event, grossRevenue, totalFees, totalRefundsAndChargebacks, netProfit, profitMargin, ticketCount });
    }

    return analysisResults;
}