import React from 'react';
import { useViewport } from '../hooks/useViewport';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'content';
  noPadding?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[90rem]',
  '2xl': 'max-w-[96rem]',
  full: 'max-w-full',
  content: 'max-w-content',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'full',
  noPadding = false,
}) => {
  return (
    <div
      className={`w-full ${maxWidthMap[maxWidth]} mx-auto ${noPadding ? '' : 'page-container'} ${className}`}
    >
      {children}
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className = '' }) => {
  const { isMobile } = useViewport();
  return (
    <div className={`mb-4 md:mb-6 lg:mb-8 ${className}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-start justify-between gap-4'}`}>
        <div className="min-w-0 flex-1">
          <h1 className="heading-1 text-gray-900 dark:text-white break-words">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 md:mt-2">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'flex-shrink-0'}`}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gapMap = {
  sm: 'gap-2 md:gap-3',
  md: 'gap-3 md:gap-4 lg:gap-6',
  lg: 'gap-4 md:gap-6 lg:gap-8',
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 'md',
  className = '',
}) => {
  const style: React.CSSProperties = {};
  if (cols.mobile) style.gridTemplateColumns = `repeat(${cols.mobile}, minmax(0, 1fr))`;

  return (
    <div className={`grid ${gapMap[gap]} ${className}`} style={style}>
      <ResponsiveGridStyle cols={{ mobile: cols.mobile ?? 1, tablet: cols.tablet ?? 2, desktop: cols.desktop ?? 3, wide: cols.wide ?? 4 }} />
      {children}
    </div>
  );
};

const ResponsiveGridStyle: React.FC<{ cols: Required<NonNullable<ResponsiveGridProps['cols']>> }> = ({ cols }) => (
  <style>{`
    @media (min-width: 640px) {
      .responsive-grid-styled { grid-template-columns: repeat(${cols.tablet}, minmax(0, 1fr)) !important; }
    }
    @media (min-width: 1024px) {
      .responsive-grid-styled { grid-template-columns: repeat(${cols.desktop}, minmax(0, 1fr)) !important; }
    }
    @media (min-width: 1280px) {
      .responsive-grid-styled { grid-template-columns: repeat(${cols.wide}, minmax(0, 1fr)) !important; }
    }
  `}</style>
);

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  change?: { value: string; positive: boolean };
  className?: string;
}

export const ResponsiveStatCard: React.FC<StatCardProps> = ({ title, value, icon, change, className = '' }) => {
  return (
    <div className={`modern-card card-futuristic hover-lift rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 ${className}`}>
      <div className="flex items-start justify-between mb-2 md:mb-3">
        {icon && (
          <div className="p-2 md:p-2.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-lg md:rounded-xl text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
        {change && (
          <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full ${
            change.positive
              ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {change.value}
          </span>
        )}
      </div>
      <h3 className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mb-1">{title}</h3>
      <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">{value}</div>
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const ResponsiveCard: React.FC<CardProps> = ({ children, className = '', title, action, noPadding }) => {
  return (
    <div className={`modern-card rounded-xl md:rounded-2xl ${noPadding ? '' : 'card-padded'} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 md:mb-4">
          {title && <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

interface MobileTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode; badge?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`responsive-tabs ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 ${
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children, className = '' }) => {
  return (
    <div className={`table-responsive ${className}`}>
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-8 md:py-12 px-4 ${className}`}>
      {icon && (
        <div className="w-12 h-12 md:w-16 md:h-16 mb-3 md:mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-3 md:mb-4">{description}</p>
      )}
      {action}
    </div>
  );
};

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up mobile-safe-bottom">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        {title && (
          <div className="px-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
