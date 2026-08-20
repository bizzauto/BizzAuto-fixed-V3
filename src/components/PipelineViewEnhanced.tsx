import React, { useState } from 'react';
import { DollarSign, TrendingUp, Target, Calendar, Clock, Zap, Award } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface Deal {
  id: string;
  contactId: string;
  contactName: string;
  title: string;
  value: number;
  stage: string;
  stageId?: string;
  probability: number;
  expectedClose: string;
  createdAt: string;
  notes?: string;
  contactAvatar?: string;
  products?: { name: string; quantity: number; price: number }[];
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
  total: number;
}

interface PipelineViewEnhancedProps {
  deals: Deal[];
  onDealStageChange: (dealId: string, newStage: string) => void;
}

// ============================================================
// HELPERS
// ============================================================

const getStageProbability = (stageName: string): number => {
  const name = (stageName || '').toLowerCase();
  if (name.includes('lead inbox') || name.includes('new lead')) return 10;
  if (name.includes('contact')) return 25;
  if (name.includes('qualif')) return 50;
  if (name.includes('proposal')) return 65;
  if (name.includes('negotiat')) return 80;
  if (name.includes('won')) return 100;
  if (name.includes('lost')) return 0;
  return 20;
};

const PIPELINE_STAGES: { id: string; name: string; color: string }[] = [
  { id: 'lead', name: 'Lead Inbox', color: '#3B82F6' },
  { id: 'contacted', name: 'Contacted', color: '#F59E0B' },
  { id: 'qualified', name: 'Qualified', color: '#8B5CF6' },
  { id: 'proposal', name: 'Proposal', color: '#F97316' },
  { id: 'negotiation', name: 'Negotiation', color: '#EC4899' },
  { id: 'closed_won', name: 'Closed Won', color: '#10B981' },
  { id: 'closed_lost', name: 'Closed Lost', color: '#EF4444' },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PipelineViewEnhanced({ deals, onDealStageChange }: PipelineViewEnhancedProps) {
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Build pipeline data from deals
  const pipelineDeals = PIPELINE_STAGES.map(stage => ({
    ...stage,
    deals: deals.filter(d => {
      const dealStage = (d.stage || '').toLowerCase();
      const stageName = stage.name.toLowerCase();
      return dealStage === stageName ||
        dealStage === stage.id.replace('_', ' ') ||
        (stage.name === 'Closed Won' && (dealStage === 'won' || dealStage === 'closed won')) ||
        (stage.name === 'Closed Lost' && (dealStage === 'lost' || dealStage === 'closed lost')) ||
        (stage.name === 'Lead Inbox' && dealStage === 'new lead');
    }),
    total: deals.filter(d => {
      const dealStage = (d.stage || '').toLowerCase();
      const stageName = stage.name.toLowerCase();
      return dealStage === stageName ||
        dealStage === stage.id.replace('_', ' ') ||
        (stage.name === 'Closed Won' && (dealStage === 'won' || dealStage === 'closed won')) ||
        (stage.name === 'Closed Lost' && (dealStage === 'lost' || dealStage === 'closed lost')) ||
        (stage.name === 'Lead Inbox' && dealStage === 'new lead');
    }).reduce((s, d) => s + d.value, 0),
  }));

  // Analytics calculations
  const weightedPipeline = deals.reduce((s, d) => s + Math.round(d.value * d.probability / 100), 0);
  const wonDeals = deals.filter(d => ['Closed Won', 'Won'].includes(d.stage));
  const totalActiveDeals = deals.filter(d => !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(d.stage));
  const winRate = deals.length > 0 ? Math.round(wonDeals.length / deals.length * 100) : 0;
  const conversionRate = deals.length > 0 ? Math.round(totalActiveDeals.length / deals.length * 100) : 0;
  const avgDealValue = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length) : 0;
  const monthlyForecast = Math.round(weightedPipeline * 0.4);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDeal(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId && draggedDeal) {
      onDealStageChange(dealId, targetStageId);
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  return (
    <div className="space-y-4">
      {/* Pipeline Analytics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-blue-500" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Weighted Pipeline</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">₹{(weightedPipeline / 100000).toFixed(1)}L</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Expected value (value × prob%)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-green-500" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Win Rate</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-green-600">{winRate}%</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{wonDeals.length} won / {deals.length} total</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-blue-500" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Conversion Rate</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-blue-600">{conversionRate}%</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Moved beyond first stage</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-purple-500" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Avg Deal Value</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-purple-600">₹{avgDealValue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Per deal average</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-emerald-500" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Monthly Forecast</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">₹{monthlyForecast.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Expected monthly close</p>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max" style={{ minHeight: '400px' }}>
          {pipelineDeals.map(stage => (
            <div key={stage.id} className="w-72 flex-shrink-0">
              {/* Stage Header */}
              <div
                className="bg-gray-100 dark:bg-gray-800 rounded-t-xl px-4 py-3 border-b-2"
                style={{ borderBottomColor: stage.color }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{stage.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">{stage.deals.length}</span>
                    <span className="text-xs text-gray-400">₹{stage.total.toLocaleString()}</span>
                  </div>
                </div>
                {/* Stage probability indicator */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${getStageProbability(stage.name)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{getStageProbability(stage.name)}%</span>
                </div>
              </div>

              {/* Stage Body */}
              <div
                className={`bg-gray-50 dark:bg-gray-800/50 rounded-b-xl p-3 space-y-2 min-h-[200px] transition-colors ${
                  dragOverStage === stage.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 ring-inset' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {stage.deals.map(deal => {
                  const daysSinceCreation = Math.round(
                    (new Date().getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const probabilityColor =
                    deal.probability >= 80 ? 'bg-green-500' :
                    deal.probability >= 50 ? 'bg-yellow-500' :
                    deal.probability >= 25 ? 'bg-orange-500' : 'bg-blue-500';
                  const probabilityTextColor =
                    deal.probability >= 80 ? 'text-green-600' :
                    deal.probability >= 50 ? 'text-yellow-600' :
                    'text-gray-500';

                  return (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                        draggedDeal === deal.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      {/* Deal Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate flex-1">
                          {deal.contactName}
                        </span>
                        <span className="text-xs font-bold text-green-600 ml-2">₹{deal.value.toLocaleString()}</span>
                      </div>

                      {/* Deal Title */}
                      <p className="text-[10px] text-gray-500 mb-2 truncate">{deal.title}</p>

                      {/* Deal Meta */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400">
                            {new Date(deal.expectedClose).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400">{daysSinceCreation}d</span>
                        </div>
                      </div>

                      {/* Probability Bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${probabilityColor}`}
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${probabilityTextColor}`}>
                          {deal.probability}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {stage.deals.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                    Drop deals here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
