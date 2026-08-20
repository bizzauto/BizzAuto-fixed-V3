import React, { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface Props {
  onError?: (msg: string) => void;
  onSuccess?: (data: any) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  label?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const GoogleLoginButton: React.FC<Props> = ({
  onError,
  onSuccess,
  text = 'continue_with',
  label = 'Continue with Google',
  className = '',
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Handle the credential (ID token) from Google
  const handleCredentialResponse = async (response: { credential: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google sign-in failed');
      }

      // Store tokens and user data
      const { user, business, token, refreshToken } = data.data;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      if (business) localStorage.setItem('business', JSON.stringify(business));

      // Mark onboarding as completed for new users
      localStorage.setItem('onboardingCompleted', 'true');
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(data.data);
      } else {
        // Default: go to dashboard - ProtectedRoute handles redirect:
        // New users (admissionCompleted=false) → /resorpay
        // Returning users (admissionCompleted=true) → dashboard
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (onError) {
        onError(err.message || 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('[WARN] VITE_GOOGLE_CLIENT_ID is not set — Google sign-in will not work.');
      return;
    }

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initGoogle = () => {
      if (!mounted) return;
      if (!window.google?.accounts?.id) {
        retryTimer = setTimeout(initGoogle, 200);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        prompt: 'select_account',  // Always show account picker, not auto-select
      });

      // Render the Google button inside our container
      if (buttonRef.current && mounted) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: text === 'signin_with' ? 'signin_with' : text === 'signup_with' ? 'signup_with' : 'continue_with',
          width: buttonRef.current.offsetWidth || 320,
          shape: 'rectangular',
          logo_alignment: 'left',
        });
        setSdkReady(true);
      }
    };

    initGoogle();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [GOOGLE_CLIENT_ID, text]);

  // Fallback: manual prompt if button render fails
  const handleClick = () => {
    if (loading) return;

    if (sdkReady && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: try the popup flow
          if (onError) {
            onError('Google sign-in popup was blocked. Please allow popups and try again.');
          }
        }
      });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      if (onError) onError('Google sign-in is loading. Please try again in a moment.');
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className={`flex justify-center w-full ${className}`}>
      {/* Rendered Google button (takes priority) */}
      <div ref={buttonRef} className="w-full max-w-[320px]" />

      {/* Fallback button shown while SDK loads or if render fails */}
      {!sdkReady && (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 w-full max-w-[320px] h-11 px-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <GoogleGIcon />
          )}
          {label}
        </button>
      )}
    </div>
  );
};

const GoogleGIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default GoogleLoginButton;
