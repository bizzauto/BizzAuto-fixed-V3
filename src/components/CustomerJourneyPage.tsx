import { useState } from 'react';
import { GitBranch, Users, Eye, ShoppingCart, Mail, Phone, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

interface JourneyStage {
  id: string;
  name: string;
  type: string;
  count: number;
  conversionRate: number;
  dropOff: number;
  color: string;
}

const defaultStages: JourneyStage[] = [
  { id: '1', name: 'Website Visit', type: 'awareness', count: 10000, conversionRate: 100, dropOff: 0, color: 'bg-blue-500' },
  { id: '2', name: 'Page View', type: 'interest', count: 6500, conversionRate: 65, dropOff: 35, color: 'bg-indigo-500' },
  { id: '3', name: 'Add to Cart', type: 'consideration', count: 3200, conversionRate: 49.2, dropOff: 50.8, color: 'bg-purple-500' },
  { id: '4', name: 'Checkout Start', type: 'intent', count: 1800, conversionRate: 56.3, dropOff: 43.7, color: 'bg-pink-500' },
  { id: '5', name: 'Payment', type: 'evaluation', count: 1200, conversionRate: 66.7, dropOff: 33.3, color: 'bg-orange-500' },
  { id: '6', name: 'Purchase', type: 'purchase', count: 850, conversionRate: 70.8, dropOff: 29.2, color: 'bg-green-500' },
];

const touchpoints = [
  { channel: 'WhatsApp', sent: 5420, delivered: 5200, read: 3800, clicks: 1200, icon: <MessageSquare size={16} /> },
  { channel: 'Email', sent: 8900, delivered: 8100, read: 3200, clicks: 890, icon: <Mail size={16} /> },
  { channel: 'SMS', sent: 3100, delivered: 2900, read: 1400, clicks: 320, icon: <Phone size={16} /> },
  { channel: 'Phone', sent: 450, delivered: 380, read: 380, clicks: 180, icon: <Phone size={16} /> },
];

export default function CustomerJourneyPage() {
  const [stages] = useState<JourneyStage[]>(defaultStages);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <GitBranch className="text-violet-600" /> Customer Journey Mapping
        </h1>
        <p className="text-gray-600 mt-1">Visualize customer paths and optimize touchpoints</p>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={18} /> Conversion Funnel
        </h3>
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-4">
              <div className="w-36 text-sm text-gray-700 font-medium text-right">{stage.name}</div>
              <div className="flex-1 relative">
                <div className="h-10 rounded-lg bg-gray-100">
                  <div
                    className={`h-10 rounded-lg ${stage.color} flex items-center justify-between px-4 text-white text-sm font-medium transition-all`}
                    style={{ width: `${stage.conversionRate}%`, minWidth: '80px' }}
                  >
                    <span>{stage.count.toLocaleString()}</span>
                    <span className="text-xs opacity-80">{stage.conversionRate}%</span>
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="text-xs text-red-500 w-20 text-right">
                  -{stage.dropOff > 0 ? stages[i + 1]?.dropOff : stage.dropOff}% drop
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Touchpoints */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye size={18} /> Channel Touchpoints
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {touchpoints.map((tp) => (
            <div key={tp.channel} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
                {tp.icon} {tp.channel}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Sent</span><span>{tp.sent.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivered</span><span>{tp.delivered.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Read</span><span>{tp.read.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Clicks</span><span className="font-medium">{tp.clicks.toLocaleString()}</span></div>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${(tp.clicks / tp.sent) * 100}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{((tp.clicks / tp.sent) * 100).toFixed(1)}% click rate</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 size={18} /> AI Journey Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="font-medium">Biggest Drop-off</div>
            <div>Cart to Checkout: 43.7% customers leave. Add exit-intent popup with discount.</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="font-medium">Best Channel</div>
            <div>WhatsApp has 22.1% click rate vs Email 11.0%. Prioritize WhatsApp campaigns.</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="font-medium">Quick Win</div>
            <div>SMS read rate is only 48.3%. Improve with shorter messages and clear CTA.</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="font-medium">Revenue Impact</div>
            <div>Fixing checkout drop-off could increase purchases by 62% (+₹X.XX L/month).</div>
          </div>
        </div>
      </div>
    </div>
  );
}