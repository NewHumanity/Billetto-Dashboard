import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AudienceTable from '../AudienceTable';
import Pagination from '../Pagination';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

const AudienceView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AudienceView must be used within an AppContextProvider");

    const {
        audience,
        loading,
        error,
        lastUpdated,
        progress,
        performAnalysis,
        pagination,
        handlePageChange,
        requestSort,
        sortConfig,
        setCustomerDetailsModalId
    } = context;

    const refreshData = () => {
        performAnalysis(true);
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdated} loading={loading} onRefresh={refreshData} viewName="audience analysis" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                 <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Audience Directory</h2>
                 {loading && audience.length === 0 ? (
                    <Loader message={progress?.message || 'Loading audience...'} progress={progress?.value} />
                 ) : error ? (
                    <ErrorMessage message={error} />
                 ) : (
                    <>
                        <AudienceTable
                            audienceMembers={audience}
                            requestSort={requestSort}
                            sortConfig={sortConfig}
                            onSelectCustomer={setCustomerDetailsModalId}
                        />
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalItems={pagination.total}
                            itemsPerPage={AUDIENCE_MEMBERS_PER_PAGE}
                            onPageChange={handlePageChange}
                        />
                    </>
                 )}
            </div>
            {/* The CustomerDetailsModal is rendered globally in App.tsx */}
        </div>
    );
};

export default AudienceView;