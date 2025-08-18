import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, onClick }) => {
  const isClickable = !!onClick;
  const WrapperComponent = isClickable ? 'button' : 'div';
  
  // A threshold for switching to a two-line layout for very long values.
  const isLongValue = value.length > 12;

  // More granular font size logic for the compact (non-long) layout, scaled down.
  const valueFontSize = () => {
    const len = value.length;
    if (len > 10) return 'text-base'; // Smallest font for 11+ chars
    if (len > 8) return 'text-lg';  // Medium font for 9-10 chars
    return 'text-xl';             // Largest font for up to 8 chars
  };
  
  // Common props for the wrapper to reduce duplication
  const wrapperProps = {
      onClick: onClick,
      disabled: !isClickable,
  };
  const baseClasses = `bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-full text-left transition-colors duration-300`;
  const clickableClasses = isClickable ? 'hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer' : '';

  if (isLongValue) {
    // Layout for long values: icon and title on top, value below
    return (
        <WrapperComponent
            {...wrapperProps}
            className={`${baseClasses} ${clickableClasses} flex flex-col items-start justify-center`}
        >
            <div className="flex items-center space-x-2 w-full">
                <div className="bg-brand-primary/20 text-brand-primary p-2 rounded-lg flex-shrink-0">
                    {icon}
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>
                    {title}
                </p>
            </div>
            {/* Responsive font size and break-all for better wrapping of long numbers */}
            <p className="text-2xl md:text-2xl font-bold text-slate-900 dark:text-white mt-2 break-all" title={value}>
                {value}
            </p>
        </WrapperComponent>
    );
  } else {
    // Default compact layout for shorter values
    return (
        <WrapperComponent
            {...wrapperProps}
            className={`${baseClasses} ${clickableClasses} flex items-center space-x-2`}
        >
            <div className="bg-brand-primary/20 text-brand-primary p-2 rounded-lg flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>{title}</p>
                {/* Apply dynamic font size and truncate with ellipsis if it still overflows */}
                <p 
                  className={`${valueFontSize()} font-bold text-slate-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis`}
                  title={value}
                >
                  {value}
                </p>
            </div>
        </WrapperComponent>
    );
  }
};

export default StatCard;
