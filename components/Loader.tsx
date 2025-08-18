

import React from 'react';

interface LoaderProps {
    message?: string;
    progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ message = "Fetching your Billetto data...", progress }) => {
  const isProgressing = typeof progress !== 'undefined' && progress >= 0;

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="relative h-20 w-20">
        {isProgressing ? (
          <>
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                strokeWidth="12"
                className="stroke-slate-700"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                strokeWidth="12"
                className="stroke-brand-primary"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={(2 * Math.PI * 54) * (1 - (progress || 0) / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-white">
              {Math.round(progress || 0)}%
            </div>
          </>
        ) : (
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-primary"></div>
        )}
      </div>
      <p className="mt-4 text-lg text-slate-300">{message}</p>
    </div>
  );
};

export default Loader;