import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../lib/authStore';

interface AppleLoginProps {
  onError?: (error: string) => void;
  className?: string;
}

const AppleLogin: React.FC<AppleLoginProps> = ({ onError, className }) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const existing = document.getElementById('appleid-auth-script');
    if (existing) {
      setScriptLoaded(!!window.AppleID);
      return;
    }

    const script = document.createElement('script');
    script.id = 'appleid-auth-script';
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.AppleID) {
        window.AppleID.auth.init({
          clientId,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        });
        setScriptLoaded(true);
      }
    };
    scriptRef.current = script;
    document.head.appendChild(script);

    return () => {
      scriptRef.current = null;
    };
  }, [clientId]);

  const handleAppleSignIn = useCallback(async () => {
    if (!window.AppleID || !scriptLoaded) {
      onError?.('Apple Sign-In is not loaded yet. Please try again.');
      return;
    }

    setIsSigningIn(true);
    try {
      const response = await window.AppleID.auth.signIn();
      if (response?.authorization?.id_token) {
        const userName = response?.user?.name
          ? `${response.user.name.firstName} ${response.user.name.lastName}`.trim()
          : undefined;
        await useAuthStore.getState().appleLogin(response.authorization.id_token, userName);
        const role = useAuthStore.getState().user?.role;
        window.location.href = role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
      } else {
        onError?.('Apple sign-in failed: no token received');
      }
    } catch (err: any) {
      if (err?.error !== 'popup_closed_by_user') {
        onError?.(err?.message || 'Apple sign-in failed');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [scriptLoaded, onError]);

  if (!clientId) return null;

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={handleAppleSignIn}
        disabled={isSigningIn}
        className={`flex items-center justify-center gap-2 w-full sm:max-w-[240px] h-10 sm:h-11 px-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 ${className || ''}`}
      >
        {isSigningIn ? (
          <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">Sign in with Apple</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AppleLogin;

