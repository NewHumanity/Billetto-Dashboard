
import React, { useEffect, useState } from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useLedger } from '../../hooks/useLedger';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import LedgerTable from '../LedgerTable';
import Pagination from '../Pagination';
import OrderDetailsModal from '../OrderDetailsModal';
import { Order } from '../../types';
import * as db from '../../services/dbService';
import { BillettoApiError } from '../../services/billettoService';

interface LedgerViewProps {
    apiClient: BillettoApiClient | null;
}

const LEDGER_ENTRIES_PER_PAGE = 100;

const LedgerView: React.FC<LedgerViewProps> = ({ apiClient }) => {
    const {
        sortedLedger, loadingLedger, ledgerError, lastUpdatedLedger,
        fetchAndCacheLedger, ledgerPagination, handleLedgerPageChange,
        selectedOrderId, setSelectedOrderId,
        requestLedgerSort, ledgerSortConfig
    } = useLedger(apiClient);

    // Order details logic needs to be here because it's shared across views
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [loadingOrderDetails, setLoadingOrderDetails] = useState<boolean>(false);
    const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!selectedOrderId || !apiClient) return;
            setLoadingOrderDetails(true);
            setOrderDetailsError(null);
            const cachedOrder = await db.getOrderDetailsCache(selectedOrderId);
            if (cachedOrder) {
                setOrderDetails(cachedOrder);
                setLoadingOrderDetails(false);
                return;
            }
            try {
                const order = await apiClient.getOrder(selectedOrderId, ['event', 'order_lines']);
                setOrderDetails(order);
                await db.setOrderDetailsCache(order);
            } catch (err) {
                if (err instanceof BillettoApiError) setOrderDetailsError(err.message);
                else setOrderDetailsError('An unknown error occurred fetching order details.');
            } finally {
                setLoadingOrderDetails(false);
            }
        };
        fetchOrderDetails();
    }, [selectedOrderId, apiClient]);

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedLedger} loading={loadingLedger} onRefresh={() => fetchAndCacheLedger(1)} viewName="financial records" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Financial Ledger</h2>
                {loadingLedger && sortedLedger.length === 0 ? <Loader /> :
                 ledgerError ? <ErrorMessage message={ledgerError} /> :
                    <>
                        <LedgerTable
                            entries={sortedLedger}
                            requestSort={requestLedgerSort}
                            sortConfig={ledgerSortConfig}
                            onSelectOrder={setSelectedOrderId}
                        />
                        <Pagination
                            currentPage={ledgerPagination.currentPage}
                            totalItems={ledgerPagination.total}
                            itemsPerPage={LEDGER_ENTRIES_PER_PAGE}
                            onPageChange={handleLedgerPageChange}
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

export default LedgerView;