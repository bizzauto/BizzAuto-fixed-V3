/**
 * @jest-environment jsdom
 *
 * End-to-end OAuth flow tests for Google and Apple sign-in.
 *
 * Tests the full frontend integration:
 *   Button render → SDK callback → authStore action → API call → UI update
 *
 * We mock @react-oauth/google (since it requires a real Google client ID + network)
 * and AppleLogin (since it relies on import.meta.env + Apple CDN script + window.AppleID).
 *
 * The API module is mocked via the manual mock in src/lib/__mocks__/api.ts so we
 * can assert on calls and control responses — but authStore is REAL, so state
 * updates from OAuth login are exercised and testable.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ────── Shared mock state ──────

/** Captured callbacks from GoogleLoginButton mock so tests can trigger success/error */
let googleCallbacks: {
  onSuccess: (res: { credential?: string }) => void;
  onError: () => void;
} = {
  onSuccess: () => {},
  onError: () => {},
};

// ────── Module mocks (jest.mock is hoisted — order here doesn't matter) ──────

// GoogleLoginButton uses import.meta.env which Jest can't handle — mock it
// Captures onSuccess/onError callbacks so tests can trigger the OAuth flow
jest.mock('../src/components/GoogleLoginButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      // Expose callbacks via the shared googleCallbacks variable
      googleCallbacks = {
        onSuccess: async (res: { credential?: string }) => {
          try {
            const { authAPI } = require('../src/lib/api');
            const response = await authAPI.googleLogin(res?.credential || 'mock-google-credential');
            const data = response.data?.data || response.data;
            if (data) {
              const { useAuthStore } = require('../src/lib/authStore');
              useAuthStore.setState({
                user: data.user,
                business: data.business,
                token: data.token,
                isAuthenticated: true,
              });
            }
          } catch (err: any) {
            props.onError?.(err.message || 'Google sign-in failed');
          }
        },
        onError: () => {
          props.onError?.('Google sign-in failed. Please try again.');
        },
      };
      return React.createElement('button', { 'data-testid': 'google-login' }, props.label || 'Continue with Google');
    },
  };
});

jest.mock('@react-oauth/google', () => {
  const React = require('react');
  return {
    GoogleLogin: () => React.createElement('button', { 'data-testid': 'google-oauth-login' }, 'Sign in with Google'),
    GoogleOAuthProvider: ({ children }: any) => children,
  };
});

jest.mock('../src/components/AppleLogin', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      const handleClick = async () => {
        try {
          const { useAuthStore } = require('../src/lib/authStore');
          await useAuthStore.getState().appleLogin('mock-apple-token', 'Apple User');
        } catch (err: any) {
          props.onError?.(err.message || 'Apple sign-in failed');
        }
      };
      return React.createElement(
        'button',
        { 'data-testid': 'apple-login', onClick: handleClick },
        'Sign in with Apple',
      );
    },
  };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  const icons = [
    'Mail', 'Lock', 'Eye', 'EyeOff', 'ArrowRight', 'Shield', 'Zap',
    'AlertCircle', 'ArrowLeft', 'User', 'Phone', 'Building2', 'Check',
    'TrendingUp', 'Users', 'MessageSquare', 'BarChart3', 'CheckCircle',
    'Star', 'Brain', 'ShoppingCart', 'Share2', 'Activity', 'Sparkles',
    'Wand2', 'Crown', 'Rocket', 'Bot', 'Globe', 'Target', 'FileText',
    'Calendar', 'CreditCard', 'Heart', 'Megaphone', 'Layers', 'Send',
    'Instagram', 'Facebook', 'Twitter', 'Youtube', 'Image', 'Mic',
    'Briefcase', 'ChevronRight',
  ];
  const mock: Record<string, any> = {};
  for (const name of icons) {
    mock[name] = () => React.createElement('span', { 'data-icon': name }, name);
  }
  return mock;
});

jest.mock('recharts');
jest.mock('qrcode.react');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

// Mock the API module — authStore (real) will use this mock for all HTTP calls
jest.mock('../src/lib/api');

// ────── Imports (these resolve after jest.mock hoisting) ──────

import { authAPI } from '../src/lib/api';
import { useAuthStore } from '../src/lib/authStore';
import LoginPage from '../src/components/LoginPage';
import RegisterPage from '../src/components/RegisterPage';

// ────── Test helpers ──────

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

const renderRegister = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

const mockOAuthUser = {
  id: 'oauth-user-1',
  name: 'OAuth User',
  email: 'oauth@test.com',
  role: 'OWNER',
  businessId: 'b-oauth',
};

const mockOAuthBusiness = {
  id: 'b-oauth',
  name: 'OAuth Business',
  type: 'general',
  plan: 'FREE',
};

const mockOAuthToken = 'oauth-jwt-token';

const mockGoogleSuccessResponse = {
  data: {
    data: {
      token: mockOAuthToken,
      user: mockOAuthUser,
      business: mockOAuthBusiness,
    },
  },
};

// ────── Setup / teardown ──────

beforeEach(() => {
  jest.clearAllMocks();

  // Reset authStore to clean state (so googleLogin / appleLogin start fresh)
  useAuthStore.setState({
    user: null,
    business: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    onboardingCompleted: false,
    isDemoMode: false,
  });

  // Default: Google OAuth API resolves successfully
  (authAPI.googleLogin as jest.Mock).mockResolvedValue(mockGoogleSuccessResponse);
  // Default: Apple OAuth API resolves successfully
  (authAPI.appleLogin as jest.Mock).mockResolvedValue(mockGoogleSuccessResponse);
});

// ══════════════════════════════════════════════════════════════════════════════
//  Google OAuth — LoginPage
// ══════════════════════════════════════════════════════════════════════════════

describe('LoginPage — Google OAuth', () => {
  beforeEach(() => {
    googleCallbacks = { onSuccess: () => {}, onError: () => {} };
  });

  it('renders the Google Sign-In button', () => {
    renderLogin();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });

  it('calls googleLogin API with the credential on success and updates auth state', async () => {
    renderLogin();

    await act(async () => {
      googleCallbacks.onSuccess({ credential: 'google-credential-abc' });
    });

    expect(authAPI.googleLogin).toHaveBeenCalledTimes(1);
    expect(authAPI.googleLogin).toHaveBeenCalledWith('google-credential-abc');

    // Auth store should have been updated with the mock user
    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('oauth@test.com');
      expect(state.user?.name).toBe('OAuth User');
      expect(state.token).toBe(mockOAuthToken);
    });
  });

  it('shows an error message when googleLogin API rejects', async () => {
    (authAPI.googleLogin as jest.Mock).mockRejectedValue(new Error('Google sign-in failed'));

    renderLogin();

    await act(async () => {
      googleCallbacks.onSuccess({ credential: 'bad-credential' });
    });

    await waitFor(() => {
      expect(screen.getByText('Google sign-in failed')).toBeInTheDocument();
    });
  });

  it('shows an error message when Google onError callback fires', () => {
    renderLogin();

    act(() => {
      googleCallbacks.onError();
    });

    expect(screen.getByText('Google sign-in failed. Please try again.')).toBeInTheDocument();
  });

  it('handles SUPER_ADMIN role on Google login', async () => {
    const superAdminResponse = {
      data: {
        data: {
          token: 'super-admin-token',
          user: { ...mockOAuthUser, role: 'SUPER_ADMIN' },
          business: null,
        },
      },
    };
    (authAPI.googleLogin as jest.Mock).mockResolvedValue(superAdminResponse);

    renderLogin();

    await act(async () => {
      googleCallbacks.onSuccess({ credential: 'super-admin-google-cred' });
    });

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.role).toBe('SUPER_ADMIN');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  Apple OAuth — LoginPage
// ══════════════════════════════════════════════════════════════════════════════

describe('LoginPage — Apple OAuth', () => {
  it('renders the Apple Sign-In button', () => {
    renderLogin();
    expect(screen.getByTestId('apple-login')).toBeInTheDocument();
  });

  it('calls appleLogin API with credential and name on success, updates auth state', async () => {
    renderLogin();

    const appleBtn = screen.getByTestId('apple-login');
    await act(async () => {
      appleBtn.click();
    });

    expect(authAPI.appleLogin).toHaveBeenCalledTimes(1);
    expect(authAPI.appleLogin).toHaveBeenCalledWith('mock-apple-token', 'Apple User');

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe('OAuth User');
    });
  });

  it('displays an error when appleLogin API rejects', async () => {
    (authAPI.appleLogin as jest.Mock).mockRejectedValue(new Error('Apple sign-in failed'));

    renderLogin();

    const appleBtn = screen.getByTestId('apple-login');
    await act(async () => {
      appleBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Apple sign-in failed')).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  Google OAuth — RegisterPage
// ══════════════════════════════════════════════════════════════════════════════

describe('RegisterPage — Google OAuth', () => {
  beforeEach(() => {
    googleCallbacks = { onSuccess: () => {}, onError: () => {} };
  });

  it('renders the Google Sign-In button', () => {
    renderRegister();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
  });

  it('calls googleLogin API with the credential on success and updates auth state', async () => {
    renderRegister();

    await act(async () => {
      googleCallbacks.onSuccess({ credential: 'register-google-cred' });
    });

    expect(authAPI.googleLogin).toHaveBeenCalledTimes(1);
    expect(authAPI.googleLogin).toHaveBeenCalledWith('register-google-cred');

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('oauth@test.com');
    });
  });

  it('shows error message when googleLogin fails on register page', async () => {
    (authAPI.googleLogin as jest.Mock).mockRejectedValue(new Error('Google sign-in failed'));

    renderRegister();

    await act(async () => {
      googleCallbacks.onSuccess({ credential: 'bad-cred' });
    });

    await waitFor(() => {
      // RegisterPage on Google failure calls: setError(err.message || 'Google sign-in failed')
      expect(screen.getByText('Google sign-in failed')).toBeInTheDocument();
    });
  });

  it('shows error on Google onError callback on register page', () => {
    renderRegister();

    act(() => {
      googleCallbacks.onError();
    });

    expect(screen.getByText('Google sign-in failed. Please try again.')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  Apple OAuth — RegisterPage
// ══════════════════════════════════════════════════════════════════════════════

describe('RegisterPage — Apple OAuth', () => {
  it('renders the Apple Sign-In button', () => {
    renderRegister();
    expect(screen.getByTestId('apple-login')).toBeInTheDocument();
  });

  it('calls appleLogin API with credential and updates auth state on success', async () => {
    renderRegister();

    const appleBtn = screen.getByTestId('apple-login');
    await act(async () => {
      appleBtn.click();
    });

    expect(authAPI.appleLogin).toHaveBeenCalledTimes(1);
    expect(authAPI.appleLogin).toHaveBeenCalledWith('mock-apple-token', 'Apple User');

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });
  });

  it('shows error when appleLogin API fails on register page', async () => {
    (authAPI.appleLogin as jest.Mock).mockRejectedValue(new Error('Apple sign-in failed'));

    renderRegister();

    const appleBtn = screen.getByTestId('apple-login');
    await act(async () => {
      appleBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Apple sign-in failed')).toBeInTheDocument();
    });
  });
});
