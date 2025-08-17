import React from 'react';

interface BarChartData {
  text: string;
  count: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  maxBars?: number;
  showValues?: boolean;
  showPercentages?: boolean;
  height?: 'compact' | 'normal' | 'tall';
  colorScheme?: 'blue' | 'green' | 'purple' | 'gradient' | 'auto';
  sortBy?: 'value' | 'name' | 'none';
  sortOrder?: 'asc' | 'desc';
  emptyMessage?: string;
  className?: string;
  onBarClick?: (item: BarChartData) => void;
}

const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  maxBars = Infinity,
  showValues = true,
  showPercentages = false,
  height = 'normal',
  colorScheme = 'blue',
  sortBy = 'none',
  sortOrder = 'desc',
  emptyMessage = 'No data to display',
  className = '',
  onBarClick
}) => {
  const processedData = React.useMemo(() => {
    let sorted = [...data];
    
    // Apply sorting
    if (sortBy === 'value') {
      sorted.sort((a, b) => sortOrder === 'desc' ? b.count - a.count : a.count - b.count);
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => sortOrder === 'desc' ? b.text.localeCompare(a.text) : a.text.localeCompare(b.text));
    }
    
    // Limit number of bars
    return sorted.slice(0, maxBars);
  }, [data, maxBars, sortBy, sortOrder]);

  const maxCount = React.useMemo(() => 
    Math.max(...processedData.map(item => item.count), 0), 
    [processedData]
  );

  const totalCount = React.useMemo(() => 
    processedData.reduce((sum, item) => sum + item.count, 0), 
    [processedData]
  );

  const getBarColor = React.useCallback((item: BarChartData, index: number) => {
    if (item.color) return item.color;
    
    switch (colorScheme) {
      case 'blue':
        return 'bg-blue-500 hover:bg-blue-400';
      case 'green':
        return 'bg-green-500 hover:bg-green-400';
      case 'purple':
        return 'bg-purple-500 hover:bg-purple-400';
      case 'gradient':
        return 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400';
      case 'auto':
        const colors = [
          'bg-blue-500 hover:bg-blue-400',
          'bg-green-500 hover:bg-green-400',
          'bg-purple-500 hover:bg-purple-400',
          'bg-red-500 hover:bg-red-400',
          'bg-yellow-500 hover:bg-yellow-400',
          'bg-pink-500 hover:bg-pink-400',
          'bg-indigo-500 hover:bg-indigo-400',
          'bg-orange-500 hover:bg-orange-400'
        ];
        return colors[index % colors.length];
      default:
        return 'bg-blue-500 hover:bg-blue-400';
    }
  }, [colorScheme]);

  const getBarHeight = () => {
    switch (height) {
      case 'compact': return 'h-4';
      case 'tall': return 'h-8';
      default: return 'h-6';
    }
  };

  const getSpacing = () => {
    switch (height) {
      case 'compact': return 'space-y-1';
      case 'tall': return 'space-y-4';
      default: return 'space-y-3';
    }
  };

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div>{emptyMessage}</div>
        </div>
      </div>
    );
  }

  const formatValue = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toLocaleString();
  };

  return (
    <div className={`${getSpacing()} ${className}`} role="img" aria-label="Bar chart">
      {processedData.map((item, index) => {
        const percentage = totalCount > 0 ? (item.count / totalCount * 100) : 0;
        const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const isClickable = !!onBarClick;
        
        return (
          <div 
            key={`${item.text}-${index}`} 
            className={`group relative ${isClickable ? 'cursor-pointer' : ''}`}
            onClick={isClickable ? () => onBarClick(item) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onBarClick!(item);
              }
            } : undefined}
          >
            <div className="grid grid-cols-4 items-center gap-3 text-sm">
              {/* Label */}
              <div className="col-span-1 text-right text-slate-400 group-hover:text-slate-200 transition-colors duration-200">
                <div className="truncate" title={item.text}>
                  {item.text}
                </div>
                {showPercentages && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {percentage.toFixed(1)}%
                  </div>
                )}
              </div>
              
              {/* Bar container */}
              <div className="col-span-3 relative">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-hidden">
                  {/* Animated bar */}
                  <div
                    className={`${getBarHeight()} ${getBarColor(item, index)} 
                               rounded-lg flex items-center justify-end px-3 
                               transition-all duration-500 ease-out transform
                               ${isClickable ? 'group-hover:scale-y-110' : ''}
                               relative overflow-hidden`}
                    style={{ 
                      width: `${Math.max(barWidth, item.count > 0 ? 8 : 0)}%`,
                      transformOrigin: 'left center'
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                                   translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    {/* Value label */}
                    {showValues && (
                      <span className="text-white font-semibold text-xs relative z-10 drop-shadow-sm">
                        {formatValue(item.count)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Tooltip on hover */}
                {isClickable && (
                  <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-slate-900 text-white text-xs 
                                 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                 pointer-events-none z-10 whitespace-nowrap">
                    Click to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Summary footer */}
      {processedData.length > 0 && (
        <div className="pt-4 mt-4 border-t border-slate-700/30 text-xs text-slate-500 text-center">
          {processedData.length} {processedData.length === 1 ? 'item' : 'items'} • 
          Total: {totalCount.toLocaleString()}
          {maxBars < data.length && (
            <span className="ml-2 text-amber-400">
              (showing top {maxBars} of {data.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleBarChart;