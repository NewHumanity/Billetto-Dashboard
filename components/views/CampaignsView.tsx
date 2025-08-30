
import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import CampaignsTable from '../CampaignsTable';
import { AppContext } from '../../contexts/AppContext';
import { SparklesIcon, ExportIcon } from '../icons';
import CampaignDetailsView from '../modal_views/CampaignDetailsView';
import { exportToCsv } from '../../utils/export';

const CampaignsView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("CampaignsView must be used within an AppContextProvider");

    const {
        sortedCampaigns, loadingCampaigns, isRefreshingCampaigns, campaignsError, lastUpdatedCampaigns,
        requestCampaignSort, campaignSortConfig,
        setModalView,
        performFinancialAnalysis,
        analysisProgress
    } = context;

    const hasAnalysisData = sortedCampaigns.length > 0 && sortedCampaigns[0].generatedRevenue !== undefined;

    const handleSelectCampaign = (campaignId: string) => {
        const campaign = sortedCampaigns.find(c => c.id === campaignId);
        setModalView({
            title: campaign ? campaign.name : "Campaign Details",
            content: (props) => <CampaignDetailsView {...props} campaignId={campaignId} />
        });
    };

    const renderContent = () => {
        if (loadingCampaigns && analysisProgress) {
            return <Loader message={analysisProgress.message} progress={analysisProgress.value} />;
        }
        if (loadingCampaigns && sortedCampaigns.length === 0) {
            return <Loader message="Loading campaigns..." />;
        }
        if (campaignsError) {
            return <ErrorMessage message={campaignsError} />;
        }
        if (!hasAnalysisData) {
            return (
                <div className="text-center py-16 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-700">
                    <div className="flex justify-center mb-4 text-brand-primary"><SparklesIcon /></div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Unlock Financial Insights</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">Run a one-time analysis to calculate the generated revenue, discounts, and ROI for all your campaigns.</p>
                    <button 
                        onClick={() => performFinancialAnalysis(true)}
                        disabled={loadingCampaigns}
                        className="mt-6 bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loadingCampaigns ? 'Loading...' : 'Analyze Performance'}
                    </button>
                </div>
            )
        }
        return (
            <CampaignsTable 
                campaigns={sortedCampaigns}
                requestSort={requestCampaignSort}
                sortConfig={campaignSortConfig}
                onSelectCampaign={handleSelectCampaign}
            />
        );
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedCampaigns} loading={loadingCampaigns && !analysisProgress} isRefreshing={isRefreshingCampaigns} onRefresh={() => performFinancialAnalysis(true)} viewName="campaigns" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Marketing Campaigns</h2>
                    {sortedCampaigns.length > 0 && (
                        <button
                            onClick={() => exportToCsv(sortedCampaigns, `billetto_campaigns_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            <ExportIcon />
                            <span>Export</span>
                        </button>
                    )}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default CampaignsView;