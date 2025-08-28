import React from 'react';
import { SortConfig } from '../types';
import { ProcessedCampaign } from '../types';

interface CampaignsTableProps {
  campaigns: ProcessedCampaign[];
  requestSort: (key: keyof ProcessedCampaign | string) => void;
  sortConfig: SortConfig<ProcessedCampaign> | null;
  onSelectCampaign: (campaignId: string) => void;
}

const SortIndicator = ({ direction }: { direction?: 'ascending' | 'descending' }) => {
    const iconClass = "h-4 w-4 transition-opacity";
    if (!direction) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={`${iconClass} text-slate-500 opacity-50 group-hover:opacity-100`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (direction === 'ascending') {
        return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
};

const CampaignsTable: React.FC<CampaignsTableProps> = ({ campaigns, requestSort, sortConfig, onSelectCampaign }) => {
  
  const formatCurrency = (value: number | undefined, currencyCode: string | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (!currencyCode || currencyCode === 'N/A') {
        return (value / 100).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(value / 100);
    } catch (e) {
        return `${(value / 100).toFixed(2)} ${currencyCode}`;
    }
  };

  const stateColorMap: { [key: string]: string } = {
    active: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    running: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    inactive: 'bg-slate-100 dark:bg-slate-600/20 text-slate-600 dark:text-slate-400',
    paused: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    expired: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    completed: 'bg-slate-100 dark:bg-slate-600/20 text-slate-600 dark:text-slate-400',
    scheduled: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    prepared: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  const SortableHeader: React.FC<{ title: string, sortKey: keyof ProcessedCampaign | string, className?: string }> = ({ title, sortKey, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const alignClass = className?.includes('text-right') ? 'justify-end w-full' : '';
    return (
        <th scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-slate-900 dark:text-white ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`flex items-center gap-2 group ${alignClass}`}>
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (campaigns.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No campaigns found for this account.</p>;
  }
  
  const hasAnalysisData = campaigns.length > 0 && campaigns[0].generatedRevenue !== undefined;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Name / Event" sortKey="name" />
            <SortableHeader title="State" sortKey="state" />
            <SortableHeader title="Discount" sortKey="discountValueForSort" />
            <SortableHeader title="Total Orders" sortKey="usageCount" className="text-right" />
            {hasAnalysisData && (
              <>
                <SortableHeader title="Generated Revenue" sortKey="generatedRevenue" className="text-right" />
                <SortableHeader title="AOV" sortKey="averageOrderValue" className="text-right" />
                <SortableHeader title="ROI" sortKey="roi" className="text-right" />
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {campaigns.map((campaign) => {
            const isClickable = campaign.usageCount > 0;
            return (
                <tr 
                    key={campaign.id} 
                    className={`group md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                    onClick={() => onSelectCampaign(campaign.id)}
                    onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectCampaign(campaign.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for campaign ${campaign.name}`}
                >
                    <td data-label="Campaign" className="py-4 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{campaign.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{campaign.eventName}</p>
                    </td>
                    <td data-label="State" className="whitespace-nowrap py-4 px-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${stateColorMap[campaign.state] || ''}`}>
                            {campaign.state}
                        </span>
                    </td>
                    <td data-label="Discount" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-slate-900 dark:text-white">{campaign.discountDisplay}</td>
                    <td data-label="Total Orders" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-4 justify-end">
                            <span>{campaign.usageCount.toLocaleString()}</span>
                            {isClickable && (
                                <span className="flex-shrink-0 text-xs font-semibold text-brand-primary/90 dark:text-brand-primary/80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">[Details]</span>
                            )}
                        </div>
                    </td>
                    {hasAnalysisData && (
                      <>
                        <td data-label="Generated Revenue" className="whitespace-nowrap py-4 px-4 text-sm text-green-600 dark:text-green-400 font-semibold">{formatCurrency(campaign.generatedRevenue, campaign.currency)}</td>
                        <td data-label="AOV" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300 font-semibold">{formatCurrency(campaign.averageOrderValue, campaign.currency)}</td>
                        <td data-label="ROI" className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-right">
                          {(() => {
                            if (campaign.roi === undefined || campaign.roi === null) {
                              return <span className="text-slate-500 dark:text-slate-400">N/A</span>;
                            }
                            const roiColor = campaign.roi > 100 ? 'text-green-600 dark:text-green-400' : campaign.roi > 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-red-600 dark:text-red-400';
                            return <span className={roiColor}>{campaign.roi.toFixed(1)}%</span>;
                          })()}
                        </td>
                      </>
                    )}
                </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignsTable;