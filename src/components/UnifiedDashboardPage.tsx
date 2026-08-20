import { useState, lazy, Suspense } from 'react';
import { BarChart3, FileText, TrendingUp, LayoutDashboard } from 'lucide-react';
import PageSkeleton from './PageSkeleton';

const DashboardContent = lazy(() => import('./DashboardPage'));
const ReportsContent = lazy(() => import('./ReportsPage'));
const SalesContent = lazy(() => import('./SalesAnalyticsPage'));

type Tab = 'overview' | 'reports' | 'sales';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  { id: 'sales', label: 'Sales', icon: <TrendingUp size={18} /> },
];

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tab Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <Suspense fallback={<PageSkeleton />}>
        {activeTab === 'overview' && <DashboardContent />}
        {activeTab === 'reports' && <ReportsContent />}
        {activeTab === 'sales' && <SalesContent />}
      </Suspense>
    </div>
  );
}