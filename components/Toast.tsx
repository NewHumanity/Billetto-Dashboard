import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300); // Allow time for exit animation
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons = {
    success: <CheckCircleIcon />,
    error: <XCircleIcon />,
    info: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };
  
  const colors = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    info: 'bg-blue-500 border-blue-600',
  };

  return (
    <div
      className={`relative flex items-center gap-4 w-full max-w-sm p-4 text-white rounded-lg shadow-lg border-l-4 transition-all duration-300 ease-in-out transform
        ${colors[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <div className="flex-shrink-0 w-6 h-6">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20" aria-label="Close">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastType[];
  onRemove: (id: number) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] space-y-3">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
