
import React from 'react';
import { Campaign, SortConfig } from '../types';

interface CampaignsTableProps {
  campaigns: Campaign[];
  requestSort: (key: keyof Campaign | string) => void;
  sortConfig: SortConfig<Campaign> | null;
  onSelectCampaign: (campaignId: string) => void;
}

const UsageProgress: React.FC<{count: number, limit: number | null}> = ({ count, limit }) => {
    if (limit === null || limit === 0) {
        return <div className="flex items-center">
            <span className="text-sm text-slate-300 w-20 text-left">{count} / ∞</span>
        </div>;
    }
    const percentage = limit > 0 ? Math.min((count / limit) * 100, 100) : 0;
    return (
        <div className="flex items-center w-full">
            <div className="w-full bg-slate-700 rounded-full h-2.5 mr-3">
                <div 
                    className="bg-brand-primary h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <span className="text-sm text-slate-300 w-16 text-right">{count} / {limit}</span>
        </div>
    );
};

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
    
  const formatDiscount = (campaign: Campaign) => {
    if (campaign.discount_type === 'percentage') {
        return `${campaign.discount_value}% OFF`;
    }
    // A more robust solution would use the event's currency if available.
    return `${(campaign.discount_value / 100).toFixed(2)} fixed`;
  };

  const formatDateRange = (from: string | null, to: string | null) => {
    if (!from && !to) return 'Always active';
    const fromDate = from ? new Date(from).toLocaleDateString('en-GB') : '...';
    const toDate = to ? new Date(to).toLocaleDateString('en-GB') : '...';
    return `${fromDate} - ${toDate}`;
  };
  
  const stateColorMap: { [key: string]: string } = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-slate-600/20 text-slate-400',
    expired: 'bg-red-500/20 text-red-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
  };

  const SortableHeader: React.FC<{ title: string, sortKey: keyof Campaign | string, className?: string }> = ({ title, sortKey, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-white ${className}`}>
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (campaigns.length === 0) {
    return <p className="text-slate-400 text-center py-8">No campaigns found for this account.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Name / Event" sortKey="name" className="w-1/4" />
            <SortableHeader title="State" sortKey="state" />
            <SortableHeader title="Type" sortKey="type" />
            <SortableHeader title="Discount" sortKey="discount_value" />
            <SortableHeader title="Usage" sortKey="usage_count" className="w-1/4"/>
            <SortableHeader title="Validity" sortKey="valid_from" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {campaigns.map((campaign) => {
            const isClickable = campaign.usage_count > 0;
            return (
                <tr 
                    key={campaign.id} 
                    className={`group hover:bg-slate-700/50 transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
                    onClick={() => isClickable && onSelectCampaign(campaign.id)}
                    onKeyPress={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && onSelectCampaign(campaign.id)}
                    tabIndex={isClickable ? 0 : -1}
                    aria-label={isClickable ? `View orders for campaign ${campaign.name}` : undefined}
                >
                    <td className="py-4 px-4">
                        <p className="font-semibold text-white truncate">{campaign.name}</p>
                        <p className="text-xs text-slate-400 truncate">{campaign.event?.name || 'Global Campaign'}</p>
                    </td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${stateColorMap[campaign.state] || ''}`}>
                            {campaign.state}
                        </span>
                    </td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300 capitalize">{(campaign.type || '').replace('_', ' ')}</td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-white">{formatDiscount(campaign)}</td>
                    <td className="py-4 px-4 text-sm text-slate-300">
                        <div className="flex items-center gap-4">
                            <UsageProgress count={campaign.usage_count} limit={campaign.usage_limit} />
                            {isClickable && (
                                <span className="flex-shrink-0 text-xs font-semibold text-brand-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">[Details]</span>
                            )}
                        </div>
                    </td>
                    <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{formatDateRange(campaign.valid_from, campaign.valid_to)}</td>
                </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignsTable;