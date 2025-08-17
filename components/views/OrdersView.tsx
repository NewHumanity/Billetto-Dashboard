import React, { useState, useEffect } from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useOrders, OrderFilters } from '../../hooks/useOrders';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import OrdersTable from '../OrdersTable';
import Pagination from '../Pagination';
import OrderDetailsModal from '../OrderDetailsModal';
import { FilterIcon } from '../icons';

interface OrdersViewProps {
    apiClient: BillettoApiClient | null;
}

const ORDERS_PER_PAGE = 100;

const OrdersView: React.FC<OrdersViewProps> = ({ apiClient }) => {
    const {
        sortedOrders, loadingOrders, ordersError, lastUpdatedOrders,
        refreshOrders, ordersPagination, handleOrderPageChange,
        selectedOrderId, setSelectedOrderId, orderDetails, loadingOrderDetails, orderDetailsError,
        requestOrderSort, orderSortConfig,
        events, filters, applyFilters
    } = useOrders(apiClient);

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
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-white">All Orders</h2>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${hasActiveFilters ? 'bg-brand-primary text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}
                        aria-expanded={showFilters}
                    >
                        <FilterIcon />
                        <span>Filters {hasActiveFilters ? `(Active)` : ''}</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="bg-slate-900/50 p-4 rounded-lg mb-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="q" className="block text-sm font-medium text-slate-300 mb-1">Search Buyer</label>
                                <input 
                                    type="search"
                                    id="q"
                                    name="q"
                                    value={localFilters.q}
                                    onChange={handleFilterChange}
                                    placeholder="Name or email..."
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                             <div>
                                <label htmlFor="event" className="block text-sm font-medium text-slate-300 mb-1">Filter by Event</label>
                                <select 
                                    id="event"
                                    name="event"
                                    value={localFilters.event}
                                    onChange={handleFilterChange}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                >
                                    <option value="">All Events</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={handleClearFilters} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Clear</button>
                            <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-brand-primary hover:bg-blue-600 rounded-lg transition-colors">Apply Filters</button>
                        </div>
                    </div>
                )}

                {loadingOrders && sortedOrders.length === 0 ? <Loader /> :
                 ordersError ? <ErrorMessage message={ordersError} /> :
                    <>
                        <OrdersTable 
                            orders={sortedOrders} 
                            onSelectOrder={setSelectedOrderId}
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
            {selectedOrderId && (
                <OrderDetailsModal 
                    order={orderDetails}
                    loading={loadingOrderDetails}
                    error={orderDetailsError}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
};

export default OrdersView;