
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EventDetails } from '../types';

interface SalesVelocityChartProps {
    data: NonNullable<EventDetails['salesVelocity']>;
}

const SalesVelocityChart: React.FC<SalesVelocityChartProps> = ({ data }) => {
    
    const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-4 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-slate-300">{`Date : ${label}`}</p>
                    <p className="intro text-white font-semibold">{`Tickets Sold : ${payload[0].value.toLocaleString()}`}</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis 
                        dataKey="date" 
                        stroke="#A0AEC0"
                        tick={{ fontSize: 12 }} 
                        tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                        stroke="#A0AEC0" 
                        allowDecimals={false} 
                        tick={{ fontSize: 12 }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
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