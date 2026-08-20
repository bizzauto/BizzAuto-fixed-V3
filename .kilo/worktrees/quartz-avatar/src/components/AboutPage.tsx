import React from 'react';
import Footer from './Footer';
import { Users, Target, Award, Globe, Zap, Heart, ArrowRight } from 'lucide-react';

const AboutPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => (
  <div className="min-h-screen bg-white">
    {/* Hero */}
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20 px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">Empowering Indian Businesses with AI & Automation</h1>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
          We built BizzAuto Solutions to help small businesses compete with giants — using WhatsApp, AI, and smart automation.
        </p>
      </div>
    </div>

    {/* Stats */}
    <div className="max-w-7xl mx-auto px-8 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { icon: <Users size={28} />, value: '10,000+', label: 'Active Users' },
          { icon: <Globe size={28} />, value: '5,000+', label: 'Businesses' },
          { icon: <Zap size={28} />, value: '50M+', label: 'Messages Sent' },
          { icon: <Award size={28} />, value: '99.9%', label: 'Uptime' },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mx-auto mb-3">
              {stat.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-gray-500 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Mission */}
    <div className="bg-gray-50 py-16 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <Target size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            We believe every business in India — from a local salon to a growing startup — deserves access to world-class automation tools.
            Our platform brings enterprise-grade CRM, WhatsApp marketing, and AI capabilities at prices that small businesses can afford.
          </p>
        </div>
        <div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4">
            <Heart size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Values</h2>
          <ul className="text-gray-600 space-y-2">
            <li>🎯 <strong>Customer First</strong> — We build what our users need</li>
            <li>💡 <strong>Innovation</strong> — AI-powered, always evolving</li>
            <li>🤝 <strong>Trust</strong> — Transparent pricing & data security</li>
            <li>🇮🇳 <strong>Made for India</strong> — Local languages, local support</li>
          </ul>
        </div>
      </div>
    </div>

    {/* Team */}
    <div className="max-w-7xl mx-auto px-8 py-16">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose BizzAuto Solutions?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            title: 'All-in-One Platform',
            desc: 'CRM, WhatsApp, AI, Email, Social Media — everything in one place. No need for 10 different tools.',
            color: 'bg-blue-50 text-blue-600',
          },
          {
            title: 'AI-Powered',
            desc: 'Smart lead scoring, auto-replies, content generation. Let AI handle the repetitive work.',
            color: 'bg-purple-50 text-purple-600',
          },
          {
            title: 'Built for India',
            desc: 'Multi-language support, Indian payment gateways, local integrations (IndiaMART, JustDial).',
            color: 'bg-green-50 text-green-600',
          },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* CTA */}
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to transform your business?</h2>
        <p className="text-blue-100 mb-8">Join 10,000+ businesses already growing with BizzAuto Solutions</p>
        <button onClick={() => onNavigate?.('register')}
          className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 flex items-center gap-2 mx-auto">
          Start Free Trial <ArrowRight size={18} />
        </button>
      </div>
    </div>

    <Footer />
  </div>
);

export default AboutPage;
