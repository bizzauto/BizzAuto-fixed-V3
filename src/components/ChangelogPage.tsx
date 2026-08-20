import React from 'react';
import { Sparkles, Check, Zap, Shield, Palette, MessageSquare } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix' | 'security';
  title: string;
  description: string;
}

const changelog: ChangelogEntry[] = [
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Ava Executive Assistant',
    description: 'AI-powered business intelligence assistant with voice support in 10 Indian languages.',
  },
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Cookie Consent Banner (DPDPA/GDPR)',
    description: 'Privacy-compliant cookie consent with granular preference management.',
  },
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Email Verification',
    description: 'Email verification flow for enhanced account security.',
  },
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Account Deletion (GDPR)',
    description: 'Self-service account deletion with data export and permanent removal.',
  },
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Refund Policy',
    description: 'Transparent refund policy page with clear terms and conditions.',
  },
  {
    version: '2.0.0',
    date: 'June 2026',
    type: 'feature',
    title: 'Support Tickets',
    description: 'In-app support ticket system with priority, status tracking, and real-time replies.',
  },
  {
    version: '1.9.0',
    date: 'May 2026',
    type: 'improvement',
    title: 'Supabase RLS Security',
    description: 'Row-level security enforced across all database tables with business-level isolation.',
  },
  {
    version: '1.9.0',
    date: 'May 2026',
    type: 'feature',
    title: 'Plan Limits Enforcement',
    description: 'Role-based plan limits with OWNER/SUPER_ADMIN exemptions.',
  },
  {
    version: '1.8.0',
    date: 'May 2026',
    type: 'improvement',
    title: 'Voice Navigation',
    description: 'Voice commands now support navigation in all 10 Indian languages.',
  },
  {
    version: '1.8.0',
    date: 'May 2026',
    type: 'improvement',
    title: 'Multilingual Support',
    description: 'All AI responses now respect the selected language.',
  },
  {
    version: '1.7.0',
    date: 'April 2026',
    type: 'feature',
    title: 'Nvidia NIM Integration',
    description: 'Free AI inference via Nvidia NIM for business intelligence.',
  },
  {
    version: '1.7.0',
    date: 'April 2026',
    type: 'feature',
    title: 'OpenRouter Free Models',
    description: 'Access to multiple free AI models via OpenRouter.',
  },
  {
    version: '1.6.0',
    date: 'April 2026',
    type: 'security',
    title: 'Enhanced Authentication',
    description: '2FA with backup codes, OAuth (Google/Apple), and JWT token rotation.',
  },
  {
    version: '1.5.0',
    date: 'March 2026',
    type: 'feature',
    title: 'Workflow Automation',
    description: 'Visual workflow builder with triggers, conditions, and actions.',
  },
  {
    version: '1.4.0',
    date: 'March 2026',
    type: 'feature',
    title: 'E-Commerce Module',
    description: 'Product catalog, checkout, order tracking, and payment links.',
  },
  {
    version: '1.3.0',
    date: 'February 2026',
    type: 'feature',
    title: 'Social Media Management',
    description: 'Schedule and manage posts across Facebook, Instagram, LinkedIn, and Twitter.',
  },
  {
    version: '1.2.0',
    date: 'February 2026',
    type: 'feature',
    title: 'CRM & Lead Management',
    description: 'Contact management, lead scoring, and pipeline visualization.',
  },
  {
    version: '1.1.0',
    date: 'January 2026',
    type: 'feature',
    title: 'WhatsApp Business Integration',
    description: 'Send/receive messages, templates, and automated replies.',
  },
  {
    version: '1.0.0',
    date: 'January 2026',
    type: 'feature',
    title: 'BizzAuto Launch',
    description: 'Initial release with dashboard, contacts, and basic automation.',
  },
];

const typeConfig = {
  feature: { icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-100', label: 'New Feature' },
  improvement: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Improvement' },
  fix: { icon: Check, color: 'text-green-600', bg: 'bg-green-100', label: 'Bug Fix' },
  security: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', label: 'Security' },
};

const ChangelogPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">What's New</h1>
        <p className="text-sm sm:text-base text-gray-500">Track all the latest features and improvements to BizzAuto</p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>

        <div className="space-y-6 sm:space-y-8">
          {changelog.map((entry, i) => {
            const config = typeConfig[entry.type];
            const Icon = config.icon;
            return (
              <div key={i} className="relative pl-12 sm:pl-20">
                {/* Timeline dot */}
                <div className={`absolute left-2 sm:left-6 w-5 h-5 rounded-full ${config.bg} border-4 border-white shadow`}></div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon size={12} /> {config.label}
                    </span>
                    <span className="text-xs text-gray-400">v{entry.version}</span>
                    <span className="text-xs text-gray-400">{entry.date}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{entry.title}</h3>
                  <p className="text-sm text-gray-600">{entry.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

export default ChangelogPage;