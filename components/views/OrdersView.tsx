import React, { useState, useEffect, useContext } from 'react';
import { useOrders, OrderFilters } from '../../hooks/useOrders';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import OrdersTable from '../OrdersTable';
import Pagination from '../Pagination';
import { FilterIcon } from '../icons';
import { AppContext } from '../../contexts/AppContext';

const ORDERS_PER_PAGE = 100;

const OrdersView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("OrdersView must be used within an AppContextProvider");

    const {
        sortedOrders, loadingOrders, ordersError, lastUpdatedOrders,
        refreshOrders, ordersPagination, handleOrderPageChange,
        setOrderDetailsModalId,
        requestOrderSort, orderSortConfig,
        events, filters, applyFilters
    } = context;

    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setLocalFilters({
            ...localFilters,
            [e.target.name]: e.target.value
        });
    };

    const handleApplyFilters = () => {
        applyFilters(localFilters);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        const clearedFilters = { event: '', q: '' };
        setLocalFilters(clearedFilters);
        applyFilters(clearedFilters);
        setShowFilters(false);
    };
    
    const hasActiveFilters = filters.event || filters.q;

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedOrders} loading={loadingOrders} onRefresh={refreshOrders} viewName="orders" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All Orders</h2>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${hasActiveFilters ? 'bg-brand-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        aria-expanded={showFilters}
                    >
                        <FilterIcon />
                        <span>Filters {hasActiveFilters ? `(Active)` : ''}</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg mb-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="q" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search Buyer</label>
                                <input 
                                    type="search"
                                    id="q"
                                    name="q"
                                    value={localFilters.q}
                                    onChange={handleFilterChange}
                                    placeholder="Name or email..."
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                             <div>
                                <label htmlFor="event" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter by Event</label>
                                <select 
                                    id="event"
                                    name="event"
                                    value={localFilters.event}
                                    onChange={handleFilterChange}
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                >
                                    <option value="">All Events</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={handleClearFilters} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg transition-colors">Clear</button>
                            <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-blue-600 rounded-lg transition-colors">Apply Filters</button>
                        </div>
                    </div>
                )}

                {loadingOrders && sortedOrders.length === 0 ? <Loader /> :
                 ordersError ? <ErrorMessage message={ordersError} /> :
                    <>
                        <OrdersTable 
                            orders={sortedOrders} 
                            onSelectOrder={setOrderDetailsModalId}
                            requestSort={requestOrderSort}
                            sortConfig={orderSortConfig} 
                            currentPage={ordersPagination.currentPage}
                            itemsPerPage={ORDERS_PER_PAGE}
                        />
                        <Pagination 
                            currentPage={ordersPagination.currentPage}
                            totalItems={ordersPagination.total}
                            itemsPerPage={ORDERS_PER_PAGE}
                            onPageChange={handleOrderPageChange}
                        />
                    </>
                }
            </div>
            {/* The OrderDetailsModal is now rendered globally in App.tsx */}
        </div>
    );
};

export default OrdersView;