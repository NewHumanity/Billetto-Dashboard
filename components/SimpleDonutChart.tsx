import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SimpleDonutChartProps {
    data: { text: string; count: number; }[];
}

const COLORS = ['#1E90FF', '#38B2AC', '#9F7AEA', '#ED8936', '#F56565', '#4299E1'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    // Don't render labels for tiny slices to avoid clutter
    if (percent < 0.07) return null; 
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold pointer-events-none drop-shadow-md">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const { name, value } = payload[0].payload;
        return (
            <div className="p-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg">
                <p className="label text-sm text-slate-900 dark:text-white capitalize">{`${name} : ${value.toLocaleString()}`}</p>
            </div>
        );
    }
    return null;
};

const SimpleDonutChart: React.FC<SimpleDonutChartProps> = ({ data }) => {
    const chartData = data.map(item => ({ name: item.text, value: item.count }));
    
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={5}
                    >
                        {chartData.map((entry, index) => (
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

export default SimpleDonutChart;