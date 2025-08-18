

import React from 'react';

const timeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " year ago" : " years ago");
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " month ago" : " months ago");
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " day ago" : " days ago");
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " hour ago" : " hours ago");
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + (Math.floor(interval) === 1 ? " minute ago" : " minutes ago");
  return Math.floor(seconds) + " seconds ago";
}

interface RefreshBarProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
  viewName: string;
}

const RefreshBar: React.FC<RefreshBarProps> = ({ lastUpdated, onRefresh, loading, viewName }) => {
  return (
    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 mb-6 flex items-center justify-between text-sm flex-wrap gap-2">
      <p className="text-slate-500 dark:text-slate-400">
        {lastUpdated 
          ? <>Last updated: <span className="font-semibold text-slate-700 dark:text-slate-300">{timeSince(lastUpdated)}</span></>
          : `No cached data for ${viewName}.`
        }
      </p>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1.5 font-semibold text-white bg-brand-primary/80 rounded-md hover:bg-brand-primary disabled:opacity-50 disabled:cursor-wait transition-colors flex items-center"
      >
        {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
        ) : (
          'Refresh Data'
        )}
      </button>
    </div>
  );
};

export default RefreshBar;