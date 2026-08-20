import { useState } from 'react';
import { useToast } from '../components/Toast';
import { FlaskConical, Plus, TrendingUp, BarChart3, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ABTest {
  id: string;
  name: string;
  type: 'subject' | 'cta' | 'landing' | 'email';
  status: 'running' | 'completed' | 'draft';
  variantA: { name: string; impressions: number; conversions: number; rate: number };
  variantB: { name: string; impressions: number; conversions: number; rate: number };
  winner?: 'A' | 'B';
  confidence: number;
}

export default function ABTestingPage() {
  const toast = useToast();
  const [tests] = useState<ABTest[]>([
    {
      id: '1', name: 'WhatsApp Subject Line', type: 'subject', status: 'completed',
      variantA: { name: 'Variant A: "Special offer!"', impressions: 5000, conversions: 150, rate: 3.0 },
      variantB: { name: 'Variant B: "Priya, just for you!"', impressions: 5000, conversions: 245, rate: 4.9 },
      winner: 'B', confidence: 98,
    },
    {
      id: '2', name: 'Landing Page CTA Button', type: 'cta', status: 'running',
      variantA: { name: 'Variant A: "Buy Now"', impressions: 2300, conversions: 92, rate: 4.0 },
      variantB: { name: 'Variant B: "Get Started Free"', impressions: 2350, conversions: 129, rate: 5.5 },
      confidence: 87,
    },
    {
      id: '3', name: 'Email CTA Color', type: 'email', status: 'running',
      variantA: { name: 'Variant A: Blue Button', impressions: 3100, conversions: 124, rate: 4.0 },
      variantB: { name: 'Variant B: Green Button', impressions: 3050, conversions: 131, rate: 4.3 },
      confidence: 62,
    },
  ]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-violet-600" /> A/B Testing
          </h1>
          <p className="text-gray-600 mt-1">Split test your messages and landing pages</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg">
          <Plus size={18} /> New Test
        </button>
      </div>

      {/* Tests */}
      <div className="space-y-6">
        {tests.map((test) => {
          const isWinnerA = test.winner === 'A';
          const isWinnerB = test.winner === 'B';
          return (
            <div key={test.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{test.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      test.status === 'completed' ? 'bg-green-100 text-green-700' :
                      test.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{test.status}</span>
                    <span className="text-xs text-gray-400">{test.confidence}% confidence</span>
                  </div>
                </div>
                {test.winner && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 size={18} />
                    <span className="font-semibold">Winner: {test.winner}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Variant A */}
                <div className={`rounded-xl p-4 border-2 ${isWinnerA ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{test.variantA.name}</span>
                    {isWinnerA && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Winner</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div><div className="font-bold">{test.variantA.impressions.toLocaleString()}</div><div className="text-xs text-gray-500">Impressions</div></div>
                    <div><div className="font-bold">{test.variantA.conversions}</div><div className="text-xs text-gray-500">Conversions</div></div>
                    <div><div className="font-bold text-violet-600">{test.variantA.rate}%</div><div className="text-xs text-gray-500">Conv. Rate</div></div>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-violet-500 rounded-full" style={{ width: `${test.variantA.rate * 10}%` }} />
                  </div>
                </div>

                {/* Variant B */}
                <div className={`rounded-xl p-4 border-2 ${isWinnerB ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{test.variantB.name}</span>
                    {isWinnerB && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Winner</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div><div className="font-bold">{test.variantB.impressions.toLocaleString()}</div><div className="text-xs text-gray-500">Impressions</div></div>
                    <div><div className="font-bold">{test.variantB.conversions}</div><div className="text-xs text-gray-500">Conversions</div></div>
                    <div><div className="font-bold text-violet-600">{test.variantB.rate}%</div><div className="text-xs text-gray-500">Conv. Rate</div></div>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${test.variantB.rate * 10}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}