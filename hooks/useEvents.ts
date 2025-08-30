import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionsAnalysis, Order, LedgerEntry, EventGroup, EventListItemType, AvailableQuestion, SalesChannelData, CheckinAnalytics, GeographicSaleData, PurchaseLeadTimeData, Campaign, CampaignTimeBlock, AddonAffinity, RefundAnalysis, DeadlineUrgencyData, FinancialSummary, EventStats } from '../types';
import { BillettoApiClient, BillettoApiError, NotModifiedError } from '../services/billettoService';
import * as db from '../services/dbService';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { useSortableData } from './useSortableData';
import { runBookingQuestionsAnalysis, analyzeCheckinData } from '../utils/analysis';
// Fix: Import from types.ts to break circular dependency
import { AddToastFn } from '../types';

const ATTENDEES_PER_PAGE = 100;

const processAndBuildEventDetails = (
    event: BillettoEvent,
    allOrders: Order[],
    allAttendees: Attendee[],
    allLedgerEntries: LedgerEntry[],
    ticketGroupsData: TicketGroup[],
    activeCampaigns: CampaignTimeBlock[]
): Omit<EventDetails, 'attendees'> => {

    const orderFeesMap = new Map<string, number>();
    allLedgerEntries.forEach(entry => {
        if (entry.order_id && entry.entry_type.includes('FEE')) {
            const orderId = String(entry.order_id);
            const currentFees = orderFeesMap.get(orderId) || 0;
            orderFeesMap.set(orderId, currentFees + Math.abs(entry.amount));
        }
    });

    const ticketGroupNameToIdMap = new Map<string, string>();
    ticketGroupsData.forEach(tg => ticketGroupNameToIdMap.set(tg.name, tg.id));

    const ticketGroupFeesMap = new Map<string, number>();
    ticketGroupsData.forEach(tg => ticketGroupFeesMap.set(tg.id, 0));

    allOrders.forEach(order => {
        const orderTotalFees = orderFeesMap.get(order.id);
        if (orderTotalFees && orderTotalFees > 0) {
            const orderSubtotal = order.order_lines.data.reduce((sum, line) => sum + (line.unit_price * line.quantity), 0);
            if (orderSubtotal > 0) {
                order.order_lines.data.forEach(line => {
                    const ticketGroupId = ticketGroupNameToIdMap.get(line.name);
                    if (ticketGroupId) {
                        const lineValue = line.unit_price * line.quantity;
                        const feeProportion = lineValue / orderSubtotal;
                        const attributedFee = feeProportion * orderTotalFees;
                        const currentAttributedFees = ticketGroupFeesMap.get(ticketGroupId) || 0;
                        ticketGroupFeesMap.set(ticketGroupId, currentAttributedFees + attributedFee);
                    }
                });
            }
        }
    });

    const soldCountsByName: { [name: string]: number } = {};
    allOrders.forEach(order => {
        order.order_lines.data.forEach(line => {
            soldCountsByName[line.name] = (soldCountsByName[line.name] || 0) + line.quantity;
        });
    });

    const ticketGroupsWithCalculatedRevenue = ticketGroupsData.map(tg => {
        const sold_count = soldCountsByName[tg.name] || 0;
        const price = typeof tg.price === 'number' ? tg.price : 0;
        
        let state: TicketGroup['state'] = 'off_sale';
        const now = new Date().getTime();
        const starts = tg.sells_from ? new Date(tg.sells_from).getTime() : 0;
        const ends = tg.sells_to ? new Date(tg.sells_to).getTime() : Infinity;

        if (now >= starts && now <= ends) {
            state = 'on_sale';
        }

        if (tg.quantity !== null && sold_count >= tg.quantity) {
            state = 'sold_out';
        }
        
        const revenue = price * sold_count;
        const estimatedFees = ticketGroupFeesMap.get(tg.id);
        const netRevenue = estimatedFees !== undefined ? revenue - estimatedFees : undefined;
        const profitMargin = revenue > 0 && netRevenue !== undefined ? (netRevenue / revenue) * 100 : undefined;


        return { 
            ...tg, 
            sold_count,
            state,
            revenue,
            estimatedFees,
            netRevenue,
            profitMargin,
        };
    });


    const estimatedGrossRevenue = ticketGroupsWithCalculatedRevenue.reduce((sum, tg) => sum + (tg.revenue || 0), 0);
    
    const salesMap: { [key: string]: { count: number; children: { [key: string]: { count: number } } } } = {};
    allOrders.forEach(order => {
        const channel = (order.sales_channel || 'unknown').replace(/_/g, ' ');
        if (!salesMap[channel]) {
            salesMap[channel] = { count: 0, children: {} };
        }
        salesMap[channel].count++;

        const primaryTx = order.order_transactions?.data.find(tx => tx.state === 'successful');
        if (primaryTx) {
            let subChannel: string | null = null;
            if (channel === 'online') {
                subChannel = primaryTx.payment_method || 'other';
            } else if (channel === 'box office') {
                subChannel = primaryTx.terminal_name || primaryTx.payment_method || 'other';
            }
            if (subChannel) {
                subChannel = subChannel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!salesMap[channel].children[subChannel]) {
                    salesMap[channel].children[subChannel] = { count: 0 };
                }
                salesMap[channel].children[subChannel].count++;
            }
        }
    });
    
    const salesByChannel: SalesChannelData[] = Object.entries(salesMap)
    .map(([channelName, data]) => {
        const childrenData: SalesChannelData[] = Object.entries(data.children)
            .map(([subChannelName, subData]) => ({
                name: subChannelName,
                count: subData.count
            }))
            .sort((a, b) => b.count - a.count);

        return {
            name: channelName.replace(/\b\w/g, l => l.toUpperCase()),
            count: data.count,
            children: childrenData.length > 0 ? childrenData : undefined
        };
    })
    .sort((a, b) => b.count - a.count);

    const orderToTicketTypeIdsMap = new Map<string, string[]>();
    allOrders.forEach(order => {
        const ticketTypeIdsInOrder = order.order_lines.data
            .map(line => ticketGroupNameToIdMap.get(line.name))
            .filter((id): id is string => !!id);
        orderToTicketTypeIdsMap.set(order.id, ticketTypeIdsInOrder);
    });
    
    const cityData: Record<string, { totalCount: number, countByTicketType: Record<string, number> }> = {};
    const countryData: Record<string, { totalCount: number, countByTicketType: Record<string, number> }> = {};

    allAttendees.forEach(attendee => {
        const ticketTypeIds = attendee.order ? orderToTicketTypeIdsMap.get(attendee.order) : [];
        if (!ticketTypeIds || ticketTypeIds.length === 0) return;

        if (attendee.city) {
            if (!cityData[attendee.city]) {
                cityData[attendee.city] = { totalCount: 0, countByTicketType: {} };
            }
            cityData[attendee.city].totalCount++;
            ticketTypeIds.forEach(id => {
                cityData[attendee.city].countByTicketType[id] = (cityData[attendee.city].countByTicketType[id] || 0) + 1;
            });
        }
        if (attendee.country_code) {
            if (!countryData[attendee.country_code]) {
                countryData[attendee.country_code] = { totalCount: 0, countByTicketType: {} };
            }
            countryData[attendee.country_code].totalCount++;
            ticketTypeIds.forEach(id => {
                countryData[attendee.country_code].countByTicketType[id] = (countryData[attendee.country_code].countByTicketType[id] || 0) + 1;
            });
        }
    });

    const salesByCity: GeographicSaleData[] = Object.entries(cityData)
        .map(([name, data]) => ({ name, ...data }));
    
    const salesByCountry: GeographicSaleData[] = Object.entries(countryData)
        .map(([name, data]) => ({ name, ...data }));

    const salesVelocityMap: { [date: string]: number } = {};
    allOrders.forEach(order => {
        const date = order.created_at.split('T')[0];
        const ticketCount = order.order_lines.data.reduce((sum, line) => sum + line.quantity, 0);
        salesVelocityMap[date] = (salesVelocityMap[date] || 0) + ticketCount;
    });
    const salesVelocity = Object.entries(salesVelocityMap)
        .map(([date, tickets]) => ({ date, tickets }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const revenueBySource = allLedgerEntries
        .filter(entry => entry.entry_type === 'ORDER_REVENUE' && entry.source)
        .reduce((acc: { name: string; revenue: number }[], entry) => {
            const source = entry.source || 'direct';
            const existing = acc.find(r => r.name === source);
            if (existing) {
                existing.revenue += entry.amount;
            } else {
                acc.push({ name: source, revenue: entry.amount });
            }
            return acc;
        }, []);

    let grossRevenue = 0;
    let totalDiscounts = 0;
    let billettoFees = 0;
    let totalRefunded = 0;
    let totalChargebacks = 0;

    allLedgerEntries.forEach(entry => {
        if (entry.entry_type === 'ORDER_REVENUE') {
            grossRevenue += entry.amount;
        } else if (entry.entry_type === 'DISCOUNTS') {
            totalDiscounts += entry.amount;
        } else if (entry.entry_type.includes('FEE')) {
            billettoFees += entry.amount;
        } else if (entry.entry_type === 'REFUND') {
            totalRefunded += entry.amount;
        } else if (entry.entry_type === 'CHARGEBACK') {
            totalChargebacks += entry.amount;
        }
    });

    const netRevenue = grossRevenue + totalDiscounts;
    const netPayout = netRevenue + billettoFees + totalRefunded + totalChargebacks;
    
    const financialSummary: FinancialSummary = { netRevenue, billettoFees, netPayout, totalRefunded, totalChargebacks };

    const eventStartsAt = new Date(event.starts_at).getTime();
    const leadTimeBuckets = {
        'Last 24 Hours': { tickets: 0, sortOrder: 1 },
        '2-7 Days Out': { tickets: 0, sortOrder: 2 },
        '8-14 Days Out': { tickets: 0, sortOrder: 3 },
        '15-30 Days Out': { tickets: 0, sortOrder: 4 },
        '1-2 Months Out': { tickets: 0, sortOrder: 5 },
        'Over 2 Months Out': { tickets: 0, sortOrder: 6 },
    };

    allOrders.forEach(order => {
        const orderCreatedAt = new Date(order.created_at).getTime();
        if (isNaN(eventStartsAt) || isNaN(orderCreatedAt)) return;

        const leadTimeDays = (eventStartsAt - orderCreatedAt) / (1000 * 60 * 60 * 24);
        
        if (leadTimeDays < 0) return;

        const ticketCountInOrder = order.order_lines.data.reduce((sum, line) => sum + line.quantity, 0);

        if (leadTimeDays <= 1) {
            leadTimeBuckets['Last 24 Hours'].tickets += ticketCountInOrder;
        } else if (leadTimeDays <= 7) {
            leadTimeBuckets['2-7 Days Out'].tickets += ticketCountInOrder;
        } else if (leadTimeDays <= 14) {
            leadTimeBuckets['8-14 Days Out'].tickets += ticketCountInOrder;
        } else if (leadTimeDays <= 30) {
            leadTimeBuckets['15-30 Days Out'].tickets += ticketCountInOrder;
        } else if (leadTimeDays <= 60) {
            leadTimeBuckets['1-2 Months Out'].tickets += ticketCountInOrder;
        } else {
            leadTimeBuckets['Over 2 Months Out'].tickets += ticketCountInOrder;
        }
    });
    
    const purchaseLeadTime: PurchaseLeadTimeData[] = Object.entries(leadTimeBuckets)
        .map(([name, data]) => ({ name, tickets: data.tickets, sortOrder: data.sortOrder }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const admissionTicketTypeNames = new Set(ticketGroupsData.filter(tg => tg.admission).map(tg => tg.name));

    const orderTicketCounts: { [orderId: string]: number } = {};
    allOrders.forEach(order => {
        const admissionTicketsInOrder = order.order_lines.data
            .filter(line => admissionTicketTypeNames.has(line.name))
            .reduce((sum, line) => sum + line.quantity, 0);
        
        if (admissionTicketsInOrder > 0) {
            orderTicketCounts[order.id] = admissionTicketsInOrder;
        }
    });

    const groupSizeCounts: { [groupSize: string]: number } = {
        '1 Ticket': 0,
        '2 Tickets': 0,
        '3 Tickets': 0,
        '4 Tickets': 0,
        '5+ Tickets': 0,
    };

    Object.values(orderTicketCounts).forEach(count => {
        if (count === 1) groupSizeCounts['1 Ticket']++;
        else if (count === 2) groupSizeCounts['2 Tickets']++;
        else if (count === 3) groupSizeCounts['3 Tickets']++;
        else if (count === 4) groupSizeCounts['4 Tickets']++;
        else if (count >= 5) groupSizeCounts['5+ Tickets']++;
    });

    const groupPurchaseAnalysis = Object.entries(groupSizeCounts)
        .map(([text, count]) => ({ text, count }))
        .filter(item => item.count > 0);

    const ticketGroupsMap = new Map(ticketGroupsData.map(tg => [tg.id, tg]));
    const admissionTicketTypeIds = new Set(ticketGroupsData.filter(tg => tg.admission).map(tg => tg.id));
    const addonTicketTypeIds = new Set(ticketGroupsData.filter(tg => !tg.admission).map(tg => tg.id));
    
    let addonAffinity: AddonAffinity[] = [];
    if (addonTicketTypeIds.size > 0 && admissionTicketTypeIds.size > 0) {
        const affinityMap = new Map<string, { addons: Map<string, number> }>();
        admissionTicketTypeIds.forEach(id => affinityMap.set(id, { addons: new Map() }));

        allOrders.forEach(order => {
            const uniqueAdmissionIdsInOrder = new Set<string>();
            const uniqueAddonIdsInOrder = new Set<string>();
            
            order.order_lines.data.forEach(line => {
                const ticketId = ticketGroupNameToIdMap.get(line.name);
                if (!ticketId) return;

                if (admissionTicketTypeIds.has(ticketId)) {
                    uniqueAdmissionIdsInOrder.add(ticketId);
                } else if (addonTicketTypeIds.has(ticketId)) {
                    uniqueAddonIdsInOrder.add(ticketId);
                }
            });

            if (uniqueAdmissionIdsInOrder.size > 0 && uniqueAddonIdsInOrder.size > 0) {
                uniqueAdmissionIdsInOrder.forEach(admissionId => {
                    const admissionData = affinityMap.get(admissionId);
                    if (admissionData) {
                        uniqueAddonIdsInOrder.forEach(addonId => {
                            const currentCount = admissionData.addons.get(addonId) || 0;
                            admissionData.addons.set(addonId, currentCount + 1);
                        });
                    }
                });
            }
        });

        affinityMap.forEach((data, admissionId) => {
            const admissionTicket = ticketGroupsMap.get(admissionId);
            const admissionTicketWithRevenue = ticketGroupsWithCalculatedRevenue.find(tg => tg.id === admissionId);

            if (!admissionTicket || !admissionTicketWithRevenue || !admissionTicketWithRevenue.sold_count || admissionTicketWithRevenue.sold_count === 0) return;

            const totalAdmissionTicketsSold = admissionTicketWithRevenue.sold_count;

            if (data.addons.size > 0) {
                const topAddons = Array.from(data.addons.entries())
                    .map(([addonId, purchaseCount]) => {
                        const addonTicket = ticketGroupsMap.get(addonId);
                        return {
                            addonName: addonTicket?.name || 'Unknown Add-on',
                            purchaseCount,
                            affinity: totalAdmissionTicketsSold > 0 ? (purchaseCount / totalAdmissionTicketsSold) * 100 : 0
                        };
                    })
                    .sort((a, b) => b.purchaseCount - a.purchaseCount)
                    .slice(0, 5);

                if (topAddons.length > 0) {
                    addonAffinity.push({
                        admissionTicketName: admissionTicket.name,
                        totalAdmissionTicketsSold,
                        topAddons
                    });
                }
            }
        });
        addonAffinity.sort((a, b) => b.totalAdmissionTicketsSold - a.totalAdmissionTicketsSold);
    }
    
    const orderToRefundReasons = new Map<string, string[]>();
    allOrders.forEach(order => {
        const reasons: string[] = [];
        order.order_transactions?.data.forEach(tx => {
            tx.refunds?.data.forEach(refund => {
                reasons.push(refund.reason || 'unknown_reason');
            });
        });
        if (reasons.length > 0) {
            orderToRefundReasons.set(order.id, reasons);
        }
    });

    const refundReasonCounts: { [reason: string]: number } = {};
    allAttendees.forEach(attendee => {
        if (attendee.state === 'refunded' && attendee.order) {
            const reasons = orderToRefundReasons.get(attendee.order);
            if (reasons && reasons.length > 0) {
                const reason = reasons[0]; 
                refundReasonCounts[reason] = (refundReasonCounts[reason] || 0) + 1;
            }
        }
    });

    const refundAnalysis: RefundAnalysis = Object.entries(refundReasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
        
    const deadlineUrgency: DeadlineUrgencyData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticketGroupsWithDeadlines = ticketGroupsData.filter(
        tg => tg.sells_to && new Date(tg.sells_to) < today
    );

    if (ticketGroupsWithDeadlines.length > 0) {
        ticketGroupsWithDeadlines.forEach(tg => {
            const sellsToDate = new Date(tg.sells_to!);
            sellsToDate.setHours(23, 59, 59, 999);
            
            const salesByDay = new Map<number, number>();
            for(let i=0; i<=7; i++) {
                salesByDay.set(i, 0);
            }

            let totalTicketsInWindow = 0;

            allOrders.forEach(order => {
                let orderContainsTicket = false;
                let quantity = 0;
                for (const line of order.order_lines.data) {
                    if (line.name === tg.name) {
                        orderContainsTicket = true;
                        quantity = line.quantity;
                        break;
                    }
                }

                if (orderContainsTicket) {
                    const orderDate = new Date(order.created_at);
                    const timeDiff = sellsToDate.getTime() - orderDate.getTime();
                    const daysBeforeDeadline = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                    if (daysBeforeDeadline >= 0 && daysBeforeDeadline <= 7) {
                        salesByDay.set(daysBeforeDeadline, (salesByDay.get(daysBeforeDeadline) || 0) + quantity);
                        totalTicketsInWindow += quantity;
                    }
                }
            });
            
            if (totalTicketsInWindow > 0) {
                 const salesData = Array.from(salesByDay.entries())
                    .map(([daysBeforeDeadline, ticketsSold]) => {
                        const dateForDay = new Date(sellsToDate.getTime() - daysBeforeDeadline * 24 * 60 * 60 * 1000);
                         return {
                            date: dateForDay.toISOString().split('T')[0],
                            ticketsSold,
                            daysBeforeDeadline,
                        };
                    })
                    .sort((a, b) => b.daysBeforeDeadline - a.daysBeforeDeadline);

                deadlineUrgency.push({
                    ticketTypeName: tg.name,
                    sellsToDate: tg.sells_to!,
                    totalTicketsInWindow,
                    salesData,
                });
            }
        });
        deadlineUrgency.sort((a, b) => b.totalTicketsInWindow - a.totalTicketsInWindow);
    }


    const totalTicketsSold = allAttendees.filter(a => ['sold', 'manually_generated', 'door_sale'].includes(a.state)).length;
    
    const newsletterOptInCount = allAttendees.filter(a => a.newsletter_permission).length;
    const newsletterOptInRate = totalTicketsSold > 0 ? (newsletterOptInCount / totalTicketsSold) * 100 : 0;

    const stats: EventStats = {
        totalTicketsSold,
        netRevenue: netRevenue,
        currency: event.currency,
        newsletterOptInRate,
    };
    
    const checkinAnalytics = analyzeCheckinData(allAttendees);

    return {
        event,
        ticketGroups: ticketGroupsWithCalculatedRevenue,
        stats,
        financialSummary,
        salesByChannel,
        salesByCity,
        salesByCountry,
        salesVelocity,
        purchaseLeadTime,
        revenueBySource,
        activeCampaigns,
        allOrders,
        allAttendees,
        allLedgerEntries,
        bookingQuestionsLoaded: false,
        checkinAnalytics,
        groupPurchaseAnalysis,
        addonAffinity,
        refundAnalysis,
        deadlineUrgency
    };
};

export const useEvents = (apiClient: BillettoApiClient | null, addToast: AddToastFn) => {
    const [events, setEvents] = useState<BillettoEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
    const [eventsError, setEventsError] = useState<string | null>(null);
    const [lastUpdatedEvents, setLastUpdatedEvents] = useState<Date | null>(null);
    const [eventFilter, setEventFilter] = useState('published');
    const [selectedItem, setSelectedItem] = useState<EventListItemType | null>(null);
    const [eventDetails, setEventDetails] = useState<{ [key: string]: EventDetails }>({});
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
    const [isRefreshingDetails, setIsRefreshingDetails] = useState<boolean>(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [eventDetailView, setEventDetailView] = useState<'overview' | 'attendees' | 'bookingQuestions' | 'marketing' | 'checkin'>('overview');
    const [attendeePage, setAttendeePage] = useState(1);
    const [filterTicketGroupId, setFilterTicketGroupId] = useState<string>('all');
    // FIX: Define missing state variables for attendee filtering
    const [filterQuestionId, setFilterQuestionId] = useState<string>('');
    const [filterAnswerText, setFilterAnswerText] = useState<string>('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const isFetchingDetails = useRef(new Set<string>());
    const restorationAttempted = useRef(false);
    const [loadingProgress, setLoadingProgress] = useState<{
        message?: string;
        orders?: number;
        attendees?: number;
        ledger?: number;
    } | null>(null);

    const onRateLimit = useCallback((message: string) => {
        addToast(message, 'info');
    }, [addToast]);

    const fetchAndCacheEvents = useCallback(async () => {
        if (!apiClient) return;
        setLoadingEvents(true);
        setEventsError(null);
        try {
            const allEvents = await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient, 5, undefined, undefined, onRateLimit);
            setEvents(allEvents);
            // Fix: Pass the fetched data, not the type, to the cache function
            await db.setEventsCache(allEvents);
            setLastUpdatedEvents(new Date());
        } catch (err) {
            if (err instanceof NotModifiedError) {
                addToast('Events list is up to date.', 'info');
                setLastUpdatedEvents(new Date());
            } else if (err instanceof BillettoApiError) {
                setEventsError(err.message);
            } else if (err instanceof Error && err.name !== 'CancellationError') {
                setEventsError('An unknown error occurred while fetching events.');
            }
        } finally {
            setLoadingEvents(false);
        }
    }, [apiClient, onRateLimit, addToast]);
// Fix: Add prefetchEventDetails function to handle pre-fetching on hover in EventListItem.
    const fetchEventDetails = useCallback(async (eventId: string, force = false) => {
        if (!apiClient || isFetchingDetails.current.has(eventId)) return;

        const setLoading = force ? setLoadingDetails : setIsRefreshingDetails;
        setLoading(true);
        setDetailsError(null);
        setLoadingProgress(null);
        isFetchingDetails.current.add(eventId);

        try {
            if (!force) {
                const cachedDetails = await db.getEventDetailsCache(eventId);
                if (cachedDetails) {
                    setEventDetails(prev => ({ ...prev, [eventId]: cachedDetails }));
                    // Don't return here, proceed to refresh in the background
                }
            }
            
            const event = events.find(e => e.id === eventId) || await apiClient.getEvent(eventId);
            if (!event) { throw new Error("Event not found"); }

            const fetchAndUpdateProgress = async <T extends {id: string}>(
                key: 'orders' | 'attendees' | 'ledger',
                endpoint: string
            ): Promise<T[]> => {
                const onProgress = (p: number) => {
                    setLoadingProgress(prev => ({ ...prev, [key]: p }));
                };
                return fetchAllPaginatedData<T>(endpoint, apiClient, 5, onProgress, undefined, onRateLimit);
            };

            const [allOrders, allAttendees, allLedgerEntries, ticketGroupsData, campaignsData] = await Promise.all([
                fetchAndUpdateProgress<Order>('orders', `/orders?event=${eventId}&expand=order_lines,order_transactions,order_transactions.data.refunds`),
                fetchAndUpdateProgress<Attendee>('attendees', `/events/${eventId}/attendees?expand=booking_question_responses,scannings,ticket_buyer,space,membership,subscription,ticket_type`),
                fetchAndUpdateProgress<LedgerEntry>('ledger', `/ledger_entries?event=${eventId}`),
                fetchAllPaginatedData<TicketGroup>(`/ticket_types?event=${eventId}`, apiClient, 5, undefined, undefined, onRateLimit),
                fetchAllPaginatedData<Campaign>(`/campaigns?event=${eventId}`, apiClient, 5, undefined, undefined, onRateLimit),
            ]);
            
            setLoadingProgress({ message: 'Analyzing data...' });

            const activeCampaigns = campaignsData
                .filter(c => c.state === 'active' || c.state === 'running')
                .flatMap(c => {
                    const timeCondition = c.conditions.data.find(cond => cond.type === 'time');
                    if (timeCondition && timeCondition.data.start && timeCondition.data.end) {
                        return [{
                            name: c.name,
                            start: timeCondition.data.start,
                            end: timeCondition.data.end,
                        }];
                    }
                    return [];
                });

            const processedDetails = processAndBuildEventDetails(event, allOrders, allAttendees, allLedgerEntries, ticketGroupsData, activeCampaigns);
            
            const fullDetails: EventDetails = {
                ...processedDetails,
                attendees: [],
                bookingQuestionsLoaded: false,
            };

            setEventDetails(prev => ({ ...prev, [eventId]: fullDetails }));
            await db.setEventDetailsCache(fullDetails);

            const analysis = await runBookingQuestionsAnalysis({ allOrders, allAttendees, ticketGroups: ticketGroupsData, filterTicketGroupId: 'all' });
            if (analysis) {
                 const detailsWithAnalysis = { ...fullDetails, bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true };
                 setEventDetails(prev => ({ ...prev, [eventId]: detailsWithAnalysis }));
                 await db.setEventDetailsCache(detailsWithAnalysis);
            }


        } catch (err: any) {
            setDetailsError(err.message || 'An unknown error occurred.');
        } finally {
            setLoading(false);
            isFetchingDetails.current.delete(eventId);
            setLoadingProgress(null);
        }
    }, [apiClient, events, addToast, onRateLimit, eventDetails]);

    const prefetchEventDetails = useCallback((item: EventListItemType) => {
        if (!item) return;
        // Don't force a refresh, just fetch if not already in cache or being fetched.
        fetchEventDetails(item.id, false);
    }, [fetchEventDetails]);

    const triggerAnalysis = useCallback(async (force: boolean = true) => {
        if (!selectedItem) return;
        setLoadingAnalysis(true);
        try {
            const currentDetails = eventDetails[selectedItem.id];
            if (currentDetails && (currentDetails.bookingQuestionsLoaded && !force)) {
                return;
            }
            if(currentDetails && currentDetails.allOrders && currentDetails.allAttendees) {
                const analysis = await runBookingQuestionsAnalysis({
                    allOrders: currentDetails.allOrders,
                    allAttendees: currentDetails.allAttendees,
                    ticketGroups: currentDetails.ticketGroups,
                    filterTicketGroupId: filterTicketGroupId
                });

                if (analysis) {
                    const detailsWithAnalysis = { ...currentDetails, bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true };
                    setEventDetails(prev => ({ ...prev, [selectedItem.id]: detailsWithAnalysis }));
                    await db.setEventDetailsCache(detailsWithAnalysis);
                }
            } else {
                 addToast('Detailed data not loaded yet. Please wait.', 'info');
            }
        } catch (error: any) {
            addToast(`Analysis failed: ${error.message}`, 'error');
        } finally {
            setLoadingAnalysis(false);
        }
    }, [selectedItem, eventDetails, filterTicketGroupId, addToast]);

    // FIX: Load events from cache on mount, or fetch if cache is empty.
    useEffect(() => {
        const loadEvents = async () => {
            if (!apiClient) {
                setLoadingEvents(false);
                return;
            }
            const { events: cachedEvents, lastUpdated } = await db.getEventsCache();
            if (cachedEvents && cachedEvents.length > 0) {
                setEvents(cachedEvents);
                if (lastUpdated) setLastUpdatedEvents(new Date(lastUpdated));
                setLoadingEvents(false);
            } else {
                fetchAndCacheEvents();
            }
        };
        loadEvents();
    }, [apiClient, fetchAndCacheEvents]);

    useEffect(() => {
        const storedItemId = sessionStorage.getItem('selectedEventId');
        if (storedItemId && events.length > 0 && !restorationAttempted.current) {
            const foundItem = events.find(e => e.id === storedItemId);
            if (foundItem) {
                setSelectedItem(foundItem);
            }
            restorationAttempted.current = true;
        }
    }, [events]);

    useEffect(() => {
        if (selectedItem) {
            sessionStorage.setItem('selectedEventId', selectedItem.id);
            setEventDetailView('overview');
            setAttendeePage(1);
            setFilterTicketGroupId('all');
            fetchEventDetails(selectedItem.id, false);
        } else {
            sessionStorage.removeItem('selectedEventId');
        }
    }, [selectedItem, fetchEventDetails]);

    const eventList = useMemo(() => {
        const eventMap = new Map<string, BillettoEvent>();
        const childrenMap = new Map<string, BillettoEvent[]>();

        events.forEach(event => {
            eventMap.set(event.id, event);
            if (event.parent && typeof event.parent === 'string') {
                if (!childrenMap.has(event.parent)) {
                    childrenMap.set(event.parent, []);
                }
                childrenMap.get(event.parent)!.push(event);
            }
        });

        const listItems: EventListItemType[] = [];
        const processedIds = new Set<string>();

        events.forEach(event => {
            if (processedIds.has(event.id)) return;

            const children = (childrenMap.get(event.id) || []).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
            if (children.length > 0) {
                listItems.push({ ...event, isGroup: true, children });
                children.forEach(c => processedIds.add(c.id));
            } else if (!event.parent) {
                listItems.push(event);
            }
            processedIds.add(event.id);
        });

        return listItems;

    }, [events]);

     const filteredEventListItems = useMemo(() => {
        if (eventFilter === 'all') return eventList;
        return eventList.filter(item => {
            if ('isGroup' in item) {
                return item.children.some(child => child.state === eventFilter);
            }
            return item.state === eventFilter;
        });
    }, [eventList, eventFilter]);
    
    const finalEventDetails = useMemo(() => {
        if (!selectedItem) return null;
        return eventDetails[selectedItem.id] || null;
    }, [selectedItem, eventDetails]);

    const filteredAttendees = useMemo(() => {
        if (!finalEventDetails || !finalEventDetails.allAttendees) return [];
        let attendees = finalEventDetails.allAttendees;

        if (filterQuestionId) {
             attendees = attendees.filter(a => 
                a.booking_question_responses?.data.some(r => {
                    const qId = typeof r.question === 'string' ? r.question : r.question.id;
                    return qId === filterQuestionId;
                })
            );
        }

        if (filterAnswerText) {
            const lowerCaseFilter = filterAnswerText.toLowerCase();
            attendees = attendees.filter(a => 
                a.booking_question_responses?.data.some(r => {
                    const answer = r.answer || r.text || '';
                    const qId = typeof r.question === 'string' ? r.question : r.question.id;
                    const questionMatches = filterQuestionId ? qId === filterQuestionId : true;
                    return questionMatches && answer.toLowerCase().includes(lowerCaseFilter);
                })
            );
        }

        return attendees;
    }, [finalEventDetails, filterQuestionId, filterAnswerText]);
    
    const filteredAttendeesCount = filteredAttendees.length;

    const { items: sortedAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(filteredAttendees, { key: 'created_at', direction: 'descending' });
    
    const paginatedAttendees = useMemo(() => {
        const start = (attendeePage - 1) * ATTENDEES_PER_PAGE;
        return sortedAttendees.slice(start, start + ATTENDEES_PER_PAGE);
    }, [sortedAttendees, attendeePage]);

    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData(finalEventDetails?.ticketGroups || [], { key: 'sold_count', direction: 'descending' });
    
    const availableQuestions = useMemo(() => {
        if (!finalEventDetails?.bookingQuestionsAnalysis) return [];
        return finalEventDetails.bookingQuestionsAnalysis.map(q => ({ id: q.id, name: q.name }));
    }, [finalEventDetails?.bookingQuestionsAnalysis]);
    

    useEffect(() => {
        setAttendeePage(1);
    }, [filterQuestionId, filterAnswerText]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        eventList, filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem,
        finalEventDetails: finalEventDetails ? { ...finalEventDetails, attendees: paginatedAttendees, ticketGroups: sortedTicketGroups } : null,
        loadingDetails, isRefreshingDetails, detailsError, fetchEventDetails, prefetchEventDetails,
        eventDetailView, setEventDetailView,
        attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort, ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
        availableQuestions,
        filterQuestionId,
        setFilterQuestionId,
        filterAnswerText,
        setFilterAnswerText,
        filteredAttendees,
        filteredAttendeesCount
    };
};
