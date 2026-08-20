import React from 'react';

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <Skeleton className="h-8 w-32 mb-2" />
    <Skeleton className="h-3 w-20" />
  </div>
);

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="border-b border-gray-100">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-6 py-3"><Skeleton className="h-3 w-16" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
      </tbody>
    </table>
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
    <Skeleton className="h-5 w-40 mb-4" />
    <div className="flex items-end gap-2 h-64">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
      ))}
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="p-8">
    <div className="mb-6">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart />
      <SkeletonChart />
    </div>
  </div>
);