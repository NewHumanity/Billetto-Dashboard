import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const AnimatedCounter: React.FC<{ value: string; className: string }> = ({ value, className }) => {
  const ref = useRef<HTMLSpanElement>(null);
  
  // Extract number and formatting pattern
  const numericMatch = value.match(/[\d,.]+/);
  const numericPart = numericMatch ? numericMatch[0] : null;
  
  // If no valid number found (e.g. "N/A"), just render text
  if (!numericPart) {
      return <span className={className}>{value}</span>;
  }

  // Detect locale format (comma vs dot)
  // Assuming "en-US" based on app utils (comma for thousands, dot for decimals)
  const numericValue = parseFloat(numericPart.replace(/,/g, ''));
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100, duration: 1000 });
  const rounded = useTransform(springValue, (latest) => latest);

  useEffect(() => {
    motionValue.set(numericValue);
  }, [numericValue, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      if (ref.current) {
        // Simple formatting to match inputs like "1,234.56" or "100"
        let formatted = '';
        if (numericPart.includes('.')) {
             // Preserve 2 decimal places if input had them
             formatted = latest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
             formatted = Math.round(latest).toLocaleString('en-US');
        }
        
        // Reconstruct the string with prefix/suffix
        const fullString = value.replace(numericPart, formatted);
        ref.current.textContent = fullString;
      }
    });
    return unsubscribe;
  }, [rounded, value, numericPart]);

  return <span ref={ref} className={className}>{value}</span>;
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, onClick }) => {
  const isClickable = !!onClick;
  
  // A threshold for switching to a two-line layout for very long values.
  const isLongValue = value.length > 12;

  // More granular font size logic for the compact (non-long) layout, scaled down.
  const valueFontSize = () => {
    const len = value.length;
    if (len > 10) return 'text-base'; // Smallest font for 11+ chars
    if (len > 8) return 'text-lg';  // Medium font for 9-10 chars
    return 'text-xl';             // Largest font for up to 8 chars
  };
  
  const baseClasses = `bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-full text-left transition-colors duration-300 relative overflow-hidden`;
  const clickableClasses = isClickable ? 'hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer' : '';

  const Content = () => {
      if (isLongValue) {
        return (
            <div className="flex flex-col items-start justify-center h-full">
                <div className="flex items-center space-x-2 w-full">
                    <div className="bg-brand-primary/20 text-brand-primary p-2 rounded-lg flex-shrink-0">
                        {icon}
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>
                        {title}
                    </p>
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white break-all" title={value}>
                    <AnimatedCounter value={value} className="" />
                </div>
            </div>
        );
      }
      return (
        <div className="flex items-center space-x-2">
            <div className="bg-brand-primary/20 text-brand-primary p-2 rounded-lg flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>{title}</p>
                <div className={`${valueFontSize()} font-bold text-slate-900 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis`} title={value}>
                    <AnimatedCounter value={value} className="" />
                </div>
            </div>
        </div>
      );
  };

  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: isClickable ? 1.02 : 1 }}
        whileTap={{ scale: isClickable ? 0.98 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`${baseClasses} ${clickableClasses}`}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
    >
        <Content />
    </motion.div>
  );
};

export default StatCard;