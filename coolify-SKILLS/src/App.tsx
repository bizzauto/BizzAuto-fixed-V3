import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  Terminal, 
  Server, 
  Database, 
  ShieldCheck, 
  Activity,
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import skillMarkdown from '../skill.md?raw';

function App() {
  const [activeTab, setActiveTab] = useState('document');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">BIZZ CRM</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">AI Agent Specifications</p>
              </div>
            </div>
            
            <nav className="flex space-x-1 sm:space-x-4">
              <button 
                onClick={() => setActiveTab('document')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'document' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Specification Doc</span>
              </button>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <ListTodo className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Overview</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'document' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 sm:p-12">
              <article className="prose prose-slate prose-blue max-w-none 
                prose-headings:font-semibold prose-h1:text-3xl prose-h1:text-slate-900 prose-h1:border-b prose-h1:pb-4
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-lg prose-h3:text-slate-700 prose-h3:mt-8
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-li:my-1 prose-ul:my-4
                prose-hr:my-8 prose-hr:border-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {skillMarkdown}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard 
              icon={<Server className="w-6 h-6 text-indigo-500" />}
              title="VPS & Infrastructure"
              items={[
                "Coolify Deployments",
                "Docker Orchestration",
                "Linux/Ubuntu Administration",
                "Traefik & Nginx Proxies"
              ]}
            />
            <DashboardCard 
              icon={<Database className="w-6 h-6 text-emerald-500" />}
              title="Database & Supabase"
              items={[
                "PostgreSQL Optimization",
                "Row Level Security (RLS)",
                "Self-Hosted Supabase Setup",
                "Migration & Recovery"
              ]}
            />
            <DashboardCard 
              icon={<Terminal className="w-6 h-6 text-blue-500" />}
              title="Full-Stack Dev"
              items={[
                "Next.js & React Frontend",
                "Node.js & Express Backend",
                "API Architecture",
                "Production Debugging"
              ]}
            />
            <DashboardCard 
              icon={<ShieldCheck className="w-6 h-6 text-rose-500" />}
              title="Security & Perf"
              items={[
                "Vulnerability Protection",
                "SSL & Reverse Proxy",
                "Load Balancing",
                "Resource Tuning (CPU/RAM)"
              ]}
            />
            <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-md p-6 sm:p-8 text-white">
              <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
                <div className="bg-white/20 p-3 rounded-full">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Primary Objective</h3>
                  <p className="text-blue-100 max-w-3xl leading-relaxed">
                    Audit, debug, optimize, secure, and stabilize the BIZZ CRM project hosted on a VPS using Coolify, Docker, Next.js, Node.js, and Supabase. The goal is a fully production-ready, scalable, and high-performance application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-auto py-8 text-center text-slate-500 text-sm">
        <p>BIZZ CRM Skill Specification generated for OpenCode.</p>
      </footer>
    </div>
  );
}

function DashboardCard({ icon, title, items }: { icon: React.ReactNode, title: string, items: string[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          {icon}
        </div>
        <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
