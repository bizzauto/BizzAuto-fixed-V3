import React from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
    <div className="text-center max-w-lg">
      <div className="relative mb-8">
        <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">404</h1>
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
          <AlertTriangle size={32} className="text-yellow-600" />
        </div>
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been moved. Let's get you back on track.</p>
      <div className="flex gap-4 justify-center">
        <button onClick={() => onNavigate?.('landing')}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Home size={18} /> Go Home
        </button>
        <button onClick={() => window.history.back()}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 flex items-center gap-2">
          <ArrowLeft size={18} /> Go Back
        </button>
      </div>
      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        {[
          { label: 'Product', page: 'pricing' },
          { label: 'Pricing', page: 'pricing' },
          { label: 'Support', page: 'contact' },
        ].map((link, i) => (
          <button key={i} onClick={() => onNavigate?.(link.page)}
            className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 text-sm text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-colors">
            {link.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default NotFoundPage;
