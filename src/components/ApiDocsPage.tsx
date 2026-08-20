import React, { useState } from 'react';
import { Code, Copy, Check, ChevronDown, ChevronRight, Lock, Globe } from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

const endpoints: Endpoint[] = [
  // Auth
  { method: 'POST', path: '/api/auth/register', description: 'Register a new user account', auth: false, params: [
    { name: 'email', type: 'string', required: true, description: 'User email address' },
    { name: 'password', type: 'string', required: true, description: 'Password (min 8 chars)' },
    { name: 'name', type: 'string', required: false, description: 'Full name' },
    { name: 'phone', type: 'string', required: false, description: 'Phone number' },
  ]},
  { method: 'POST', path: '/api/auth/login', description: 'Login with email and password', auth: false, params: [
    { name: 'email', type: 'string', required: true, description: 'User email address' },
    { name: 'password', type: 'string', required: true, description: 'User password' },
  ]},
  { method: 'POST', path: '/api/auth/refresh', description: 'Refresh access token', auth: false, params: [
    { name: 'refreshToken', type: 'string', required: true, description: 'Refresh token' },
  ]},

  // Contacts
  { method: 'GET', path: '/api/contacts', description: 'List all contacts', auth: true },
  { method: 'POST', path: '/api/contacts', description: 'Create a new contact', auth: true, params: [
    { name: 'name', type: 'string', required: true, description: 'Contact name' },
    { name: 'phone', type: 'string', required: false, description: 'Phone number' },
    { name: 'email', type: 'string', required: false, description: 'Email address' },
  ]},
  { method: 'GET', path: '/api/contacts/:id', description: 'Get a specific contact', auth: true },
  { method: 'PUT', path: '/api/contacts/:id', description: 'Update a contact', auth: true },
  { method: 'DELETE', path: '/api/contacts/:id', description: 'Delete a contact', auth: true },

  // Campaigns
  { method: 'GET', path: '/api/campaigns', description: 'List all campaigns', auth: true },
  { method: 'POST', path: '/api/campaigns', description: 'Create a new campaign', auth: true },
  { method: 'POST', path: '/api/campaigns/:id/send', description: 'Send a campaign', auth: true },

  // WhatsApp
  { method: 'POST', path: '/api/whatsapp/send', description: 'Send a WhatsApp message', auth: true, params: [
    { name: 'to', type: 'string', required: true, description: 'Recipient phone number' },
    { name: 'message', type: 'string', required: true, description: 'Message content' },
  ]},

  // Appointments
  { method: 'GET', path: '/api/appointments', description: 'List all appointments', auth: true },
  { method: 'POST', path: '/api/appointments', description: 'Create a new appointment', auth: true },

  // AI
  { method: 'POST', path: '/api/ai/caption', description: 'Generate AI caption', auth: true, params: [
    { name: 'prompt', type: 'string', required: true, description: 'Content prompt' },
    { name: 'platform', type: 'string', required: false, description: 'Target platform' },
  ]},
  { method: 'POST', path: '/api/ai/image/generate', description: 'Generate AI image', auth: true },

  // Ava
  { method: 'GET', path: '/api/ava/briefing', description: 'Get AI business briefing', auth: true },
  { method: 'POST', path: '/api/ava/chat', description: 'Chat with Ava assistant', auth: true, params: [
    { name: 'message', type: 'string', required: true, description: 'Message to Ava' },
    { name: 'language', type: 'string', required: false, description: 'Response language' },
  ]},

  // Subscriptions
  { method: 'GET', path: '/api/subscriptions/current', description: 'Get current subscription', auth: true },
  { method: 'GET', path: '/api/subscriptions/usage', description: 'Get current usage stats', auth: true },

  // Support
  { method: 'GET', path: '/api/support-tickets', description: 'List support tickets', auth: true },
  { method: 'POST', path: '/api/support-tickets', description: 'Create a support ticket', auth: true },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

const ApiDocsPage: React.FC = () => {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const groupedEndpoints = endpoints.reduce((acc, ep) => {
    const group = ep.path.split('/')[2] || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ep);
    return acc;
  }, {} as Record<string, Endpoint[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <Code className="text-blue-600" /> API Documentation
          </h1>
          <p className="text-sm sm:text-base text-gray-500">Integrate BizzAuto into your applications</p>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border border-blue-100">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Quick Start</h2>
          <p className="text-sm text-gray-600 mb-4">
            All API requests require a Bearer token in the Authorization header.
            Get your API key from <strong>Settings → API Keys</strong>.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 relative">
            <button
              onClick={() => copyToClipboard('curl -H "Authorization: Bearer YOUR_API_KEY" https://api.bizzauto.com/api/contacts')}
              className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
            >
              {copied === 'curl' ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <pre>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     https://api.bizzauto.com/api/contacts`}</pre>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-blue-600" />
              <span className="text-gray-600">Base URL: <code className="font-mono">https://api.bizzauto.com</code></span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-green-600" />
              <span className="text-gray-600">Rate Limit: 100 req/min</span>
            </div>
            <div className="flex items-center gap-2">
              <Code size={16} className="text-purple-600" />
              <span className="text-gray-600">Format: JSON</span>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-8">
          {Object.entries(groupedEndpoints).map(([group, eps]) => (
            <div key={group} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900 capitalize">{group} Endpoints</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {eps.map((ep) => {
                  const key = `${ep.method}-${ep.path}`;
                  const isExpanded = expandedEndpoint === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left"
                      >
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="font-mono text-sm text-gray-800 flex-1">{ep.path}</code>
                        {ep.auth && <Lock size={14} className="text-gray-400" />}
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                          <p className="text-sm text-gray-600 mb-3">{ep.description}</p>

                          {ep.params && ep.params.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Parameters</h4>
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                                      <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                                      <th className="text-left px-3 py-2 font-medium text-gray-600">Required</th>
                                      <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {ep.params.map((param) => (
                                      <tr key={param.name}>
                                        <td className="px-3 py-2 font-mono text-xs text-blue-600">{param.name}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{param.type}</td>
                                        <td className="px-3 py-2">
                                          {param.required ? (
                                            <span className="text-xs text-red-600 font-medium">Required</span>
                                          ) : (
                                            <span className="text-xs text-gray-400">Optional</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-600">{param.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            {ep.auth ? (
                              <>
                                <Lock size={12} />
                                <span>Requires authentication</span>
                              </>
                            ) : (
                              <>
                                <Globe size={12} />
                                <span>Public endpoint</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Webhooks */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Webhooks</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure webhooks to receive real-time notifications when events occur in your BizzAuto account.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400">
            <pre>{`{
  "event": "contact.created",
  "data": {
    "id": "cuid...",
    "name": "John Doe",
    "phone": "+917972888023"
  },
  "timestamp": "2026-06-06T10:00:00Z"
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocsPage;