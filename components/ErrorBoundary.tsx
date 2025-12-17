import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // Cast 'this' to 'any' to access props as TS is failing to infer it from Component inheritance in this setup
    const props = (this as any).props as Props;

    if (this.state.hasError) {
      if (props.fallback) {
        return props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 font-sans">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-gray-200 dark:border-slate-700">
            <div className="text-red-500 mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                We encountered an unexpected error. Please try reloading the page.
            </p>
            {this.state.error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-left mb-6 overflow-auto max-h-32">
                    <code className="text-xs text-red-600 dark:text-red-400 font-mono block break-words">
                        {this.state.error.toString()}
                    </code>
                </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-primary hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
