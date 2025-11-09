import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center backdrop-blur animate-pulse">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 shadow-lg hover:scale-105 transform inline-flex items-center group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          {action.label}
        </button>
      )}
    </div>
  );
};

interface NoResultsStateProps {
  searchQuery?: string;
  filterLanguage?: string;
  onClear: () => void;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({ searchQuery, filterLanguage, onClear }) => {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-xl flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No sessions found</h3>
      <p className="text-gray-400 mb-4 text-sm">
        {searchQuery && filterLanguage && filterLanguage !== 'all'
          ? `No sessions matching "${searchQuery}" in ${filterLanguage}`
          : searchQuery
          ? `No sessions matching "${searchQuery}"`
          : filterLanguage && filterLanguage !== 'all'
          ? `No ${filterLanguage} sessions available`
          : 'Try adjusting your search or filter'}
      </p>
      <button
        onClick={onClear}
        className="px-5 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors inline-flex items-center group"
      >
        <svg className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Clear Filters
      </button>
    </div>
  );
};
