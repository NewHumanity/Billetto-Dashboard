import React, { useState, useEffect, useContext } from 'react';
import { OrderFilters } from '../../hooks/useOrders';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import OrdersTable from '../OrdersTable';
import { FilterIcon, ExportIcon } from '../icons';
import { AppContext } from '../../contexts/AppContext';
import OrderDetailsView from '../modal_views/OrderDetailsView';
import { exportToCsv } from '../../utils/export';
import { TableSkeleton } from '../Skeleton';

const OrdersView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("OrdersView must be used within an AppContextProvider");

    const {
        orders, loadingOrders, isRefreshingOrders, ordersError, lastUpdatedOrders, fullSortedOrders,
        refreshOrders, ordersPagination,
        setModalView,
        requestOrderSort, orderSortConfig,
        events, filters, applyFilters
    } = context;

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
    };

    const handleClearFilters = () => {
        const clearedFilters = { event: '', q: '' };
        setLocalFilters(clearedFilters);
        applyFilters(clearedFilters);
    };

    const handleSelectOrder = (orderId: string) => {
        setModalView({
            title: `Order ${orderId.substring(0, 8)}...`,
            content: (props) => <OrderDetailsView {...props} orderId={orderId} />
        });
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedOrders} loading={loadingOrders} isRefreshing={isRefreshingOrders} onRefresh={refreshOrders} viewName="orders" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All Orders</h2>
                        {!loadingOrders && (
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {ordersPagination.total.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportToCsv(fullSortedOrders || [], `billetto_all_orders_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                            disabled={!fullSortedOrders || fullSortedOrders.length === 0}
                        >
                            <ExportIcon />
                            <span>Export All</span>
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg mb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="q" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search Buyer</label>
                            <input 
                                type="search"
                                id="q"
                                name="q"
                                value={localFilters.q}
                                onChange={handleFilterChange}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                placeholder="Name, email, or Order ID..."
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

                {loadingOrders && orders.length === 0 ? <TableSkeleton /> :
                 ordersError ? <ErrorMessage message={ordersError} /> :
                    <OrdersTable 
                        orders={fullSortedOrders} 
                        onSelectOrder={handleSelectOrder}
                        requestSort={requestOrderSort}
                        sortConfig={orderSortConfig}
                    />
                }
            </div>
        </div>
    );
};

export default OrdersView;