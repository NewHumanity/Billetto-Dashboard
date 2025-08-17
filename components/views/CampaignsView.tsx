
import React from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useCampaigns } from '../../hooks/useCampaigns';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import CampaignsTable from '../CampaignsTable';
import Pagination from '../Pagination';
import CampaignDetailsModal from '../CampaignDetailsModal';

interface CampaignsViewProps {
    apiClient: BillettoApiClient | null;
}

const CAMPAIGNS_PER_PAGE = 100;
const CAMPAIGN_ORDERS_PER_PAGE = 100;

const CampaignsView: React.FC<CampaignsViewProps> = ({ apiClient }) => {
    const {
        sortedCampaigns, loadingCampaigns, campaignsError, lastUpdatedCampaigns,
        fetchAndCacheCampaigns, campaignsPagination, handleCampaignPageChange,
        requestCampaignSort, campaignSortConfig,
        handleSelectCampaign, selectedCampaignId, setSelectedCampaignId,
        campaignDetails, loadingCampaignDetails, campaignDetailsError,
        campaignOrdersPage, setCampaignOrdersPage, campaignOrdersTotal
    } = useCampaigns(apiClient);

    const handleCampaignOrdersPageChange = (page: number) => {
        setCampaignOrdersPage(page);
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedCampaigns} loading={loadingCampaigns} onRefresh={() => fetchAndCacheCampaigns(1)} viewName="campaigns" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">Marketing Campaigns</h2>
                {loadingCampaigns && sortedCampaigns.length === 0 ? <Loader /> :
                 campaignsError ? <ErrorMessage message={campaignsError} /> :
                    <>
                        <CampaignsTable 
                            campaigns={sortedCampaigns}
                            requestSort={requestCampaignSort}
                            sortConfig={campaignSortConfig}
                            onSelectCampaign={handleSelectCampaign}
                        />
                        <Pagination
                            currentPage={campaignsPagination.currentPage}
                            totalItems={campaignsPagination.total}
                            itemsPerPage={CAMPAIGNS_PER_PAGE}
                            onPageChange={handleCampaignPageChange}
                        />
                    </>
                }
            </div>
            {selectedCampaignId && (
                <CampaignDetailsModal
                    campaign={campaignDetails.campaign}
                    orders={campaignDetails.orders}
                    loading={loadingCampaignDetails}
                    error={campaignDetailsError}
                    onClose={() => setSelectedCampaignId(null)}
                    pagination={{ currentPage: campaignOrdersPage, total: campaignOrdersTotal }}
                    onPageChange={handleCampaignOrdersPageChange}
                    itemsPerPage={CAMPAIGN_ORDERS_PER_PAGE}
                />
            )}
        </div>
    );
};

export default CampaignsView;