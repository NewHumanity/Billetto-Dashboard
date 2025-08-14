
import React from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useOrders } from '../../hooks/useOrders';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import OrdersTable from '../OrdersTable';
import Pagination from '../Pagination';
import OrderDetailsModal from '../OrderDetailsModal';

interface OrdersViewProps {
    apiClient: BillettoApiClient | null;
}

const ORDERS_PER_PAGE = 20;

const OrdersView: React.FC<OrdersViewProps> = ({ apiClient }) => {
    const {
        sortedOrders, loadingOrders, ordersError, lastUpdatedOrders,
        fetchAndCacheOrders, ordersPagination, handleOrderPageChange,
        selectedOrderId, setSelectedOrderId, orderDetails, loadingOrderDetails, orderDetailsError,
        requestOrderSort, orderSortConfig
    } = useOrders(apiClient);

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedOrders} loading={loadingOrders} onRefresh={() => fetchAndCacheOrders(1)} viewName="orders" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">All Orders</h2>
                {loadingOrders && sortedOrders.length === 0 ? <Loader /> :
                 ordersError ? <ErrorMessage message={ordersError} /> :
                    <>
                        <OrdersTable 
                            orders={sortedOrders} 
                            onSelectOrder={setSelectedOrderId}
                            requestSort={requestOrderSort}
                            sortConfig={orderSortConfig} 
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
