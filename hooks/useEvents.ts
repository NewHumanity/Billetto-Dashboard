import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { BillettoEvent, EventDetails, TicketGroup, Attendee, BookingQuestionsAnalysis, Order, LedgerEntry, EventGroup, EventListItemType, AvailableQuestion, SalesChannelData, CheckinAnalytics, GeographicSaleData, PurchaseLeadTimeData, Campaign, CampaignTimeBlock, AddonAffinity, RefundAnalysis, DeadlineUrgencyData, FinancialSummary, EventStats } from '../types';
import { BillettoApiClient, BillettoApiError } from '../services/billettoService';
import * as db from '../services/dbService';
import { fetchAllPaginatedData } from '../utils/apiHelpers';
import { useSortableData } from './useSortableData';
import { runBookingQuestionsAnalysis, analyzeCheckinData } from '../utils/analysis';

const ATTENDEES_PER_PAGE = 100;

// This function is extracted to be reusable for both single events and aggregated group data
const processAndBuildEventDetails = (
    event: BillettoEvent,
    allOrders: Order[],
    allAttendees: Attendee[],
    allLedgerEntries: LedgerEntry[],
    ticketGroupsData: TicketGroup[],
    activeCampaigns: CampaignTimeBlock[]
): Omit<EventDetails, 'attendees'> => {

    // --- Fee Attribution Logic ---
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

    // --- Ticket Group Calculation (including new financial data) ---
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
    
    // Hierarchical Sales Channel Breakdown
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

    // --- GEOGRAPHIC ANALYSIS LOGIC ---
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
            totalDiscounts += entry.amount; // This is a negative value
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

    // --- Purchase Lead Time Analysis ---
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
        
        if (leadTimeDays < 0) return; // Ignore purchases made after event start

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

    // --- Group Purchase Behavior Analysis ---
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
        .filter(item => item.count > 0); // Only show buckets with orders

    // --- Add-on Affinity Analysis ---
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
    
    // --- Refund/Cancellation Root Cause Analysis ---
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
                // Simplification: attribute the refund to the first reason found for the order.
                const reason = reasons[0]; 
                refundReasonCounts[reason] = (refundReasonCounts[reason] || 0) + 1;
            }
        }
    });

    const refundAnalysis: RefundAnalysis = Object.entries(refundReasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
        
    // --- Deadline Urgency Analysis ---
    const deadlineUrgency: DeadlineUrgencyData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    const ticketGroupsWithDeadlines = ticketGroupsData.filter(
        tg => tg.sells_to && new Date(tg.sells_to) < today
    );

    if (ticketGroupsWithDeadlines.length > 0) {
        ticketGroupsWithDeadlines.forEach(tg => {
            const sellsToDate = new Date(tg.sells_to!);
            sellsToDate.setHours(23, 59, 59, 999); // Ensure we capture the full day
            
            // Initialize sales data for the last 8 days (0-7)
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
                    .sort((a, b) => b.daysBeforeDeadline - a.daysBeforeDeadline); // Sort from 7 down to 0

                deadlineUrgency.push({
                    ticketTypeName: tg.name,
                    sellsToDate: tg.sells_to!,
                    totalTicketsInWindow,
                    salesData,
                });
            }
        });
        // Sort the entire analysis by which ticket type had the most urgent sales
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

export const useEvents = (apiClient: BillettoApiClient | null) => {
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
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const isFetchingDetails = useRef(false);
    const restorationAttempted = useRef(false);
    const [loadingProgress, setLoadingProgress] = useState<{
        message?: string;
        orders?: number;
        attendees?: number;
        ledger?: number;
    } | null>(null);

    const fetchAndCacheEvents = useCallback(async () => {
        if (!apiClient) return;
        setLoadingEvents(true);
        setEventsError(null);
        try {
            const allEvents = await fetchAllPaginatedData<BillettoEvent>('/events?sort=-starts_at', apiClient);
            setEvents(allEvents);
            await db.setEventsCache(allEvents);
            setLastUpdatedEvents(new Date());
        } catch (err) {
            if (err instanceof BillettoApiError) setEventsError(err.message);
            else setEventsError('An unknown error occurred while fetching events.');
        } finally {
            setLoadingEvents(false);
        }
    }, [apiClient]);

    useEffect(() => {
        const loadCachedEvents = async () => {
            setLoadingEvents(true);
            const { events: cachedEvents, lastUpdated } = await db.getEventsCache();
            if (cachedEvents) {
                setEvents(cachedEvents);
                if(lastUpdated) setLastUpdatedEvents(new Date(lastUpdated));
                setLoadingEvents(false);
            } else {
                fetchAndCacheEvents();
            }
        };
        if (apiClient) {
            loadCachedEvents();
        }
    }, [apiClient, fetchAndCacheEvents]);
    
    const eventListItems = useMemo<EventListItemType[]>(() => {
        const groups: { [key: string]: EventGroup } = {};
        const singleEvents: BillettoEvent[] = [];

        events.forEach(event => {
            if (event.parent && typeof event.parent === 'object' && event.parent.id) {
                const parentId = event.parent.id;
                if (!groups[parentId]) {
                    groups[parentId] = {
                        ...(event.parent as BillettoEvent),
                        id: parentId,
                        name: event.parent.name || 'Event Series',
                        isGroup: true,
                        children: [],
                        currency: event.currency, 
                    };
                }
                groups[parentId].children.push(event);
            } else {
                singleEvents.push(event);
            }
        });

        Object.values(groups).forEach(group => {
            group.children.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
        });

        return [...Object.values(groups), ...singleEvents].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    }, [events]);

    const filteredEventListItems = useMemo(() => {
        if (eventFilter === 'all') return eventListItems;
        return eventListItems.filter(event => event.state === eventFilter);
    }, [eventListItems, eventFilter]);

    useEffect(() => {
        if (selectedItem) {
            setEventDetailView('overview');
            setAttendeePage(1);
            setFilterTicketGroupId('all');
        }
    }, [selectedItem]);

    const finalEventDetails = useMemo(() => {
        return selectedItem ? eventDetails[selectedItem.id] : null;
    }, [selectedItem, eventDetails]);

    const { items: sortedEventAttendees, requestSort: requestEventAttendeesSort, sortConfig: eventAttendeesSortConfig } = useSortableData(finalEventDetails?.attendees || []);
    const { items: sortedTicketGroups, requestSort: requestTicketGroupsSort, sortConfig: ticketGroupsSortConfig } = useSortableData(finalEventDetails?.ticketGroups || []);
    
    // Attendee Filtering Logic
    const [filterQuestionId, setFilterQuestionId] = useState('');
    const [filterAnswerText, setFilterAnswerText] = useState('');

    const availableQuestions = useMemo<AvailableQuestion[]>(() => {
        if (!finalEventDetails?.allAttendees && !finalEventDetails?.allOrders) return [];
        const questions = new Map<string, string>();
        const processResponses = (responses: any) => {
            responses?.data?.forEach((r: any) => {
                if (r.question && typeof r.question === 'object' && r.question.id) {
                    if (!questions.has(r.question.id)) {
                        questions.set(r.question.id, r.question.name);
                    }
                } else if (typeof r.question === 'string' && !questions.has(r.question)) {
                    questions.set(r.question, r.question);
                }
            });
        };
        finalEventDetails?.allAttendees?.forEach(a => processResponses(a.booking_question_responses));
        finalEventDetails?.allOrders?.forEach(o => processResponses(o.booking_question_responses));

        return Array.from(questions, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [finalEventDetails?.allAttendees, finalEventDetails?.allOrders]);

    const filteredAttendees = useMemo(() => {
        if (!finalEventDetails?.allAttendees) return [];
        if (!filterQuestionId && !filterAnswerText) return finalEventDetails.allAttendees;

        const lowerCaseFilterText = filterAnswerText.toLowerCase();

        return finalEventDetails.allAttendees.filter(attendee => {
            return attendee.booking_question_responses?.data?.some(response => {
                const questionMatches = filterQuestionId ? (typeof response.question === 'object' ? response.question.id === filterQuestionId : response.question === filterQuestionId) : true;
                if (!questionMatches) return false;

                const answer = (response.answer || response.text || '').toLowerCase();
                return answer.includes(lowerCaseFilterText);
            });
        });
    }, [finalEventDetails?.allAttendees, filterQuestionId, filterAnswerText]);
    
    const paginatedAndSortedAttendees = useMemo(() => {
        const items = filteredAttendees;
        const start = (attendeePage - 1) * ATTENDEES_PER_PAGE;
        const end = start + ATTENDEES_PER_PAGE;
        return items.slice(start, end);
    }, [filteredAttendees, attendeePage]);

    const { items: sortedAndFilteredAttendees } = useSortableData(paginatedAndSortedAttendees, eventAttendeesSortConfig);

    useEffect(() => {
        if (finalEventDetails) {
            setEventDetails(prev => ({
                ...prev,
                [finalEventDetails.event.id]: {
                    ...finalEventDetails,
                    attendees: sortedAndFilteredAttendees
                }
            }));
        }
    }, [sortedAndFilteredAttendees, finalEventDetails?.event.id]);
    
    const triggerAnalysis = useCallback(async (force = false) => {
        if (!finalEventDetails || isFetchingDetails.current) return;
        const currentId = finalEventDetails.event.id;

        if (!force) {
            const cachedAnalysis = await db.getBookingQuestionsAnalysisCache(currentId);
            if (cachedAnalysis) {
                setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: cachedAnalysis, bookingQuestionsLoaded: true }
                }));
                return;
            }
        }
        
        setLoadingAnalysis(true);
        try {
            const analysis = await runBookingQuestionsAnalysis({
                allOrders: finalEventDetails.allOrders,
                allAttendees: finalEventDetails.allAttendees,
                ticketGroups: finalEventDetails.ticketGroups,
                filterTicketGroupId
            });
            if (analysis) {
                 await db.setBookingQuestionsAnalysisCache(currentId, analysis);
                 setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: analysis, bookingQuestionsLoaded: true }
                }));
            } else {
                 setEventDetails(prev => ({
                    ...prev,
                    [currentId]: { ...prev[currentId], bookingQuestionsAnalysis: [], bookingQuestionsLoaded: true }
                }));
            }
        } catch (error) {
            console.error("Error running analysis:", error);
        } finally {
            setLoadingAnalysis(false);
        }
    }, [finalEventDetails, filterTicketGroupId]);
    
    useEffect(() => {
        if (eventDetailView === 'bookingQuestions' && finalEventDetails && !finalEventDetails.bookingQuestionsLoaded) {
            triggerAnalysis();
        }
    }, [eventDetailView, finalEventDetails, triggerAnalysis]);
    
    useEffect(() => {
        if (finalEventDetails) {
            triggerAnalysis(); 
        }
    }, [filterTicketGroupId]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!selectedItem || !apiClient || isFetchingDetails.current) return;
    
            // Immediately try to load from cache for an instant UI response.
            const cachedDetails = await db.getEventDetailsCache(selectedItem.id);
            if (cachedDetails) {
                setEventDetails(prev => ({ ...prev, [selectedItem.id]: cachedDetails }));
            } else {
                // Only show the blocking loader if there's no cached data at all.
                setLoadingDetails(true);
            }
    
            // Start the full data fetch, either in the background or foreground.
            isFetchingDetails.current = true;
            if (cachedDetails) {
                setIsRefreshingDetails(true); // Signal a non-blocking background refresh.
            }
            setDetailsError(null);
            setLoadingProgress({ message: 'Starting data fetch...' });
    
            try {
                const isGroup = 'isGroup' in selectedItem;
                const eventIds = isGroup ? selectedItem.children.map(c => c.id) : [selectedItem.id];
    
                const [allOrders, allAttendees, allLedgerEntries, ticketGroupsData, eventCampaigns] = await Promise.all([
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<Order>(`/orders?event=${id}&expand=order_lines,order_transactions`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, orders: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<Attendee>(`/events/${id}/attendees?expand=booking_question_responses,scannings,ticket_type`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, attendees: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<LedgerEntry>(`/ledger_entries?event=${id}`, apiClient, 5, p => setLoadingProgress(prev => ({ ...prev, ledger: p }))))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<TicketGroup>(`/ticket_types?event=${id}`, apiClient, 5))).then(res => res.flat()),
                    Promise.all(eventIds.map(id => fetchAllPaginatedData<Campaign>(`/campaigns?event=${id}`, apiClient, 5))).then(res => res.flat()),
                ]);
    
                const activeCampaigns: CampaignTimeBlock[] = eventCampaigns.flatMap(campaign => {
                    return campaign.conditions.data
                        .filter(condition => condition.type === 'time' && condition.data.start && condition.data.end)
                        .map(condition => ({
                            name: campaign.name,
                            start: condition.data.start!,
                            end: condition.data.end!,
                        }));
                });
                
                let eventForProcessing: BillettoEvent = selectedItem;
                if (!isGroup) {
                    try {
                        const fullEvent = await apiClient.getEvent(selectedItem.id, ['venue', 'location', 'organization', 'editorial']);
                        eventForProcessing = fullEvent;
                    } catch (e) {
                        console.warn(`Could not fetch full event details for event ${selectedItem.id}`, e);
                    }
                }
    
                setLoadingProgress({ message: 'Processing data...' });
                const baseDetails = processAndBuildEventDetails(eventForProcessing, allOrders, allAttendees, allLedgerEntries, ticketGroupsData, activeCampaigns);
                
                const fullDetails: EventDetails = {
                    ...baseDetails,
                    attendees: [], 
                };
                
                await db.setEventDetailsCache(fullDetails);
                setEventDetails(prev => ({ ...prev, [selectedItem.id]: fullDetails }));
    
            } catch (err) {
                 if (err instanceof BillettoApiError) setDetailsError(err.message);
                 else setDetailsError('An unknown error occurred while fetching event details.');
            } finally {
                setLoadingDetails(false);
                setIsRefreshingDetails(false);
                isFetchingDetails.current = false;
                setLoadingProgress(null);
            }
        };
    
        fetchDetails();
    }, [selectedItem, apiClient]);

    // --- State Persistence ---
    useEffect(() => {
        if (selectedItem) {
            localStorage.setItem('billettoSelectedItemId', selectedItem.id);
        }
    }, [selectedItem]);

    useEffect(() => {
        if (restorationAttempted.current || eventListItems.length === 0) {
            return;
        }

        const savedId = localStorage.getItem('billettoSelectedItemId');
        if (savedId) {
            const findItemRecursive = (items: EventListItemType[], id: string): EventListItemType | undefined => {
                for (const item of items) {
                    if (item.id === id) {
                        return item;
                    }
                    if ('isGroup' in item && item.children) {
                        const foundChild = item.children.find(child => child.id === id);
                        if (foundChild) {
                            return foundChild;
                        }
                    }
                }
                return undefined;
            };

            const itemToSelect = findItemRecursive(eventListItems, savedId);

            if (itemToSelect) {
                setSelectedItem(itemToSelect);
            } else {
                localStorage.removeItem('billettoSelectedItemId');
            }
        }
        restorationAttempted.current = true;
    }, [eventListItems]);

    return {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem,
        finalEventDetails: useMemo(() => {
            if (!finalEventDetails) return null;
            return {
                ...finalEventDetails,
                attendees: sortedEventAttendees,
                ticketGroups: sortedTicketGroups
            }
        }, [finalEventDetails, sortedEventAttendees, sortedTicketGroups]),
        loadingDetails, detailsError, isRefreshingDetails,
        eventDetailView, setEventDetailView, attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort: requestTicketGroupsSort, ticketGroupsSortConfig: ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
        availableQuestions,
        filterQuestionId, setFilterQuestionId,
        filterAnswerText, setFilterAnswerText,
        filteredAttendees,
        filteredAttendeesCount: filteredAttendees.length,
    };
};