

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EventDetails } from '../types';
import { Theme } from '../../App';

interface SalesVelocityChartProps {
    data: NonNullable<EventDetails['salesVelocity']>;
    theme: Theme;
}

const SalesVelocityChart: React.FC<SalesVelocityChartProps> = ({ data, theme }) => {
    
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const axisColor = isDarkMode ? '#A0AEC0' : '#4A5568';
    const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';

    const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-4 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-slate-600 dark:text-slate-300">{`Date : ${label}`}</p>
                    <p className="intro text-slate-900 dark:text-white font-semibold">{`Tickets Sold : ${payload[0].value.toLocaleString()}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 20,
                        left: -10,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                        dataKey="date" 
                        stroke={axisColor}
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                        stroke={axisColor}
                        allowDecimals={false} 
                        tick={{ fontSize: 12 }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        wrapperStyle={{fontSize: "14px"}}
                        formatter={(value) => <span className="text-slate-600 dark:text-slate-300">{value}</span>}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="tickets" 
                        name="Tickets Sold"
                        stroke="#1E90FF" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#1E90FF' }}
                        activeDot={{ r: 8 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesVelocityChart;