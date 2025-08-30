

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { EventDetails, Theme } from '../types';

interface RevenueAttributionChartProps {
    data: NonNullable<EventDetails['revenueBySource']>;
    currency: string;
    theme: Theme;
}

const RevenueAttributionChart: React.FC<RevenueAttributionChartProps> = ({ data, currency, theme }) => {
    
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const axisColor = isDarkMode ? '#A0AEC0' : '#4A5568';
    const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';
    const labelColor = isDarkMode ? '#E2E8F0' : '#1F2937';

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value / 100);
    }
    
    const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-4 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-slate-600 dark:text-slate-300 capitalize">{label}</p>
                    <p className="intro text-slate-900 dark:text-white font-semibold">{`Revenue : ${formatCurrency(payload[0].value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                        dataKey="name" 
                        stroke={axisColor}
                        tick={{ fontSize: 12 }} 
                    />
                    <YAxis 
                        stroke={axisColor}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56, 178, 172, 0.1)' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#38B2AC" radius={[4, 4, 0, 0]}>
                         <LabelList 
                            dataKey="revenue" 
                            position="top" 
                            formatter={(value: number) => formatCurrency(value)}
                            style={{ fill: labelColor, fontSize: 12 }} 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueAttributionChart;