import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWhiteLabelStore, PRODUCTS } from "../lib/store";
import {
  LayoutDashboard, Users, Globe, Palette, LogOut,
  TrendingUp, DollarSign, Star, Settings, Package,
  Plus, X, Check, Search, RefreshCw, Download, Mail, Phone,
  ChevronDown, ExternalLink, QrCode, CreditCard, Zap, Shield,
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "clients", label: "Clients", icon: <Users className="w-5 h-5" /> },
  { id: "branding", label: "Branding", icon: <Palette className="w-5 h-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
];

const productNames: Record<string, string> = {
  "google-reviews": "AI Google Reviews QR",
  "digital-vcard": "Digital V-Card",
  "website-builder": "Website Builder",
};

const productColors: Record<string, string> = {
  "google-reviews": "#f59e0b",
  "digital-vcard": "#6366f1",
  "website-builder": "#14b8a6",
};

export default function ResellerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { reseller, clients, logout } = useWhiteLabelStore();
  const navigate = useNavigate();

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setIsTransitioning(true);
    setActiveTab(tabId);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!reseller) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0d0d24] border-r border-white/5 hidden lg:block z-40">
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">RP</span>
            </div>
            <span className="text-lg font-bold gradient-text">ResellerPro</span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "clients" && clients.length > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">
                  {clients.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Plan Badge */}
        <div className="px-6 py-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <p className="text-xs text-gray-400 mb-1">Current Plan</p>
            <p className="text-sm font-semibold text-white">{reseller.plan}</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {reseller.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{reseller.name}</p>
              <p className="text-xs text-gray-400 truncate">{reseller.company}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0d0d24] border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RP</span>
            </div>
            <span className="font-bold gradient-text text-sm">ResellerPro</span>
          </Link>
          <button onClick={handleLogout} className="text-gray-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  : "text-gray-400"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 pt-4 lg:pt-8 px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}>
            {activeTab === "overview" && <OverviewTab reseller={reseller} clients={clients} />}
            {activeTab === "clients" && <ClientsTab />}
            {activeTab === "branding" && <BrandingTab />}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ========================== OVERVIEW TAB ========================== */
function OverviewTab({ reseller, clients }: { reseller: any; clients: any[] }) {
  const activeClients = clients.filter((c) => c.status === "active").length;
  const pendingClients = clients.filter((c) => c.status === "pending").length;
  const revenue = clients.length * 499; // simulated revenue

  const stats = [
    { label: "Total Clients", value: clients.length, icon: <Users className="w-5 h-5" />, change: "+12%", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Active Clients", value: activeClients, icon: <Star className="w-5 h-5" />, change: "+8%", color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Pending", value: pendingClients, icon: <RefreshCw className="w-5 h-5" />, change: pendingClients > 0 ? "Action needed" : "None", color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Est. Revenue", value: `₹${revenue.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, change: "This month", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  ];

  return (
    <div className="space-y-6 stagger">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {reseller.name}! 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Here's your business overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="glass-card rounded-xl p-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="text-xs mt-1" style={{ color: s.color }}>{s.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Add Client", icon: <Plus className="w-4 h-4" />, action: "clients", color: "indigo" },
          { label: "Branding", icon: <Palette className="w-4 h-4" />, action: "branding", color: "purple" },
          { label: "View Products", icon: <Package className="w-4 h-4" />, action: "/products", color: "pink" },
          { label: "Settings", icon: <Settings className="w-4 h-4" />, action: "settings", color: "cyan" },
        ].map((btn, i) => (
          <Link
            key={i}
            to={btn.action.startsWith("/") ? btn.action : "#"}
            className="glass-card rounded-xl p-3 text-center hover:border-indigo-500/30 transition-all cursor-pointer"
          >
            <div className={`text-${btn.color}-400 mb-1 flex justify-center`}>{btn.icon}</div>
            <span className="text-xs text-gray-300">{btn.label}</span>
          </Link>
        ))}
      </div>

      {/* Your Domain Info */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Your Reseller Portal</h3>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="px-3 py-1.5 rounded-lg bg-white/5 text-indigo-300 text-sm font-mono">
            https://{reseller.domain}
          </code>
          <span className="text-xs text-gray-400">← Your clients see this domain</span>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Clients</h3>
          <button onClick={() => document.getElementById("client-section")?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {clients.slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${productColors[c.product] || "#6366f1"}, ${productColors[c.product] || "#6366f1"}88)` }}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400">{productNames[c.product] || c.product} • {c.plan}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                c.status === "active" ? "bg-green-500/10 text-green-400" :
                c.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                "bg-red-500/10 text-red-400"
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================== CLIENTS TAB ========================== */
function ClientsTab() {
  const { clients, removeClient } = useWhiteLabelStore();
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", product: "google-reviews", plan: "STARTER" });
  const addClient = useWhiteLabelStore((s) => s.addClient);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim() || !newClient.email.trim()) return;
    addClient({
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone,
      product: newClient.product,
      plan: newClient.plan,
    });
    setShowAdd(false);
    setNewClient({ name: "", email: "", phone: "", product: "google-reviews", plan: "STARTER" });
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="client-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-gray-400">{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="glow-btn-sm inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-10"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md animate-scale" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Client</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input className="input-field" placeholder="Client Name *" value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} required />
              <input className="input-field" placeholder="Email *" type="email" value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} required />
              <input className="input-field" placeholder="Phone" value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              <select className="input-field" value={newClient.product}
                onChange={(e) => setNewClient({ ...newClient, product: e.target.value })}>
                <option value="google-reviews">AI Google Reviews QR</option>
                <option value="digital-vcard">Digital V-Card</option>
                <option value="website-builder">Website Builder</option>
              </select>
              <select className="input-field" value={newClient.plan}
                onChange={(e) => setNewClient({ ...newClient, plan: e.target.value })}>
                <option value="STARTER">Starter</option>
                <option value="PRO">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl text-gray-300 hover:border-white/20 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 glow-btn-sm">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No clients found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? "Try a different search" : "Add your first client to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-sm text-gray-400">
                  <th className="p-4 font-medium">Client</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Product</th>
                  <th className="p-4 font-medium hidden md:table-cell">Plan</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${productColors[c.product] || "#6366f1"}, ${productColors[c.product] || "#6366f1"}88)` }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-300 hidden sm:table-cell">{productNames[c.product] || c.product}</td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300">{c.plan}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "active" ? "bg-green-500/10 text-green-400" :
                        c.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                          <Mail className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeClient(c.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-400">{clients.filter(c => c.status === "active").length}</p>
          <p className="text-xs text-gray-400">Active</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{clients.filter(c => c.status === "pending").length}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-cyan-400">{clients.reduce((acc, c) => acc + 1, 0)}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
      </div>
    </div>
  );
}

/* ========================== BRANDING TAB ========================== */
function BrandingTab() {
  const { reseller, updateBranding } = useWhiteLabelStore();
  const [domain, setDomain] = useState(reseller?.domain || "tools.myagency.com");
  const [primaryColor, setPrimaryColor] = useState(reseller?.primaryColor || "#6366f1");
  const [logoUrl, setLogoUrl] = useState(reseller?.logo || "");
  const [companyName, setCompanyName] = useState(reseller?.company || "My Digital Agency");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateBranding({ company: companyName, domain, primaryColor, logo: logoUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Branding & Domain</h1>
        <p className="text-sm text-gray-400 mt-1">Customize how your white-label portal looks</p>
      </div>

      {/* Domain */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-1">Custom Domain</h3>
        <p className="text-sm text-gray-400 mb-4">Your clients access all products through this domain</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">https://</span>
            <input
              className="input-field pl-14"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourdomain.com"
            />
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-xs text-amber-300">
            <Zap className="w-3 h-3 inline mr-1" />
            Update your DNS A record to point to ResellerPro's server IP
          </p>
        </div>
      </div>

      {/* Branding */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-1">Brand Settings</h3>
        <p className="text-sm text-gray-400 mb-4">Everything your clients see will use these settings</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Company Name</label>
            <input className="input-field" value={companyName}
              onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Logo URL (optional)</label>
            <input className="input-field" value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://yourlogo.com/logo.png" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
              <input className="input-field flex-1 font-mono" value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)} />
              <div className="flex gap-1">
                {["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#22c55e"].map((c) => (
                  <button key={c} onClick={() => setPrimaryColor(c)}
                    className="w-7 h-7 rounded-lg border border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="glow-btn-sm inline-flex items-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              <><Shield className="w-4 h-4" /> Save Branding</>
            )}
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-3">Live Preview</h3>
        <div className="rounded-xl p-6 transition-all duration-300"
          style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
              {logoUrl ? (
                <img src={logoUrl} className="w-full h-full rounded-xl object-cover" alt="Logo" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }} />
              ) : companyName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-lg">{companyName || "Your Brand"}</p>
              <p className="text-xs text-gray-400">https://{domain || "yourdomain.com"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["AI Reviews QR", "V-Card Maker", "Website Builder"].map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                style={{ backgroundColor: primaryColor }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================== SETTINGS TAB ========================== */
function SettingsTab() {
  const { reseller, logout } = useWhiteLabelStore();
  const navigate = useNavigate();

  if (!reseller) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your reseller account</p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-4">Account Details</h3>
        <div className="space-y-0 divide-y divide-white/5">
          {[
            { label: "Name", value: reseller.name },
            { label: "Email", value: reseller.email },
            { label: "Company", value: reseller.company },
            { label: "Plan", value: reseller.plan, badge: true },
            { label: "Member Since", value: reseller.joinedAt },
            { label: "Domain", value: reseller.domain },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <span className="text-gray-400 text-sm">{item.label}</span>
              {item.badge ? (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-medium">{item.value}</span>
              ) : (
                <span className="text-sm">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-4">Product Access</h3>
        <div className="space-y-2">
          {PRODUCTS.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-sm">{p.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{p.price}</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold mb-4 text-red-400">Danger Zone</h3>
        <p className="text-sm text-gray-400 mb-4">
          Signing out will redirect you to the login page. Your data is preserved locally.
        </p>
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
