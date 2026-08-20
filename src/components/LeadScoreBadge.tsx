import React from 'react';

interface LeadScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export default function LeadScoreBadge({ score, size = 'md' }: LeadScoreBadgeProps) {
  const getCategory = (s: number) => {
    if (s >= 80) return { label: 'Hot', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (s >= 50) return { label: 'Warm', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: 'Cold', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  };

  const { label, color } = getCategory(score);
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        score >= 80 ? 'bg-red-500' : score >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
      }`} />
      {label} ({score})
    </span>
  );
}
