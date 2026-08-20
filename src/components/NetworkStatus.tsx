import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, ServerCrash } from 'lucide-react';
import { useAuthStore } from '../lib/authStore';

const apiClient = (() => {
  try {
    // Lazy require to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../lib/api').default;
  } catch {
    return null;
  }
})();

/**
 * Global network health watcher. Shows a banner when the backend is unreachable.
 * On Capacitor native, the API is on a remote URL so a single 5xx/timeout means
 * the app is effectively broken — show a clear error rather than a blank screen.
 */
const NetworkStatus: React.FC = () => {
  const [online, setOnline] = useState(true);
  const [apiReachable, setApiReachable] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  // Browser online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Backend health check (only when online + authenticated, every 60s)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated) return;
    let cancelled = false;
    const check = async () => {
      try {
        // Ping a lightweight endpoint; /auth/me requires token but we only need
        // any response (even 401) to know the server is reachable.
        const token = localStorage.getItem('token');
        const baseURL = apiClient?.defaults?.baseURL || '/api';
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${baseURL}/auth/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (cancelled) return;
        // ANY HTTP response means server is reachable. Only network failures = unreachable.
        setApiReachable(true);
        setLastError(null);
        void res;
      } catch (e: any) {
        if (cancelled) return;
        setApiReachable(false);
        setLastError(e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Network error'));
      }
    };
    check();
    const iv = setInterval(check, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [isAuthenticated]);

  const showOffline = !online || !apiReachable;
  if (!showOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-lg animate-slide-in"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 min-w-0">
          {!online ? <WifiOff size={16} className="shrink-0" /> : <ServerCrash size={16} className="shrink-0" />}
          <span className="truncate">
            {!online
              ? 'No internet connection'
              : `Cannot reach server${lastError ? ' (' + lastError + ')' : ''}`}
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold shrink-0"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};

export default NetworkStatus;
