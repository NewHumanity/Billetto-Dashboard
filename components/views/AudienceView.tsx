import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AudienceTable from '../AudienceTable';
import Pagination from '../Pagination';
import CustomerDetailsView from '../modal_views/CustomerDetailsView';
import { ExportIcon } from '../icons';
import { exportToCsv } from '../../utils/export';

const AUDIENCE_MEMBERS_PER_PAGE = 100;

const AudienceView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AudienceView must be used within an AppContextProvider");

    const {
        audience,
        loadingAudience: loading,
        audienceError: error,
        lastUpdatedAudience: lastUpdated,
        audienceProgress: progress,
        performAudienceAnalysis,
        audiencePagination: pagination,
        handleAudiencePageChange: handlePageChange,
        requestAudienceSort,
        audienceSortConfig,
        setModalView,
        fullAudience,
        activeSegment,
        setActiveSegment,
    } = context;

    const refreshData = () => {
        performAudienceAnalysis(true);
    };

    const handleSelectCustomer = (customerId: string) => {
        const customer = fullAudience.find(c => c.id === customerId);
        setModalView({
            title: customer ? customer.name : "Customer Details",
            content: (props) => <CustomerDetailsView {...props} customerId={customerId} />
        });
    };

    const segments = React.useMemo(() => {
        if (!fullAudience || fullAudience.length === 0) return [];
        const segmentCounts = fullAudience.reduce((acc, member) => {
            const segment = member.rfmSegment || 'Unknown';
            acc[segment] = (acc[segment] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const priority = ['Champions', 'Loyal Customers', 'Potential Loyalists', 'New Customers', 'At Risk', 'Hibernating', 'Needs Attention'];
        
        return [
            { name: 'All', count: fullAudience.length },
            ...priority
                .filter(name => segmentCounts[name])
                .map(name => ({ name, count: segmentCounts[name] }))
        ];
    }, [fullAudience]);


    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdated} loading={loading} onRefresh={refreshData} viewName="audience analysis" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                 <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Audience Directory</h2>
                    {fullAudience.length > 0 && (
                        <button
                            onClick={() => exportToCsv(fullAudience, `billetto_audience_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            <ExportIcon />
                            <span>Export All</span>
                        </button>
                    )}
                 </div>

                {segments.length > 0 && (
                     <div className="mb-6">
                        <div className="overflow-x-auto hide-scrollbar">
                            <div className="flex flex-nowrap gap-2 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg">
                                {segments.map(segment => (
                                    <button
                                        key={segment.name}
                                        onClick={() => setActiveSegment(segment.name)}
                                        className={`flex-shrink-0 flex items-center gap-2 text-center px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/80 ${
                                            activeSegment === segment.name
                                                ? 'bg-brand-primary text-white shadow'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <span>{segment.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeSegment === segment.name ? 'bg-white/20' : 'bg-gray-200 dark:bg-slate-700'}`}>{segment.count.toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                 {loading && audience.length === 0 ? (
                    <Loader message={progress?.message || 'Loading audience...'} progress={progress?.value} />
                 ) : error ? (
                    <ErrorMessage message={error} />
                 ) : (
                    <>
                        <AudienceTable
                            audienceMembers={audience}
                            requestSort={requestAudienceSort}
                            sortConfig={audienceSortConfig}
                            onSelectCustomer={handleSelectCustomer}
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
        </div>
    );
};

export default AudienceView;