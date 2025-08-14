
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4 hover:bg-slate-700 transition-colors duration-300">
      <div className="bg-brand-primary/20 text-brand-primary p-3 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
