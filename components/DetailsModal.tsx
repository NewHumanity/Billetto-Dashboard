import React, { useState, useEffect, createContext } from 'react';
import { ModalView } from '../types';

interface ModalContextType {
    pushView: (view: ModalView) => void;
}

// Create a context to provide pushView to nested components
export const ModalContext = createContext<ModalContextType | null>(null);

interface DetailsModalProps {
  initialView: ModalView;
  onClose: () => void;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ initialView, onClose }) => {
    const [viewStack, setViewStack] = useState<ModalView[]>([initialView]);
    const currentView = viewStack[viewStack.length - 1];

    useEffect(() => {
        // When the initialView prop changes (i.e., a new modal is opened), reset the stack
        setViewStack([initialView]);
    }, [initialView]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const pushView = (view: ModalView) => {
        setViewStack(stack => [...stack, view]);
    };

    const popView = () => {
        setViewStack(stack => stack.slice(0, stack.length - 1));
    };

    return (
        <ModalContext.Provider value={{ pushView }}>
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
                aria-modal="true"
                role="dialog"
                aria-labelledby="details-modal-title"
                onClick={handleBackdropClick}
            >
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-slate-700 relative max-h-[90vh] flex flex-col" role="document">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-20"
                        aria-label="Close details"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    <div className="flex items-center mb-6 pr-8">
                        {viewStack.length > 1 && (
                            <button
                                onClick={popView}
                                className="mr-4 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                                aria-label="Go back"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                        )}
                        <h2 id="details-modal-title" className="text-2xl font-bold text-slate-900 dark:text-white truncate">{currentView.title}</h2>
                    </div>

                    <div className="flex-grow overflow-y-auto -mr-4 pr-4">
                        {currentView.content({ pushView })}
                    </div>
                </div>
            </div>
        </ModalContext.Provider>
    );
};

export default DetailsModal;