import React from 'react';
import { LedgerEntry } from '../types';
import SimpleDonutChart from './SimpleDonutChart';

interface FeeBreakdownDetailsProps {
  feeEntries: LedgerEntry[];
  currency: string;
}

const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value / 100);
};

const formatSubtype = (subtype: string) => {
    return subtype.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const FeeBreakdownDetails: React.FC<FeeBreakdownDetailsProps> = ({ feeEntries, currency }) => {
    
    const { breakdown, totalFees } = React.useMemo(() => {
        // Typed accumulator avoids "Untyped function calls..." error
        const initialBreakdown: Record<string, number> = {};
        const breakdown = feeEntries.reduce((acc, entry) => {
            const subtype = entry.entry_subtype || 'uncategorized';
            // Fees are negative, so use Math.abs
            const currentAmount = acc[subtype] || 0;
            acc[subtype] = currentAmount + Math.abs(entry.amount); 
            return acc;
        }, initialBreakdown);
        
        const values = Object.values(breakdown) as number[];
        const total = values.reduce((sum: number, val: number) => sum + val, 0);
        
        return { breakdown, totalFees: total };
    }, [feeEntries]);

    const chartData = Object.entries(breakdown)
        .map(([subtype, amount]) => ({ text: formatSubtype(subtype), count: amount as number }))
        .sort((a, b) => b.count - a.count);

    if (feeEntries.length === 0) {
        return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No fee data available for this view.</p>;
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Fees</p>
                <p className="text-4xl font-bold text-red-500 dark:text-red-400">
                    {formatCurrency(totalFees, currency)}
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="min-h-[300px]">
                    <SimpleDonutChart data={chartData} />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 dark:bg-slate-900/80">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Fee Type</th>
                                <th className="py-2 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Amount</th>
                                <th className="py-2 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">% of Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {chartData.map(({ text, count }) => (
                                <tr key={text}>
                                    <td className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300 capitalize">{text}</td>
                                    <td className="py-2 px-4 text-sm font-medium text-slate-900 dark:text-white text-right">{formatCurrency(count, currency)}</td>
                                    <td className="py-2 px-4 text-sm text-slate-500 dark:text-slate-400 text-right">{totalFees > 0 ? ((count / totalFees) * 100).toFixed(1) : '0.0'}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">All Fee Transactions ({feeEntries.length})</h3>
                <div className="overflow-y-auto max-h-64 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 dark:bg-slate-900/80 sticky top-0">
                            <tr>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Date</th>
                                <th className="py-2 px-4 text-left text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Details</th>
                                <th className="py-2 px-4 text-right text-xs font-semibold text-slate-700 dark:text-white uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                            {feeEntries.map(entry => (
                                <tr key={entry.id}>
                                    <td className="whitespace-nowrap py-2 px-4 text-xs text-slate-600 dark:text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</td>
                                    <td className="py-2 px-4 text-sm text-slate-800 dark:text-slate-200">{formatSubtype(entry.entry_subtype || 'Uncategorized')}</td>
                                    <td className="whitespace-nowrap py-2 px-4 text-sm font-semibold text-right text-red-500 dark:text-red-400">{formatCurrency(entry.amount, currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FeeBreakdownDetails;