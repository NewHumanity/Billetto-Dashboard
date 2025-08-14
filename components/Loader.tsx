
import React from 'react';

interface LoaderProps {
    message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Fetching your Billetto data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-primary"></div>
      <p className="mt-4 text-lg text-slate-300">{message}</p>
    </div>
  );
};

export default Loader;
