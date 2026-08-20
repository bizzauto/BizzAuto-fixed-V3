import React from 'react';
import { Sparkles } from 'lucide-react';

interface ModernFrameProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  pageKey?: string;
}

const ModernFrame: React.FC<ModernFrameProps> = ({ children, title, subtitle, badge }) => {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-5">
        {(title || subtitle) && (
          <div className="ai-fade-in-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
            <div>
              {badge && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 ai-glass rounded-full text-[10px] sm:text-xs font-semibold mb-1.5 text-indigo-200">
                  <Sparkles size={10} className="animate-pulse" /> {badge}
                </div>
              )}
              {title && (
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-2xl">{subtitle}</p>
              )}
            </div>
          </div>
        )}
        <div className="ai-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ModernFrame;
