
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { EventDetails } from '../types';

interface RevenueAttributionChartProps {
    data: NonNullable<EventDetails['revenueBySource']>;
    currency: string;
}

const RevenueAttributionChart: React.FC<RevenueAttributionChartProps> = ({ data, currency }) => {
    
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
                <div className="p-4 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-slate-300 capitalize">{label}</p>
                    <p className="intro text-white font-semibold">{`Revenue : ${formatCurrency(payload[0].value)}`}</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#A0AEC0"
                        tick={{ fontSize: 12 }} 
                    />
                    <YAxis 
                        stroke="#A0AEC0" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 144, 255, 0.1)' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#38B2AC" radius={[4, 4, 0, 0]}>
                         <LabelList 
                            dataKey="revenue" 
                            position="top" 
                            formatter={(value: number) => formatCurrency(value)}
                            style={{ fill: '#E2E8F0', fontSize: 12 }} 
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueAttributionChart;