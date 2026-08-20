import { useState } from 'react';
import { useToast } from '../components/Toast';
import { TrendingUp, DollarSign, Users, Target, Calculator, Download } from 'lucide-react';

interface CampaignData {
  name: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export default function CampaignROIPage() {
  const toast = useToast();
  const [campaign, setCampaign] = useState<CampaignData>({
    name: '', budget: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
  });
  const [saved, setSaved] = useState<CampaignData[]>([]);

  const roi = campaign.spend > 0 ? ((campaign.revenue - campaign.spend) / campaign.spend) * 100 : 0;
  const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
  const cpa = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
  const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const roas = campaign.spend > 0 ? campaign.revenue / campaign.spend : 0;
  const profit = campaign.revenue - campaign.spend;

  const saveCampaign = () => {
    if (!campaign.name) { toast.error('Enter campaign name'); return; }
    setSaved(prev => [...prev, { ...campaign }]);
    toast.success('Campaign saved!');
    setCampaign({ name: '', budget: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
  };

  const exportCSV = () => {
    const csv = 'Name,Budget,Spend,Impressions,Clicks,Conversions,Revenue,ROI%\n' +
      saved.map(c => `${c.name},${c.budget},${c.spend},${c.impressions},${c.clicks},${c.conversions},${c.revenue},${((c.revenue - c.spend) / c.spend * 100).toFixed(1)}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'campaign_roi.csv';
    a.click();
    toast.success('Exported!');
  };

  const metrics = [
    { label: 'ROI', value: `${roi.toFixed(1)}%`, color: roi >= 0 ? 'text-green-600' : 'text-red-600', icon: <TrendingUp size={20} /> },
    { label: 'Profit/Loss', value: `₹${profit.toLocaleString()}`, color: profit >= 0 ? 'text-green-600' : 'text-red-600', icon: <DollarSign size={20} /> },
    { label: 'CPC', value: `₹${cpc.toFixed(2)}`, color: 'text-blue-600', icon: <Target size={20} /> },
    { label: 'CPA', value: `₹${cpa.toFixed(2)}`, color: 'text-purple-600', icon: <Users size={20} /> },
    { label: 'CTR', value: `${ctr.toFixed(2)}%`, color: 'text-orange-600', icon: <Calculator size={20} /> },
    { label: 'ROAS', value: `${roas.toFixed(2)}x`, color: 'text-indigo-600', icon: <TrendingUp size={20} /> },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="text-emerald-600" /> Campaign ROI Calculator
          </h1>
          <p className="text-gray-600 mt-1">Track campaign performance and ROI</p>
        </div>
        {saved.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaign Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input type="text" value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="e.g., Summer Sale 2026" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
            <input type="number" value={campaign.budget || ''} onChange={e => setCampaign({ ...campaign, budget: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="50000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Spent (₹)</label>
            <input type="number" value={campaign.spend || ''} onChange={e => setCampaign({ ...campaign, spend: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="25000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impressions</label>
            <input type="number" value={campaign.impressions || ''} onChange={e => setCampaign({ ...campaign, impressions: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="100000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clicks</label>
            <input type="number" value={campaign.clicks || ''} onChange={e => setCampaign({ ...campaign, clicks: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conversions</label>
            <input type="number" value={campaign.conversions || ''} onChange={e => setCampaign({ ...campaign, conversions: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="250" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Revenue (₹)</label>
            <input type="number" value={campaign.revenue || ''} onChange={e => setCampaign({ ...campaign, revenue: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="75000" />
          </div>
        </div>
        <button onClick={saveCampaign} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Save Campaign
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <div className={`${m.color} flex justify-center mb-2`}>{m.icon}</div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-xs text-gray-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Saved Campaigns */}
      {saved.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Saved Campaigns</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Spend</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {saved.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2 text-right">₹{c.spend.toLocaleString()}</td>
                    <td className="p-2 text-right">₹{c.revenue.toLocaleString()}</td>
                    <td className={`p-2 text-right font-medium ${((c.revenue - c.spend) / c.spend * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {((c.revenue - c.spend) / c.spend * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}