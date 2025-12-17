
import { 
    BillettoEvent, 
    EventDetails, 
    TicketGroup, 
    Attendee, 
    Order, 
    LedgerEntry, 
    CampaignTimeBlock, 
    SalesChannelData, 
    GeographicSaleData, 
    FinancialSummary, 
    PurchaseLeadTimeData, 
    AddonAffinity, 
    RefundAnalysis, 
    DeadlineUrgencyData, 
    EventStats 
} from '../types';
import { analyzeCheckinData } from './analysis';

export const processAndBuildEventDetails = (
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

    const eventStartsAt = event.starts_at ? new Date(event.starts_at).getTime() : NaN;
    const leadTimeBuckets = {
        'Last 24 Hours': { tickets: 0, sortOrder: 1 },
        '2-7 Days Out': { tickets: 0, sortOrder: 2 },
        '8-14 Days Out': { tickets: 0, sortOrder: 3 },
        '15-30 Days Out': { tickets: 0, sortOrder: 4 },
        '1-2 Months Out': { tickets: 0, sortOrder: 5 },
        'Over 2 Months Out': { tickets: 0, sortOrder: 6 },
    };

    if (!isNaN(eventStartsAt)) {
        allOrders.forEach(order => {
            const orderCreatedAt = new Date(order.created_at).getTime();
            if (isNaN(orderCreatedAt)) return;

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
    }
    
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
