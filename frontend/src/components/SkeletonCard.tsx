import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="card bg-lightbg-surface dark:bg-darkbg-surface rounded-lg shadow-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-darkbg-surface rounded w-2/3 mb-4" />
    <div className="h-4 bg-gray-200 dark:bg-darkbg-surface rounded w-1/2 mb-2" />
    <div className="h-4 bg-gray-200 dark:bg-darkbg-surface rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 dark:bg-darkbg-surface rounded w-1/3" />
  </div>
);
