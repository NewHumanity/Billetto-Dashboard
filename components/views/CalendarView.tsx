
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { CalendarMonthIcon, ChevronDownIcon, FilterIcon } from '../icons';
import { BillettoEvent } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const CalendarView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("CalendarView must be used within an AppContextProvider");

    const { events, filteredEventListItems, navigateTo, allOrders, loadingAllOrders, fetchAllOrdersForSearch } = context;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Navigation
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    const resetToToday = () => {
        setCurrentDate(new Date());
    };

    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    // Adjust for Monday start (ISO 8601 common in Europe/Billetto markets)
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // Events for this month
    const monthEvents = useMemo(() => {
        return filteredEventListItems.filter(item => {
            // Handle Event Groups (Series)
            if ('isGroup' in item) {
                return item.children.some(child => {
                    if (!child.starts_at) return false;
                    const d = new Date(child.starts_at);
                    return d.getMonth() === month && d.getFullYear() === year;
                });
            }
            // Regular Events
            if (!item.starts_at) return false;
            const d = new Date(item.starts_at);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }, [filteredEventListItems, month, year]);

    // Sales Heatmap Data
    const salesHeatmap = useMemo(() => {
        if (!showHeatmap || !allOrders) return null;
        
        const map = new Map<number, number>(); // Day -> Count
        let maxSales = 0;

        allOrders.forEach(order => {
            const d = new Date(order.created_at);
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                const current = map.get(day) || 0;
                map.set(day, current + 1);
                maxSales = Math.max(maxSales, current + 1);
            }
        });

        return { map, maxSales };
    }, [allOrders, showHeatmap, month, year]);

    const getHeatmapColor = (day: number) => {
        if (!salesHeatmap || !salesHeatmap.map.has(day)) return 'bg-white dark:bg-slate-800';
        const count = salesHeatmap.map.get(day) || 0;
        const intensity = salesHeatmap.maxSales > 0 ? count / salesHeatmap.maxSales : 0;
        
        // Green scale
        if (intensity > 0.8) return 'bg-green-200 dark:bg-green-900/60';
        if (intensity > 0.6) return 'bg-green-100 dark:bg-green-900/40';
        if (intensity > 0.4) return 'bg-green-50 dark:bg-green-900/20';
        if (intensity > 0.2) return 'bg-slate-50 dark:bg-slate-800/80';
        return 'bg-white dark:bg-slate-800';
    };

    const handleToggleHeatmap = () => {
        if (!showHeatmap && (!allOrders || allOrders.length === 0)) {
            fetchAllOrdersForSearch(); // Trigger fetch if missing
        }
        setShowHeatmap(!showHeatmap);
    };

    const renderCalendarGrid = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[100px] bg-gray-50/50 dark:bg-slate-900/30 border border-gray-200 dark:border-slate-700/50"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(year, month, day).toLocaleDateString();
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            // Find events for this day
            const dayEvents: { id: string, name: string, state: string, isGroup?: boolean }[] = [];
            
            monthEvents.forEach(item => {
                if ('isGroup' in item) {
                    item.children.forEach(child => {
                        if (child.starts_at && new Date(child.starts_at).getDate() === day && new Date(child.starts_at).getMonth() === month) {
                            dayEvents.push({ id: item.id, name: child.name || item.name || 'Untitled', state: child.state, isGroup: true });
                        }
                    });
                } else {
                    if (item.starts_at && new Date(item.starts_at).getDate() === day) {
                        dayEvents.push({ id: item.id, name: item.name || 'Untitled', state: item.state });
                    }
                }
            });

            // Heatmap coloring
            const bgColor = showHeatmap ? getHeatmapColor(day) : (isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-slate-800');
            const borderColor = isToday ? 'border-brand-primary' : 'border-gray-200 dark:border-slate-700';

            days.push(
                <div key={day} className={`min-h-[120px] p-2 border ${borderColor} ${bgColor} transition-colors relative group hover:z-10 hover:shadow-md`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-primary text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-700 dark:text-slate-300'}`}>
                            {day}
                        </span>
                        {showHeatmap && salesHeatmap?.map.has(day) && (
                            <span className="text-[10px] font-mono text-green-600 dark:text-green-400 bg-white/80 dark:bg-black/40 px-1 rounded">
                                {salesHeatmap.map.get(day)} sales
                            </span>
                        )}
                    </div>
                    <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((evt, idx) => (
                            <button 
                                key={`${evt.id}-${idx}`}
                                onClick={() => navigateTo('dashboard', evt.id)}
                                className={`w-full text-left text-xs truncate px-1.5 py-0.5 rounded border transition-colors ${
                                    evt.state === 'published' 
                                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                }`}
                                title={evt.name}
                            >
                                {evt.isGroup && <span className="mr-1">📚</span>}
                                {evt.name}
                            </button>
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                                +{dayEvents.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return days;
    };

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="animate-fade-in flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <CalendarMonthIcon />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleToggleHeatmap}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                            showHeatmap 
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                            : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                        {loadingAllOrders ? <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"/> : <FilterIcon />}
                        <span>Sales Heatmap</span>
                    </button>
                    <div className="flex items-center bg-gray-100 dark:bg-slate-700/50 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                            <ChevronDownIcon className="w-5 h-5 rotate-90" />
                        </button>
                        <button onClick={resetToToday} className="px-3 py-1 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-primary">
                            Today
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors text-slate-600 dark:text-slate-300">
                            <ChevronDownIcon className="w-5 h-5 -rotate-90" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    {weekDays.map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Days */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                    {renderCalendarGrid()}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
