import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, AlertTriangle,
  ArrowRightLeft, Receipt, Calculator, Search, MessageSquare,
  BarChart3, Download, Loader2, ChevronRight, TrendingUp,
  TrendingDown, Clock, DollarSign, Eye
} from 'lucide-react';
import apiClient from '../lib/api';

type Tab = 'file-compare' | 'bank-reconciliation' | 'invoice-matching' | 'gst-reconciliation' | 'ledger-scrutiny' | 'ai-audit' | 'reports';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'file-compare', label: 'File Compare', icon: <ArrowRightLeft size={18} /> },
  { id: 'bank-reconciliation', label: 'Bank Reconciliation', icon: <ArrowRightLeft size={18} /> },
  { id: 'invoice-matching', label: 'Invoice Matching', icon: <Receipt size={18} /> },
  { id: 'gst-reconciliation', label: 'GST Reconciliation', icon: <Calculator size={18} /> },
  { id: 'ledger-scrutiny', label: 'Ledger Scrutiny', icon: <Search size={18} /> },
  { id: 'ai-audit', label: 'AI Audit', icon: <MessageSquare size={18} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
];

const caAPI = {
  bankReconciliation: (data: any) => apiClient.post('/ca-copilot/bank-reconciliation/upload', data),
  getInvoiceMatching: () => apiClient.get('/ca-copilot/invoice-matching'),
  gstReconciliation: (data: any) => apiClient.post('/ca-copilot/gst-reconciliation', data),
  getLedgerScrutiny: (params?: any) => apiClient.get('/ca-copilot/ledger-scrutiny', { params }),
  aiAuditQuery: (query: string) => apiClient.post('/ca-copilot/ai-audit/query', { query }),
  getReports: (params?: any) => apiClient.get('/ca-copilot/reports', { params }),
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>{children}</div>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

// ============================================================
// BANK RECONCILIATION
// ============================================================
const BankReconciliation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [csvText, setCsvText] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleReconcile = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const statementData = lines.slice(1).map(line => {
        const cols = line.split(',');
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = cols[i]?.trim(); });
        return {
          date: obj.date || obj.txn_date || new Date().toISOString(),
          amount: parseFloat(obj.amount || obj.debit || obj.credit || '0'),
          reference: obj.reference || obj.ref || obj.narration || obj.description || '',
          balance: parseFloat(obj.balance || '0'),
        };
      }).filter(t => !isNaN(t.amount) && t.amount !== 0);

      const res = await caAPI.bankReconciliation({ statementData, accountName });
      setResult(res.data.data);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Upload Bank Statement (CSV)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account Name</label>
            <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. HDFC Business Account" className="w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paste CSV Data</label>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8} placeholder="date,amount,reference,balance&#10;2024-01-01,5000,INV-001,15000&#10;2024-01-02,-2000,RENT,13000" className="w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600 font-mono text-sm" />
          </div>
          <button onClick={handleReconcile} disabled={loading || !csvText.trim()} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
            Reconcile
          </button>
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Bank Transactions" value={result.summary.totalBankTransactions} icon={<FileText size={18} />} color="bg-blue-100 text-blue-600" />
            <StatCard label="Matched" value={result.summary.matched} icon={<CheckCircle size={18} />} color="bg-green-100 text-green-600" />
            <StatCard label="Unmatched (Bank)" value={result.summary.unmatchedBank} icon={<XCircle size={18} />} color="bg-red-100 text-red-600" />
            <StatCard label="Unmatched (Books)" value={result.summary.unmatchedLedger} icon={<AlertTriangle size={18} />} color="bg-yellow-100 text-yellow-600" />
            <StatCard label="Match Rate" value={result.summary.matchRate} icon={<TrendingUp size={18} />} color="bg-purple-100 text-purple-600" />
          </div>

          {result.unmatchedBank?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-red-600">Unmatched Bank Transactions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Date</th><th className="text-right py-2">Amount</th><th className="text-left py-2">Reference</th></tr></thead>
                  <tbody>{result.unmatchedBank.map((t: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700/50"><td className="py-2">{new Date(t.date).toLocaleDateString('en-IN')}</td><td className="py-2 text-right font-mono">₹{t.amount.toLocaleString('en-IN')}</td><td className="py-2">{t.reference}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// INVOICE MATCHING
// ============================================================
const InvoiceMatching: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    caAPI.getInvoiceMatching().then(res => { setData(res.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;
  if (!data) return <Card><p className="text-gray-500">No invoice data available</p></Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={data.summary.total} icon={<FileText size={18} />} color="bg-blue-100 text-blue-600" />
        <StatCard label="Paid" value={data.summary.matched} icon={<CheckCircle size={18} />} color="bg-green-100 text-green-600" />
        <StatCard label="Unpaid" value={data.summary.unmatched} icon={<Clock size={18} />} color="bg-yellow-100 text-yellow-600" />
        <StatCard label="Overdue" value={data.summary.overdue} icon={<AlertTriangle size={18} />} color="bg-red-100 text-red-600" />
      </div>

      {data.overdue?.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-3 text-red-600">Overdue Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Invoice</th><th className="text-left py-2">Customer</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Days Overdue</th></tr></thead>
              <tbody>{data.overdue.map((inv: any) => (
                <tr key={inv.id} className="border-b dark:border-gray-700/50"><td className="py-2 font-mono">{inv.number}</td><td className="py-2">{inv.contact}</td><td className="py-2 text-right">₹{inv.amount?.toLocaleString('en-IN')}</td><td className="py-2 text-right text-red-600 font-semibold">{inv.daysOverdue} days</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {data.unmatched?.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-3 text-yellow-600">Pending Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Invoice</th><th className="text-left py-2">Customer</th><th className="text-right py-2">Amount</th><th className="text-right py-2">Due Date</th></tr></thead>
              <tbody>{data.unmatched.map((inv: any) => (
                <tr key={inv.id} className="border-b dark:border-gray-700/50"><td className="py-2 font-mono">{inv.number}</td><td className="py-2">{inv.contact}</td><td className="py-2 text-right">₹{inv.amount?.toLocaleString('en-IN')}</td><td className="py-2 text-right">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '-'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ============================================================
// GST RECONCILIATION
// ============================================================
const GSTReconciliation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [gstReturns, setGstReturns] = useState({ totalSales: '', cgst: '', sgst: '', igst: '' });

  const handleReconcile = async () => {
    setLoading(true);
    try {
      const res = await caAPI.gstReconciliation({
        period: { start: period.start || undefined, end: period.end || undefined },
        gstReturns: {
          totalSales: gstReturns.totalSales ? parseFloat(gstReturns.totalSales) : undefined,
          cgst: gstReturns.cgst ? parseFloat(gstReturns.cgst) : undefined,
          sgst: gstReturns.sgst ? parseFloat(gstReturns.sgst) : undefined,
          igst: gstReturns.igst ? parseFloat(gstReturns.igst) : undefined,
        }
      });
      setResult(res.data.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">GST Reconciliation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-500 uppercase">Period</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Start Date</label>
                <input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" />
              </div>
              <div>
                <label className="block text-xs mb-1">End Date</label>
                <input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-500 uppercase">GST Returns Data</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs mb-1">Total Sales</label><input type="number" value={gstReturns.totalSales} onChange={e => setGstReturns({ ...gstReturns, totalSales: e.target.value })} placeholder="0" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
              <div><label className="block text-xs mb-1">CGST</label><input type="number" value={gstReturns.cgst} onChange={e => setGstReturns({ ...gstReturns, cgst: e.target.value })} placeholder="0" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
              <div><label className="block text-xs mb-1">SGST</label><input type="number" value={gstReturns.sgst} onChange={e => setGstReturns({ ...gstReturns, sgst: e.target.value })} placeholder="0" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
              <div><label className="block text-xs mb-1">IGST</label><input type="number" value={gstReturns.igst} onChange={e => setGstReturns({ ...gstReturns, igst: e.target.value })} placeholder="0" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
            </div>
          </div>
        </div>
        <button onClick={handleReconcile} disabled={loading} className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
          Reconcile
        </button>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Book Sales" value={`₹${result.bookData.totalSales.toLocaleString('en-IN')}`} icon={<TrendingUp size={18} />} color="bg-blue-100 text-blue-600" />
            <StatCard label="CGST" value={`₹${result.bookData.cgst.toLocaleString('en-IN')}`} icon={<DollarSign size={18} />} color="bg-green-100 text-green-600" />
            <StatCard label="SGST" value={`₹${result.bookData.sgst.toLocaleString('en-IN')}`} icon={<DollarSign size={18} />} color="bg-purple-100 text-purple-600" />
            <StatCard label="Status" value={result.isReconciled ? 'Reconciled' : 'Discrepancies'} icon={result.isReconciled ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} color={result.isReconciled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} />
          </div>

          {result.discrepancies?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-red-600">Discrepancies Found</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Field</th><th className="text-right py-2">Books</th><th className="text-right py-2">Returns</th><th className="text-right py-2">Difference</th></tr></thead>
                  <tbody>{result.discrepancies.map((d: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700/50"><td className="py-2 font-medium">{d.field}</td><td className="py-2 text-right">₹{d.bookValue.toLocaleString('en-IN')}</td><td className="py-2 text-right">₹{d.returnValue.toLocaleString('en-IN')}</td><td className="py-2 text-right text-red-600 font-semibold">₹{d.difference.toLocaleString('en-IN')}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// LEDGER SCRUTINY
// ============================================================
const LedgerScrutiny: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState({ start: '', end: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (period.start) params.startDate = period.start;
      if (period.end) params.endDate = period.end;
      const res = await caAPI.getLedgerScrutiny(params);
      setData(res.data.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const severityColor = (s: string) => {
    if (s === 'HIGH') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-4">
          <div><label className="block text-xs mb-1">Start</label><input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
          <div><label className="block text-xs mb-1">End</label><input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
          <button onClick={fetchData} className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Refresh</button>
        </div>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Entries" value={data.summary.totalEntries} icon={<FileText size={18} />} color="bg-blue-100 text-blue-600" />
            <StatCard label="Total Income" value={`₹${data.summary.totalIncome.toLocaleString('en-IN')}`} icon={<TrendingUp size={18} />} color="bg-green-100 text-green-600" />
            <StatCard label="Total Expenses" value={`₹${data.summary.totalExpenses.toLocaleString('en-IN')}`} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-600" />
            <StatCard label="Anomalies" value={data.summary.anomaliesFound} icon={<AlertTriangle size={18} />} color="bg-yellow-100 text-yellow-600" />
            <StatCard label="High Severity" value={data.summary.highSeverity} icon={<Eye size={18} />} color="bg-red-100 text-red-600" />
          </div>

          {data.anomalies?.length > 0 ? (
            <Card>
              <h3 className="text-lg font-semibold mb-3">Anomalies Detected</h3>
              <div className="space-y-3">
                {data.anomalies.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityColor(a.severity)}`}>{a.severity}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.message}</p>
                    </div>
                    {a.amount && <span className="text-sm font-mono font-semibold">₹{a.amount.toLocaleString('en-IN')}</span>}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card><div className="text-center py-8"><CheckCircle size={48} className="mx-auto text-green-500 mb-3" /><p className="text-lg font-semibold text-green-600">No Anomalies Found!</p><p className="text-sm text-gray-500">Your ledger looks clean.</p></div></Card>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// AI AUDIT ASSISTANT
// ============================================================
const AIAuditAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!query.trim() || loading) return;
    const q = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await caAPI.aiAuditQuery(q);
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.data.data.answer }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your query.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <h3 className="text-lg font-semibold mb-3">AI Audit Assistant</h3>
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
          {chatHistory.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ask me anything about your financial data</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {['What is my total income?', 'Show overdue invoices', 'What is my net profit?', 'Show top expenses'].map(q => (
                  <button key={q} onClick={() => { setQuery(q); }} className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">{q}</button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 border rounded-bl-md'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-2xl rounded-bl-md"><Loader2 size={16} className="animate-spin" /></div></div>}
        </div>
        <div className="flex gap-2">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()} placeholder="Ask about your finances..." className="flex-1 px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" />
          <button onClick={handleQuery} disabled={loading || !query.trim()} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"><MessageSquare size={16} /></button>
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// CA REPORTS
// ============================================================
const CAReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState({ start: '', end: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (period.start) params.startDate = period.start;
      if (period.end) params.endDate = period.end;
      const res = await caAPI.getReports(params);
      setData(res.data.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-4">
          <div><label className="block text-xs mb-1">Start</label><input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
          <div><label className="block text-xs mb-1">End</label><input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" /></div>
          <button onClick={fetchData} className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Refresh</button>
          <button className="mt-5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"><Download size={14} /> Export</button>
        </div>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Income" value={`₹${data.summary.totalIncome.toLocaleString('en-IN')}`} icon={<TrendingUp size={18} />} color="bg-green-100 text-green-600" />
            <StatCard label="Total Expenses" value={`₹${data.summary.totalExpenses.toLocaleString('en-IN')}`} icon={<TrendingDown size={18} />} color="bg-red-100 text-red-600" />
            <StatCard label="Net Balance" value={`₹${data.summary.netBalance.toLocaleString('en-IN')}`} icon={<DollarSign size={18} />} color={data.summary.netBalance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} />
            <StatCard label="Invoices" value={data.summary.totalInvoices} icon={<Receipt size={18} />} color="bg-blue-100 text-blue-600" />
            <StatCard label="Invoice Value" value={`₹${data.invoiceSummary.totalAmount.toLocaleString('en-IN')}`} icon={<FileText size={18} />} color="bg-purple-100 text-purple-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-semibold mb-3">Category Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(data.categoryBreakdown).slice(0, 10).map(([cat, val]: [string, any]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b dark:border-gray-700/50 last:border-0">
                    <span className="text-sm font-medium">{cat}</span>
                    <div className="flex gap-4 text-sm">
                      {val.income > 0 && <span className="text-green-600">+₹{val.income.toLocaleString('en-IN')}</span>}
                      {val.expense > 0 && <span className="text-red-600">-₹{val.expense.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-3">Top Expenses</h3>
              <div className="space-y-2">
                {data.topExpenses?.slice(0, 8).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b dark:border-gray-700/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.description || 'No description'}</p>
                      <p className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-red-600">-₹{e.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-semibold mb-3">Monthly Trend</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b dark:border-gray-700"><th className="text-left py-2">Month</th><th className="text-right py-2">Income</th><th className="text-right py-2">Expenses</th><th className="text-right py-2">Net</th></tr></thead>
                <tbody>{Object.entries(data.monthlyData).sort().map(([month, val]: [string, any]) => (
                  <tr key={month} className="border-b dark:border-gray-700/50">
                    <td className="py-2 font-medium">{month}</td>
                    <td className="py-2 text-right text-green-600">₹{val.income.toLocaleString('en-IN')}</td>
                    <td className="py-2 text-right text-red-600">₹{val.expense.toLocaleString('en-IN')}</td>
                    <td className={`py-2 text-right font-semibold ${val.income - val.expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{(val.income - val.expense).toLocaleString('en-IN')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// ============================================================
// FILE COMPARE - Upload Excel/PDF, compare ledger vs bank
// ============================================================
const FileCompare: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [ledgerFiles, setLedgerFiles] = useState<File[]>([]);
  const [bankFiles, setBankFiles] = useState<File[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [ledgerAccount, setLedgerAccount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountConfirmed, setAccountConfirmed] = useState(false);

  const handleCompare = async () => {
    if (ledgerFiles.length === 0 && bankFiles.length === 0) return;
    if (ledgerAccount.trim() && bankAccount.trim() && ledgerAccount.trim() !== bankAccount.trim()) {
      alert('Account numbers do not match! Please verify the accounts.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      ledgerFiles.forEach(f => formData.append('ledger', f));
      bankFiles.forEach(f => formData.append('bank', f));
      formData.append('ledgerAccount', ledgerAccount);
      formData.append('bankAccount', bankAccount);

      const res = await apiClient.post('/ca-copilot/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data.data);
      setAccountConfirmed(true);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!result?._exportData) return;
    setExporting(format);
    try {
      const res = await apiClient.post(`/ca-copilot/export/${format}`, { exportData: result._exportData }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ca-copilot-comparison.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Upload Files to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Ledger Files (up to 3)</h4>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 transition">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-2">Drop files or click to upload</p>
              <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={e => setLedgerFiles(Array.from(e.target.files || []))} className="hidden" id="ledger-upload" />
              <label htmlFor="ledger-upload" className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Choose Files</label>
            </div>
            {ledgerFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {ledgerFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                    <FileText size={14} className="text-blue-600" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setLedgerFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><XCircle size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Bank Statement Files (up to 3)</h4>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-green-400 transition">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-2">Drop files or click to upload</p>
              <input type="file" accept=".xlsx,.xls,.csv,.pdf" multiple onChange={e => setBankFiles(Array.from(e.target.files || []))} className="hidden" id="bank-upload" />
              <label htmlFor="bank-upload" className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Choose Files</label>
            </div>
            {bankFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {bankFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg">
                    <FileText size={14} className="text-green-600" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setBankFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><XCircle size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <label className="block text-sm font-medium mb-1">Ledger Account Number</label>
            <input type="text" value={ledgerAccount} onChange={e => { setLedgerAccount(e.target.value); setAccountConfirmed(false); }} placeholder="Enter ledger account number" className="w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bank Account Number</label>
            <input type="text" value={bankAccount} onChange={e => { setBankAccount(e.target.value); setAccountConfirmed(false); }} placeholder="Enter bank account number" className="w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" />
          </div>
        </div>
        {ledgerAccount.trim() && bankAccount.trim() && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${ledgerAccount.trim() === bankAccount.trim() ? 'text-green-600' : 'text-red-600 font-semibold'}`}>
            {ledgerAccount.trim() === bankAccount.trim() ? <><CheckCircle size={14} /> Account numbers match</> : <><XCircle size={14} /> Account numbers DO NOT match — please verify!</>}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleCompare} disabled={loading || (ledgerFiles.length === 0 && bankFiles.length === 0)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
            Compare Files
          </button>
          {result && (
            <>
              <button onClick={() => handleExport('excel')} disabled={!!exporting} className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 flex items-center gap-2">
                {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Excel
              </button>
              <button onClick={() => handleExport('pdf')} disabled={!!exporting} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 flex items-center gap-2">
                {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
              </button>
            </>
          )}
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard label="Ledger" value={result.summary.totalLedger} icon={<FileText size={16} />} color="bg-blue-100 text-blue-600" />
            <StatCard label="Bank" value={result.summary.totalBank} icon={<FileText size={16} />} color="bg-green-100 text-green-600" />
            <StatCard label="Matched" value={result.summary.matched} icon={<CheckCircle size={16} />} color="bg-green-100 text-green-600" />
            <StatCard label="Unmatched L" value={result.summary.unmatchedLedger} icon={<XCircle size={16} />} color="bg-orange-100 text-orange-600" />
            <StatCard label="Unmatched B" value={result.summary.unmatchedBank} icon={<XCircle size={16} />} color="bg-red-100 text-red-600" />
            <StatCard label="Amount Diff" value={result.summary.amountMismatches} icon={<AlertTriangle size={16} />} color="bg-yellow-100 text-yellow-600" />
            <StatCard label="Match Rate" value={result.summary.matchRate} icon={<TrendingUp size={16} />} color="bg-purple-100 text-purple-600" />
          </div>

          {result.recommendations?.length > 0 && (
            <Card className="border-l-4 border-blue-500">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="space-y-1">{result.recommendations.map((r: string, i: number) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2"><ChevronRight size={14} className="mt-0.5 text-blue-500 shrink-0" />{r}</li>)}</ul>
            </Card>
          )}

          {/* Unmatched Bank */}
          {result.unmatchedBank?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-red-600">Unmatched Bank Entries ({result.unmatchedBank.length})</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800"><tr className="border-b dark:border-gray-700"><th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Description</th><th className="text-right py-2 px-2">Amount</th><th className="text-left py-2 px-2">Party</th></tr></thead>
                  <tbody>{result.unmatchedBank.map((u: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700/50 bg-red-50 dark:bg-red-900/10"><td className="py-2 px-2">{u.date}</td><td className="py-2 px-2 max-w-[300px] truncate">{u.description}</td><td className="py-2 px-2 text-right font-mono">₹{u.amount.toLocaleString('en-IN')}</td><td className="py-2 px-2">{u.party}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Unmatched Ledger */}
          {result.unmatchedLedger?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-orange-600">Unmatched Ledger Entries ({result.unmatchedLedger.length})</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800"><tr className="border-b dark:border-gray-700"><th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Description</th><th className="text-right py-2 px-2">Amount</th><th className="text-left py-2 px-2">Party</th></tr></thead>
                  <tbody>{result.unmatchedLedger.map((u: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700/50 bg-orange-50 dark:bg-orange-900/10"><td className="py-2 px-2">{u.date}</td><td className="py-2 px-2 max-w-[300px] truncate">{u.description}</td><td className="py-2 px-2 text-right font-mono">₹{u.amount.toLocaleString('en-IN')}</td><td className="py-2 px-2">{u.party}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Amount Mismatches */}
          {result.amountMismatches?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-yellow-600">Amount Mismatches ({result.amountMismatches.length})</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800"><tr className="border-b dark:border-gray-700"><th className="text-left py-2 px-2">Bank Amt</th><th className="text-left py-2 px-2">Ledger Amt</th><th className="text-right py-2 px-2">Diff</th><th className="text-left py-2 px-2">Bank Desc</th><th className="text-left py-2 px-2">Ledger Desc</th></tr></thead>
                  <tbody>{result.amountMismatches.map((m: any, i: number) => (
                    <tr key={i} className="border-b dark:border-gray-700/50 bg-yellow-50 dark:bg-yellow-900/10"><td className="py-2 px-2 font-mono">₹{m.bank.amount.toLocaleString('en-IN')}</td><td className="py-2 px-2 font-mono">₹{m.ledger.amount.toLocaleString('en-IN')}</td><td className="py-2 px-2 text-right font-mono text-red-600 font-semibold">₹{m.amountDiff.toLocaleString('en-IN')}</td><td className="py-2 px-2 max-w-[200px] truncate">{m.bank.description}</td><td className="py-2 px-2 max-w-[200px] truncate">{m.ledger.description}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Party-wise Report */}
          {result.partyWise?.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-3 text-purple-600">Party-wise Report ({result.partyWise.length} parties)</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800"><tr className="border-b dark:border-gray-700"><th className="text-left py-2 px-2">Party / Customer / Supplier</th><th className="text-right py-2 px-2">Ledger Entries</th><th className="text-right py-2 px-2">Bank Entries</th><th className="text-right py-2 px-2">Ledger Total</th><th className="text-right py-2 px-2">Bank Total</th><th className="text-right py-2 px-2">Difference</th><th className="text-center py-2 px-2">Status</th></tr></thead>
                  <tbody>{result.partyWise.map((p: any, i: number) => (
                    <tr key={i} className={`border-b dark:border-gray-700/50 ${p.hasMismatch ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="py-2 px-2 font-medium">{p.party}</td>
                      <td className="py-2 px-2 text-right">{p.ledgerCount}</td>
                      <td className="py-2 px-2 text-right">{p.bankCount}</td>
                      <td className="py-2 px-2 text-right font-mono">₹{p.ledgerTotal.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-right font-mono">₹{p.bankTotal.toLocaleString('en-IN')}</td>
                      <td className={`py-2 px-2 text-right font-mono font-semibold ${p.hasMismatch ? 'text-red-600' : 'text-green-600'}`}>₹{p.difference.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-center">{p.hasMismatch ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">MISMATCH</span> : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">OK</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// MAIN PAGE
// ============================================================
const CACopilotPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('bank-reconciliation');

  const renderContent = () => {
    switch (activeTab) {
      case 'file-compare': return <FileCompare />;
      case 'bank-reconciliation': return <BankReconciliation />;
      case 'invoice-matching': return <InvoiceMatching />;
      case 'gst-reconciliation': return <GSTReconciliation />;
      case 'ledger-scrutiny': return <LedgerScrutiny />;
      case 'ai-audit': return <AIAuditAssistant />;
      case 'reports': return <CAReports />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CA Copilot</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered Chartered Accountant assistant</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default CACopilotPage;
