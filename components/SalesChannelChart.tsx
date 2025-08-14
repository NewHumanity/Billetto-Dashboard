
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { EventDetails } from '../types';

interface SalesChannelChartProps {
    data: NonNullable<EventDetails['salesByChannel']>;
}

const COLORS = ['#1E90FF', '#38B2AC', '#9F7AEA', '#ED8936', '#F56565', '#4299E1'];

const SalesChannelChart: React.FC<SalesChannelChartProps> = ({ data }) => {
    
    const CustomTooltip: React.FC<any> = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { name, count } = payload[0].payload;
            return (
                <div className="p-4 bg-slate-700/80 backdrop-blur-sm border border-slate-600 rounded-lg shadow-lg">
                    <p className="label text-sm text-white capitalize">{`${name} : ${count.toLocaleString()} orders`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        paddingAngle={5}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: "14px", textTransform: 'capitalize' }} 
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesChannelChart;