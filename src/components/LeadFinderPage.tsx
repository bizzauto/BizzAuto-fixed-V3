import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Globe, Phone, Download, Filter, BarChart3, Loader2, CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react';
import { leadFinderAPI } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import LeadScoreBadge from './LeadScoreBadge';

interface GooglePlace {
  placeId: string;
  name: string;
  phone: string;
  address: string;
  rating: number;
  totalReviews: number;
  website: string | null;
  socialMedia: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string };
  businessStatus: string;
  types: string[];
  digitalPresence?: {
    hasWebsite: boolean;
    hasFacebook: boolean;
    hasInstagram: boolean;
    score: number;
    gaps: string[];
  };
}

const BUSINESS_CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'real_estate_agent', label: 'Real Estate' },
  { value: 'insurance_agency', label: 'Insurance' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'gym', label: 'Gym / Fitness' },
  { value: 'beauty_salon', label: 'Beauty Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'store', label: 'Retail Store' },
  { value: 'shopping_mall', label: 'Shopping Mall' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'school', label: 'School' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'car_repair', label: 'Car Repair' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'custom', label: 'Custom (Enter your own)' },
];

export default function LeadFinderPage() {
  const { business } = useAuthStore();
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(10);
  const [results, setResults] = useState<GooglePlace[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'leads'>('search');
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('leadFinderBannerDismissed') === 'true';
  });

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('leadFinderBannerDismissed', 'true');
  };

  const handleSearch = async () => {
    const searchCategory = category === 'custom' ? customCategory.trim() : category;
    if (!searchCategory || !city) {
      setMessage({ type: 'error', text: 'Please select/enter a category and enter city' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setResults([]);
    setSelected(new Set());

    try {
      const res = await leadFinderAPI.search({ category: searchCategory, city, radius });
      if (res.data?.success) {
        setResults(res.data.data.results || []);
        setSearchId(res.data.data.searchId || '');
        setMessage({ type: 'success', text: `Found ${res.data.data.results?.length || 0} businesses` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Search failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.placeId)));
    }
  };

  const handleSelect = (placeId: string) => {
    const next = new Set(selected);
    if (next.has(placeId)) next.delete(placeId);
    else next.add(placeId);
    setSelected(next);
  };

  const handleImport = async () => {
    if (!searchId || selected.size === 0) return;

    setImporting(true);
    try {
      const selectedPlaces = results.filter((r) => selected.has(r.placeId));
      const res = await leadFinderAPI.import({ places: selectedPlaces, searchId });
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Imported ${res.data.data.imported} leads` });
        setSelected(new Set());
        // Refresh leads
        loadLeads();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await leadFinderAPI.leads({ limit: 100 });
      if (res.data?.success) {
        setLeads(res.data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleExportToSheets = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/lead-finder/export-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Exported ${data.data.exported} leads to Google Sheets` });
        if (data.data.spreadsheetUrl) {
          window.open(data.data.spreadsheetUrl, '_blank');
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Export failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leads') loadLeads();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-7 h-7 text-blue-600" />
            AI Lead Finder
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Find businesses without websites and convert them into customers
          </p>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto text-sm opacity-70">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Search & Import
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'leads'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            My Leads ({leads.length})
          </button>
        </div>

        {activeTab === 'search' ? (
          <>
            {/* Search Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                {category === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Category</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. LED Light Manufacturer, Bakery..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Radius ({radius} km)</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full">
                    <button
                      onClick={handleSearch}
                      disabled={loading || !category || (category === 'custom' && !customCategory.trim()) || !city}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {loading ? 'Searching...' : 'Find Leads'}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Uses AI to find relevant businesses matching your criteria
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {!bannerDismissed && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                      <span className="font-semibold">AI-Generated Leads:</span> These businesses are AI-suggested based on your search criteria. Verify contact details before outreach.
                    </p>
                    <button onClick={handleDismissBanner} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{results.length} Results</h3>
                    <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.size === results.length && results.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                      Select All
                    </label>
                    {selected.size > 0 && (
                      <span className="text-sm text-blue-600 dark:text-blue-400">{selected.size} selected</span>
                    )}
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={importing || selected.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Import ({selected.size})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-8"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Website</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Digital Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((place) => (
                        <tr key={place.placeId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(place.placeId)}
                              onChange={() => handleSelect(place.placeId)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {place.name}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                <Sparkles className="w-3 h-3" />
                                AI Suggested
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{place.types?.slice(0, 2).join(', ')}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {place.phone || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{place.address}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-gray-700 dark:text-gray-300">{place.rating}</span>
                              <span className="text-xs text-gray-400">({place.totalReviews})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {place.website ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                                <Globe className="w-3 h-3" /> Has
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                                <XCircle className="w-3 h-3" /> None
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {place.digitalPresence && (
                              <LeadScoreBadge score={place.digitalPresence.score} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a category and city to find businesses without websites</p>
              </div>
            )}
          </>
        ) : (
          /* Leads Tab */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {leadsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-gray-500">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Phone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No leads imported yet. Use the Search tab to find businesses.</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{leads.length} Leads</h3>
                  <button
                    onClick={handleExportToSheets}
                    disabled={exporting}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {exporting ? 'Exporting...' : 'Export to Google Sheets'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {leads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{lead.phone || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{lead.city || '—'}</td>
                        <td className="px-4 py-3">
                          <LeadScoreBadge score={lead.leadFinderScore || lead.leadScores?.[0]?.score || 0} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{lead.leadFinderSource || lead.source}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
