

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label } from 'recharts';
import { CampaignTimeBlock, Theme } from '../types';

interface SalesVelocityChartProps {
    data: { date: string; tickets: number; }[];
    campaigns?: CampaignTimeBlock[];
    theme: Theme;
}

const CAMPAIGN_COLORS = ['#9F7AEA', '#ED8936', '#4299E1', '#F56565', '#38B2AC'];

const SalesVelocityChart: React.FC<SalesVelocityChartProps> = ({ data, campaigns = [], theme }) => {
    
    const [showCampaigns, setShowCampaigns] = useState(true);
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
        <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Sales Velocity</h3>
                {campaigns.length > 0 && (
                     <label htmlFor="show-campaigns-toggle" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-slate-600 dark:text-slate-300">Show Campaigns</span>
                        <div className="relative">
                            <input type="checkbox" id="show-campaigns-toggle" className="sr-only peer" checked={showCampaigns} onChange={() => setShowCampaigns(!showCampaigns)} />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                        </div>
                    </label>
                )}
            </div>
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
                        {showCampaigns && campaigns?.map((campaign, index) => (
                            <ReferenceArea
                                key={index}
                                x1={campaign.start.split('T')[0]}
                                x2={campaign.end.split('T')[0]}
                                stroke="none"
                                fill={CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length]}
                                fillOpacity={0.2}
                            >
                                <Label value={campaign.name} position="insideTopLeft" fill={isDarkMode ? '#CBD5E0' : '#4A5568'} fontSize={10} offset={10} />
                            </ReferenceArea>
                        ))}
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
             {showCampaigns && campaigns.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                    {campaigns.map((campaign, index) => (
                        <div key={index} className="flex items-center text-xs">
                            <span className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length] }}></span>
                            <span className="text-slate-600 dark:text-slate-300">{campaign.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SalesVelocityChart;