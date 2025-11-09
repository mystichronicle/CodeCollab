import React from 'react';

export const SessionCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-700/50 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-16 bg-gray-700/50 rounded-full"></div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 bg-gray-700/50 rounded w-24"></div>
        <div className="h-4 w-1 bg-gray-700/50 rounded"></div>
        <div className="h-4 bg-gray-700/50 rounded w-32"></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-gray-700/50 border-2 border-gray-800"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
};
