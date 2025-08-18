import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse ${className}`} />
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center space-x-4">
    <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-32" />
    </div>
  </div>
);

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
    </div>
);

export const TableSkeleton: React.FC<{className?: string}> = ({ className }) => (
     <div className={`bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg ${className}`}>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    </div>
)
