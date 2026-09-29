import React from 'react';

export interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  type = 'spinner',
  rows = 3,
  className = '',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={`space-y-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4">
            <div className="rounded-md bg-slate-200 h-8 w-8 shrink-0"></div>
            <div className="flex-1 space-y-1.5 py-1">
              <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              <div className="h-2.5 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
      <p className="text-xs text-slate-500 font-medium">{message}</p>
    </div>
  );
};

export default LoadingState;
