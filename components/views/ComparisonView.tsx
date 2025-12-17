
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginatedData } from '../../utils/apiHelpers';
import { OrderSchema, AttendeeSchema, LedgerEntrySchema, TicketGroupSchema, CampaignSchema } from '../../schemas';
import { Order, Attendee, LedgerEntry, TicketGroup, Campaign, EventDetails, BillettoEvent } from '../../types';
import { processAndBuildEventDetails } from '../../utils/eventProcessing';
import Loader from '../Loader';
import { CompareIcon, CalendarIcon, TicketIcon, CurrencyIcon } from '../icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const ComparisonView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("ComparisonView must be used within an AppContextProvider");

    const { events, apiClient, theme } = context;
    const [selectedEventIdA, setSelectedEventIdA] = useState<string>('');
    const [selectedEventIdB, setSelectedEventIdB] = useState<string>('');

    // Fetch Details for Event A
    const { data: detailsA, isPending: loadingA } = useQuery({
        queryKey: ['event', selectedEventIdA, 'details'],
        queryFn: async () => fetchEventDetailsForComparison(selectedEventIdA),
        enabled: !!selectedEventIdA && !!apiClient,
        staleTime: 1000 * 60 * 10,
    });

    // Fetch Details for Event B
    const { data: detailsB, isPending: loadingB } = useQuery({
        queryKey: ['event', selectedEventIdB, 'details'],
        queryFn: async () => fetchEventDetailsForComparison(selectedEventIdB),
        enabled: !!selectedEventIdB && !!apiClient,
        staleTime: 1000 * 60 * 10,
    });

    async function fetchEventDetailsForComparison(eventId: string): Promise<EventDetails> {
        if (!apiClient) throw new Error("No API client");
        const event = events.find(e => e.id === eventId) || await apiClient.getEvent(eventId);
        
        const [allOrders, allAttendees, allLedgerEntries, ticketGroupsData, campaignsData] = await Promise.all([
            fetchAllPaginatedData<Order>(`/orders?event=${eventId}&expand=order_lines,order_transactions,order_transactions.data.refunds`, apiClient, 5, undefined, undefined, undefined, OrderSchema),
            fetchAllPaginatedData<Attendee>(`/events/${eventId}/attendees?expand=booking_question_responses,scannings,ticket_buyer,space,membership,subscription,ticket_type`, apiClient, 5, undefined, undefined, undefined, AttendeeSchema),
            fetchAllPaginatedData<LedgerEntry>(`/ledger_entries?event=${eventId}`, apiClient, 5, undefined, undefined, undefined, LedgerEntrySchema),
            fetchAllPaginatedData<TicketGroup>(`/ticket_types?event=${eventId}`, apiClient, 5, undefined, undefined, undefined, TicketGroupSchema),
            fetchAllPaginatedData<Campaign>(`/campaigns?event=${eventId}`, apiClient, 5, undefined, undefined, undefined, CampaignSchema),
        ]);

        const processed = processAndBuildEventDetails(event, allOrders, allAttendees, allLedgerEntries, ticketGroupsData, []);
        return { ...processed, attendees: [], bookingQuestionsLoaded: false }; // Minimal return for comparison
    }

    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
    };

    const calculateDiff = (valA: number, valB: number) => {
        if (valA === 0) return valB === 0 ? 0 : 100;
        return ((valB - valA) / valA) * 100;
    };

    const renderDiffBadge = (diff: number, inverse = false) => {
        const isPositive = diff > 0;
        const isZero = diff === 0;
        // For metrics like Revenue, + is good (Green). For metrics like Refunds, + is bad (Red).
        // inverse = true flips this logic.
        const good = inverse ? !isPositive : isPositive;
        
        let colorClass = 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
        if (!isZero) {
            colorClass = good 
                ? 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400' 
                : 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
        }

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${colorClass}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
            </span>
        );
    };

    const normalizedVelocityData = useMemo(() => {
        if (!detailsA || !detailsB) return [];

        const normalize = (orders: Order[]) => {
            if (orders.length === 0) return [];
            // Sort orders
            const sorted = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            // T0 is the first sale
            const startTime = new Date(sorted[0].created_at).getTime();
            
            const points: { day: number, count: number }[] = [];
            let cumulative = 0;
            const dailyCounts = new Map<number, number>();

            sorted.forEach(o => {
                const t = new Date(o.created_at).getTime();
                const day = Math.floor((t - startTime) / (1000 * 60 * 60 * 24));
                const qty = o.order_lines.data.reduce((sum, line) => sum + line.quantity, 0);
                dailyCounts.set(day, (dailyCounts.get(day) || 0) + qty);
            });

            const maxDay = Math.max(...dailyCounts.keys());
            for(let i=0; i<=maxDay; i++) {
                cumulative += (dailyCounts.get(i) || 0);
                points.push({ day: i, count: cumulative });
            }
            return points;
        };

        const seriesA = normalize(detailsA.allOrders || []);
        const seriesB = normalize(detailsB.allOrders || []);

        const maxDay = Math.max(
            seriesA.length > 0 ? seriesA[seriesA.length - 1].day : 0,
            seriesB.length > 0 ? seriesB[seriesB.length - 1].day : 0
        );

        const mergedData = [];
        for(let i=0; i<=maxDay; i++) {
            const pointA = seriesA.find(p => p.day === i);
            const pointB = seriesB.find(p => p.day === i);
            
            // Fill forward logic: if no data point for this day, use the previous known cumulative total
            const valA = pointA ? pointA.count : (mergedData.length > 0 ? mergedData[mergedData.length-1].valA : (seriesA.length > 0 && i > seriesA[seriesA.length-1].day ? seriesA[seriesA.length-1].count : 0));
            const valB = pointB ? pointB.count : (mergedData.length > 0 ? mergedData[mergedData.length-1].valB : (seriesB.length > 0 && i > seriesB[seriesB.length-1].day ? seriesB[seriesB.length-1].count : 0));
            
            mergedData.push({
                day: i,
                valA,
                valB
            });
        }
        return mergedData;

    }, [detailsA, detailsB]);

    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const axisColor = isDarkMode ? '#A0AEC0' : '#4A5568';
    const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';

    const getFirstXSales = (orders: Order[], hours: number) => {
        if (orders.length === 0) return 0;
        const sorted = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const startTime = new Date(sorted[0].created_at).getTime();
        const cutoff = startTime + (hours * 60 * 60 * 1000);
        
        return sorted.filter(o => new Date(o.created_at).getTime() <= cutoff)
                     .reduce((sum, o) => sum + o.order_lines.data.reduce((lSum, l) => lSum + l.quantity, 0), 0);
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                        <CompareIcon />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Event Comparison</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Select two events to compare performance metrics side-by-side.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Event A Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event A (Baseline)</label>
                        <select
                            value={selectedEventIdA}
                            onChange={(e) => setSelectedEventIdA(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="">Select Event A...</option>
                            {events.map(e => <option key={e.id} value={e.id}>{e.name || 'Untitled'} ({new Date(e.starts_at || '').toLocaleDateString()})</option>)}
                        </select>
                    </div>

                    {/* Event B Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Event B (Comparison)</label>
                        <select
                            value={selectedEventIdB}
                            onChange={(e) => setSelectedEventIdB(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            <option value="">Select Event B...</option>
                            {events.map(e => <option key={e.id} value={e.id}>{e.name || 'Untitled'} ({new Date(e.starts_at || '').toLocaleDateString()})</option>)}
                        </select>
                    </div>
                    
                    {/* VS Badge */}
                    <div className="absolute left-1/2 top-9 -translate-x-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 rounded-full border-2 border-gray-200 dark:border-slate-600 font-bold text-slate-400 z-10">
                        VS
                    </div>
                </div>
            </div>

            {(loadingA || loadingB) && (
                <div className="flex justify-center p-12">
                    <Loader message="Fetching and analyzing event data..." />
                </div>
            )}

            {detailsA && detailsB && !loadingA && !loadingB && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Head-to-Head Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Net Revenue */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-t-4 border-green-500">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                <CurrencyIcon className="w-4 h-4" /> Net Revenue
                            </h3>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs text-slate-400">Event A</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(detailsA.stats.netRevenue, detailsA.stats.currency)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Event B</p>
                                    <p className="font-bold text-xl text-slate-900 dark:text-white">{formatCurrency(detailsB.stats.netRevenue, detailsB.stats.currency)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {renderDiffBadge(calculateDiff(detailsA.stats.netRevenue, detailsB.stats.netRevenue))}
                            </div>
                        </div>

                        {/* Tickets Sold */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-t-4 border-blue-500">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                <TicketIcon className="w-4 h-4" /> Tickets Sold
                            </h3>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-xs text-slate-400">Event A</p>
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">{detailsA.stats.totalTicketsSold.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Event B</p>
                                    <p className="font-bold text-xl text-slate-900 dark:text-white">{detailsB.stats.totalTicketsSold.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                {renderDiffBadge(calculateDiff(detailsA.stats.totalTicketsSold, detailsB.stats.totalTicketsSold))}
                            </div>
                        </div>

                        {/* Initial Velocity (24h) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-t-4 border-purple-500">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" /> First 24h Sales
                            </h3>
                            {(() => {
                                const salesA = getFirstXSales(detailsA.allOrders || [], 24);
                                const salesB = getFirstXSales(detailsB.allOrders || [], 24);
                                return (
                                    <>
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <p className="text-xs text-slate-400">Event A</p>
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{salesA.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Event B</p>
                                                <p className="font-bold text-xl text-slate-900 dark:text-white">{salesB.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {renderDiffBadge(calculateDiff(salesA, salesB))}
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Velocity Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cumulative Sales Velocity</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Comparing growth rate starting from Day 0 (First Sale).</p>
                        
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <LineChart data={normalizedVelocityData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke={axisColor}
                                        label={{ value: 'Days Since First Sale', position: 'insideBottom', offset: -10, fill: axisColor }}
                                    />
                                    <YAxis 
                                        stroke={axisColor}
                                        label={{ value: 'Cumulative Tickets Sold', angle: -90, position: 'insideLeft', fill: axisColor }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#fff' : '#000' }}
                                        labelFormatter={(day) => `Day ${day}`}
                                    />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Line type="monotone" dataKey="valA" name={`A: ${detailsA.event.name}`} stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                    <Line type="monotone" dataKey="valB" name={`B: ${detailsB.event.name}`} stroke="#3b82f6" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ComparisonView;
