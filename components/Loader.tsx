
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-primary"></div>
      <p className="mt-4 text-lg text-slate-300">Fetching your Billetto data...</p>
    </div>
  );
};

export default Loader;
