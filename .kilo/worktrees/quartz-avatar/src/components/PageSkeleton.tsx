import React from 'react';

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-3 bg-gray-200 rounded mb-2 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-12 bg-gray-100" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
    ))}
  </div>
);

export const SkeletonStat: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
    <div className="h-8 bg-gray-200 rounded w-2/3" />
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
    <div className="h-64 bg-gray-100 rounded-lg" />
  </div>
);

export const PageSkeleton: React.FC<{ type?: 'dashboard' | 'table' | 'mixed' }> = ({ type = 'mixed' }) => (
  <div className="p-8 space-y-6">
    {type === 'dashboard' && (
      <>
        <div><div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" /><div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" /></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">{[1, 2, 3, 4].map(i => <SkeletonStat key={i} />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
      </>
    )}
    {type === 'table' && (
      <>
        <div><div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" /><div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" /></div>
        <SkeletonTable rows={6} />
      </>
    )}
    {type === 'mixed' && (
      <>
        <div><div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" /><div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" /></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">{[1, 2, 3, 4].map(i => <SkeletonStat key={i} />)}</div>
        <SkeletonTable rows={5} />
      </>
    )}
  </div>
);

export default PageSkeleton;
