import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Moon, Sun, Menu, X } from 'lucide-react';

interface PublicNavbarProps {
  isDark?: boolean;
  onToggleDark?: () => void;
}

const PublicNavbar: React.FC<PublicNavbarProps> = ({ isDark: forcedDark, onToggleDark: forcedToggle }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [localDark, setLocalDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const isDark = forcedDark ?? localDark;

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const toggle = () => {
    if (forcedToggle) {
      forcedToggle();
    } else {
      const next = !localDark;
      setLocalDark(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const navLinks = [
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 shadow-lg'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="BizzAuto Ai Logo" className="h-20 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.label}
              to={l.path}
              className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/login"
            className="hidden sm:block text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium px-4 py-2 transition-all"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all"
          >
            Get Started Free
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-[#0A0F1C]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/5 animate-fade-in-up">
          <div className="px-6 py-4 space-y-2">
            {navLinks.map(l => (
              <Link
                key={l.label}
                to={l.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-2 space-y-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg font-medium">
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default PublicNavbar;
