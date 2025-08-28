import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import PerformanceTable from '../PerformanceTable';
import Pagination from '../Pagination';
import { TeacherIcon, ExportIcon } from '../icons';
import { exportToCsv } from '../../utils/export';

const PERFORMANCE_PAGE_SIZE = 100;

const PerformanceView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("PerformanceView must be used within an AppContextProvider");

    const {
        analyzedEvents,
        loading,
        error,
        lastUpdated,
        progress,
        performAnalysis,
        pagination,
        handlePageChange,
        requestPerformanceSort,
        performanceSortConfig,
        navigateTo,
        fullAnalyzedEvents,
    } = context;

    const refreshData = () => {
        performAnalysis(true);
    };

    const handleSelectEvent = (eventId: string) => {
        navigateTo('dashboard', eventId);
    };

    const renderContent = () => {
        if (loading && progress) {
            return <Loader message={progress.message} progress={progress.value} />;
        }
        if (loading && analyzedEvents.length === 0) {
            return <Loader message="Loading performance data..." />;
        }
        if (error) {
            return <ErrorMessage message={error} />;
        }
        if (analyzedEvents.length === 0 && !loading) {
            return (
                <div className="text-center py-16 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-700">
                    <div className="flex justify-center mb-4 text-brand-primary"><TeacherIcon /></div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Analyze Event Profitability</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">Run a one-time analysis to calculate the true net profit and rank all your events based on their financial performance.</p>
                    <button 
                        onClick={() => performAnalysis(true)}
                        disabled={loading}
                        className="mt-6 bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Analyzing in Background...' : 'Analyze Performance'}
                    </button>
                </div>
            )
        }
        return (
            <>
                <PerformanceTable
                    analyzedEvents={analyzedEvents}
                    requestSort={requestPerformanceSort}
                    sortConfig={performanceSortConfig}
                    onSelectEvent={handleSelectEvent}
                    currentPage={pagination.currentPage}
                    itemsPerPage={PERFORMANCE_PAGE_SIZE}
                />
                <Pagination
                    currentPage={pagination.currentPage}
                    totalItems={pagination.total}
                    itemsPerPage={PERFORMANCE_PAGE_SIZE}
                    onPageChange={handlePageChange}
                />
            </>
        );
    };
    
    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdated} loading={loading} onRefresh={refreshData} viewName="performance analysis" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                 <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Event Performance Ranking</h2>
                    {fullAnalyzedEvents.length > 0 && (
                        <button 
                            onClick={() => exportToCsv(fullAnalyzedEvents, `billetto_performance_analysis_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            <ExportIcon />
                            Export
                        </button>
                    )}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default PerformanceView;