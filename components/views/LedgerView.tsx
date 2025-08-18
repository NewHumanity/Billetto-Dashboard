import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import LedgerTable from '../LedgerTable';
import Pagination from '../Pagination';
import { AppContext } from '../../contexts/AppContext';

const LEDGER_ENTRIES_PER_PAGE = 100;

const LedgerView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("LedgerView must be used within an AppContextProvider");
    
    const {
        sortedLedger, loadingLedger, ledgerError, lastUpdatedLedger,
        fetchAndCacheLedger, ledgerPagination, handleLedgerPageChange,
        setOrderDetailsModalId,
        requestLedgerSort, ledgerSortConfig
    } = context;

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedLedger} loading={loadingLedger} onRefresh={() => fetchAndCacheLedger(1)} viewName="financial records" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Financial Ledger</h2>
                {loadingLedger && sortedLedger.length === 0 ? <Loader /> :
                 ledgerError ? <ErrorMessage message={ledgerError} /> :
                    <>
                        <LedgerTable
                            entries={sortedLedger}
                            requestSort={requestLedgerSort}
                            sortConfig={ledgerSortConfig}
                            onSelectOrder={setOrderDetailsModalId}
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
            {/* The OrderDetailsModal is now rendered globally in App.tsx */}
        </div>
    );
};

export default LedgerView;