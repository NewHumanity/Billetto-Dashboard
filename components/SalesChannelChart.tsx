


import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SalesChannelData } from '../types';
import { Theme } from '../../App';

interface SalesChannelChartProps {
    data: SalesChannelData[];
    theme: Theme;
}

const COLORS = ['#1E90FF', '#38B2AC', '#9F7AEA', '#ED8936', '#F56565', '#4299E1'];

const SalesChannelChart: React.FC<SalesChannelChartProps> = ({ data, theme }) => {
    
    const [path, setPath] = useState<string[]>([]);

    const { currentChartData, breadcrumbs } = useMemo(() => {
        let levelData: SalesChannelData[] = data;
        for (const name of path) {
            const nextLevel = levelData?.find(item => item.name === name)?.children;
            if (nextLevel) {
                levelData = nextLevel;
            } else {
                break;
            }
        }
        const crumbs = ['Sales Channels', ...path].join(' > ');
        return { currentChartData: levelData, breadcrumbs: crumbs };
    }, [data, path]);

    const handlePieClick = (pieData: any) => {
        const clickedItem = currentChartData?.find(d => d.name === pieData.name);
        if (clickedItem?.children && clickedItem.children.length > 0) {
            setPath(prevPath => [...prevPath, clickedItem.name]);
        }
    };
    
    const handleBackClick = () => {
        setPath(prevPath => prevPath.slice(0, -1));
    };
    
    const hasDrilldown = useMemo(() => {
        return currentChartData?.some(d => d.children && d.children.length > 0)
    }, [currentChartData]);

    const CustomTooltip: React.FC<any> = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { name, count } = payload[0].payload;
            return (
                <div className="p-4 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-slate-900 dark:text-white capitalize">{`${name} : ${count.toLocaleString()} orders`}</p>
                </div>
            );
        }
        return null;
    };
    
    if (!currentChartData || currentChartData.length === 0) {
        return <div className="flex items-center justify-center h-[300px] text-slate-500">No sales channel data available.</div>
    }

    return (
        <div className="relative w-full h-[300px]">
            <div className="absolute top-0 left-0 right-0 z-10 px-2">
                <div className="flex items-center justify-center h-8">
                     {path.length > 0 && (
                        <button 
                            onClick={handleBackClick}
                            className="absolute left-0 text-sm bg-gray-200 dark:bg-slate-600/50 text-slate-800 dark:text-white font-semibold py-1 px-3 rounded-lg transition-colors hover:bg-gray-300 dark:hover:bg-slate-600"
                            aria-label="Go back to previous level"
                        >
                            &larr; Back
                        </button>
                    )}
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 capitalize truncate" title={breadcrumbs}>
                        {breadcrumbs}
                    </p>
                </div>
            </div>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={currentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        paddingAngle={5}
                        onClick={hasDrilldown ? handlePieClick : undefined}
                        className={hasDrilldown ? 'cursor-pointer' : ''}
                    >
                        {currentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: "14px", textTransform: 'capitalize' }} 
                        formatter={(value) => <span className="text-slate-600 dark:text-slate-300">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesChannelChart;