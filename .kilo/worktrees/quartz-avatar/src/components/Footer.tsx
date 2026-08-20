import React from 'react';
import { Mail, Phone, MapPin, Heart, Shield } from 'lucide-react';

const Footer: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();
  const nav = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate?.(page);
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to grow your business?</h3>
            <p className="text-blue-100">Start your 14-day free trial. No credit card required.</p>
          </div>
          <button onClick={nav('register')} className="mt-4 md:mt-0 px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              BizzAuto Solutions
            </h2>
            <p className="text-gray-400 mb-4 max-w-xs">
              India's most powerful WhatsApp marketing & business automation platform. Built for small businesses & agencies.
            </p>
            <div className="flex gap-3">
              {[
                { icon: 'f', href: '#' },
                { icon: '𝕏', href: '#' },
                { icon: '📷', href: '#' },
                { icon: 'in', href: '#' },
                { icon: '▶', href: '#' },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors font-bold text-sm"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              {[
                { label: 'CRM', page: 'crm' },
                { label: 'WhatsApp API', page: 'whatsapp' },
                { label: 'Automation', page: 'automation' },
                { label: 'AI Assistant', page: 'creative' },
                { label: 'Campaigns', page: 'social' },
                { label: 'Analytics', page: 'analytics' },
                { label: 'Integrations', page: 'settings' },
                { label: 'Pricing', page: 'pricing' },
              ].map(link => (
                <li key={link.label}>
                  <a href="#" onClick={nav(link.page)} className="text-gray-400 hover:text-white text-sm transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-white font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2">
              {['Real Estate', 'Healthcare', 'Education', 'E-Commerce', 'Restaurants', 'Salons & Spas', 'Agencies', 'Startups'].map(link => (
                <li key={link}>
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              {[
                { label: 'Help Center', page: 'contact' },
                { label: 'Documentation', page: 'about' },
                { label: 'API Reference', page: 'api-keys' },
                { label: 'Community', page: 'about' },
                { label: 'Contact Us', page: 'contact' },
                { label: 'Status Page', page: 'about' },
                { label: 'Report a Bug', page: 'contact' },
                { label: 'Feature Request', page: 'contact' },
              ].map(link => (
                <li key={link.label}>
                  <a href="#" onClick={nav(link.page)} className="text-gray-400 hover:text-white text-sm transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {[
                { label: 'Terms of Service', page: 'terms' },
                { label: 'Privacy Policy', page: 'privacy' },
                { label: 'Cookie Policy', page: 'privacy' },
                { label: 'Refund Policy', page: 'privacy' },
                { label: 'GDPR Compliance', page: 'privacy' },
                { label: 'Security', page: 'about' },
              ].map(link => (
                <li key={link.label}>
                  <a href="#" onClick={nav(link.page)} className="text-gray-400 hover:text-white text-sm transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-2">
              <Mail size={14} className="text-blue-400" />
              support@BizzAuto Solutions.in
            </span>
            <span className="flex items-center gap-2">
              <Phone size={14} className="text-green-400" />
              +91 98765 43210
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={14} className="text-red-400" />
              Mumbai, India
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield size={14} className="text-green-400" />
            256-bit SSL Encrypted
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            © {currentYear} BizzAuto Solutions. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            Made with <Heart size={12} className="text-red-500" /> in India
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
