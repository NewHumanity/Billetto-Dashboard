

import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import LedgerTable from '../LedgerTable';
import Pagination from '../Pagination';
import { AppContext } from '../../contexts/AppContext';
import OrderDetailsView from '../modal_views/OrderDetailsView';
import { ExportIcon } from '../icons';
import { exportToCsv } from '../../utils/export';

const LEDGER_ENTRIES_PER_PAGE = 100;

const LedgerView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("LedgerView must be used within an AppContextProvider");
    
    const {
        ledgerEntries, loadingLedger, isRefreshingLedger, ledgerError, lastUpdatedLedger, fullSortedLedger,
        refreshLedger, ledgerPagination, handleLedgerPageChange,
        setModalView,
        requestLedgerSort, ledgerSortConfig
    } = context;

    const handleSelectOrder = (orderId: string) => {
        setModalView({
            title: `Order ${orderId.substring(0, 8)}...`,
            content: (props) => <OrderDetailsView {...props} orderId={orderId} />
        });
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedLedger} loading={loadingLedger} isRefreshing={isRefreshingLedger} onRefresh={refreshLedger} viewName="financial records" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Financial Ledger</h2>
                    <button
                        onClick={() => exportToCsv(fullSortedLedger, `billetto_ledger_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        disabled={!fullSortedLedger || fullSortedLedger.length === 0}
                    >
                        <ExportIcon />
                        <span>Export All</span>
                    </button>
                </div>
                {loadingLedger && ledgerEntries.length === 0 ? <Loader /> :
                 ledgerError ? <ErrorMessage message={ledgerError} /> :
                    <>
                        <LedgerTable
                            entries={ledgerEntries}
                            requestSort={requestLedgerSort}
                            sortConfig={ledgerSortConfig}
                            onSelectOrder={handleSelectOrder}
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
        </div>
    );
};

export default LedgerView;