/**
 * @jest-environment jsdom
 *
 * Unit tests for OnboardingWizard — step progression, navigation routing,
 * and connection status display.
 *
 * These tests verify that:
 *   1. The step progression (Continue/Back) moves the user through all 4 steps
 *   2. Completing the wizard navigates to the correct routes
 *   3. Connection status (Checking… / Connected / Connect) displays correctly
 *   4. The onComplete callback fires when the wizard finishes
 */

// ────── State capture variables (assigned in jest.mock factories) ──────
let mockNavigate: jest.Mock;
let mockSetOnboardingCompleted: jest.Mock;

// ════════════════════════════════════════════════════════════════════════
//  Mock modules — jest.mock is hoisted, so these run before imports
// ════════════════════════════════════════════════════════════════════════

jest.mock('../src/lib/authStore', () => {
  mockSetOnboardingCompleted = jest.fn();
  const mockState = {
    user: { id: '1', name: 'Test User', role: 'OWNER', email: 'test@example.com' },
    business: { id: 'b1', name: 'Test Business', type: 'general', plan: 'STARTER' },
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    onboardingCompleted: false,
    isDemoMode: false,
    setOnboardingCompleted: mockSetOnboardingCompleted,
  };

  const useAuthStore = Object.assign(
    (selector?: any) => (typeof selector === 'function' ? selector(mockState) : mockState),
    {
      getState: () => mockState,
      setState: jest.fn(),
      subscribe: jest.fn(),
      destroy: jest.fn(),
    },
  );

  return { useAuthStore };
});

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  mockNavigate = jest.fn();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  const iconNames = [
    'Check', 'ArrowRight', 'ArrowLeft', 'Building2',
    'MessageSquare', 'Zap', 'Star', 'CheckCircle', 'RefreshCw',
    'Upload', 'Sparkles',
  ];
  const mock: Record<string, any> = {};
  for (const name of iconNames) {
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

// Custom API mock — includes getStatus / getCurrent methods not in the manual mock
jest.mock('../src/lib/api', () => ({
  whatsappAPI: { getStatus: jest.fn() },
  googleBusinessAPI: { getStatus: jest.fn() },
  subscriptionsAPI: { getCurrent: jest.fn() },
}));

// ════════════════════════════════════════════════════════════════════════
//  Imports (resolve after jest.mock hoisting)
// ════════════════════════════════════════════════════════════════════════

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { whatsappAPI, googleBusinessAPI, subscriptionsAPI } from '../src/lib/api';
import OnboardingWizard from '../src/components/OnboardingWizard';

// ════════════════════════════════════════════════════════════════════════
//  Test helpers
// ════════════════════════════════════════════════════════════════════════

const renderOnboarding = (onComplete?: () => void) =>
  render(
    <MemoryRouter>
      <OnboardingWizard onComplete={onComplete} />
    </MemoryRouter>,
  );

const clickContinue = () => fireEvent.click(screen.getByText(/^Continue$/));
const clickBack = () => fireEvent.click(screen.getByText(/^Back$/));
const clickManualSetup = () => fireEvent.click(screen.getByText(/✍️ Manual Setup/));

/**
 * Advance from step 0 through to step 3 (Connect tools), flushing async effects.
 */
const advanceToStep3 = async () => {
  renderOnboarding();
  clickContinue();
  await waitFor(() => {
    expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument();
  });
  clickManualSetup();
  await waitFor(() => {
    expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument();
  });
  clickContinue();
  await waitFor(() => {
    expect(screen.getByText(/Connect your tools/)).toBeInTheDocument();
  });
};

const advanceToStep4 = async () => {
  await advanceToStep3();
  clickContinue();
  await waitFor(() => {
    expect(screen.getByText(/You're all set!/)).toBeInTheDocument();
  });
};

// ════════════════════════════════════════════════════════════════════════
//  Setup / teardown
// ════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate?.mockClear();
  mockSetOnboardingCompleted?.mockClear();

  // Default: all services are disconnected
  (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
    data: { success: true, data: { connected: false } },
  });
  (googleBusinessAPI.getStatus as jest.Mock).mockResolvedValue({
    data: { success: true, data: { connected: false } },
  });
  (subscriptionsAPI.getCurrent as jest.Mock).mockResolvedValue({
    data: { success: true, data: { plan: 'FREE' } },
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Step progression
// ════════════════════════════════════════════════════════════════════════

describe('Step progression', () => {
  it('renders initial step 0 with Continue button, no Welcome text yet', () => {
    renderOnboarding();

    // Step 0 shows only the Continue button, no step content
    expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
    // Welcome text and choice buttons NOT yet visible
    expect(screen.queryByText(/Welcome to BizzAuto!/)).not.toBeInTheDocument();
  });

  it('Continue moves from step 0 → step 1 (Welcome with choice buttons)', async () => {
    renderOnboarding();
    clickContinue();
    // Step change is synchronous, but useEffect async calls may resolve after
    await waitFor(() => {
      expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Hey Test User/)).toBeInTheDocument();
    expect(screen.getByText(/⚡ Quick Setup/)).toBeInTheDocument();
    expect(screen.getByText(/✍️ Manual Setup/)).toBeInTheDocument();
  });

  it('Manual Setup moves from step 1 → step 2 (Business)', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => {
      expect(screen.getByText('Tell us about your business')).toBeInTheDocument();
    });
    expect(screen.getByText(/Back/)).toBeInTheDocument();
    expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
  });

  it('Back from step 2 returns to step 1 (setupMode=manual, no choice buttons)', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickBack();
    await waitFor(() => {
      expect(screen.getByText(/^Continue$/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Welcome to BizzAuto!/)).not.toBeInTheDocument();
  });

  it('Continue from step 2 → step 3 (Connect)', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => {
      expect(screen.getByText('Connect your tools')).toBeInTheDocument();
    });
  });

  it('Back from step 3 returns to step 2', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Connect your tools/)).toBeInTheDocument());
    clickBack();
    await waitFor(() => {
      expect(screen.getByText('Tell us about your business')).toBeInTheDocument();
    });
  });

  it('Continue from step 3 → step 4 (Done)', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Connect your tools/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => {
      expect(screen.getByText(/You're all set!/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Get Started/)).toBeInTheDocument();
  });

  it('Back from step 4 returns to step 3', async () => {
    renderOnboarding();
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Connect your tools/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/You're all set!/)).toBeInTheDocument());
    clickBack();
    await waitFor(() => {
      expect(screen.getByText('Connect your tools')).toBeInTheDocument();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Navigation routing on completion
// ════════════════════════════════════════════════════════════════════════

describe('Navigation routing', () => {
  it('Get Started navigates to /dashboard', async () => {
    await advanceToStep4();

    fireEvent.click(screen.getByText(/Get Started/));

    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('Connect (WhatsApp) navigates to /whatsapp', async () => {
    await advanceToStep3();

    // Wait for all API calls to settle so buttons appear (not "Checking...")
    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[0]); // WhatsApp is first in the tools array

    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/whatsapp');
  });

  it('Connect (Google Business) navigates to /google-business', async () => {
    await advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[1]); // Google Business is second

    expect(mockNavigate).toHaveBeenCalledWith('/google-business');
  });

  it('Connect (Google Sheets) navigates to /settings', async () => {
    await advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[2]); // Google Sheets is third

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('Connect (Razorpay) navigates to /settings', async () => {
    await advanceToStep3();

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[3]); // Razorpay is fourth

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});

// ════════════════════════════════════════════════════════════════════════
//  Connection status display
// ════════════════════════════════════════════════════════════════════════

describe('Connection status display', () => {
  it('shows "Checking…" while API calls are in flight', async () => {
    // Use never-resolving promises to keep the loading state
    (whatsappAPI.getStatus as jest.Mock).mockReturnValue(new Promise(() => {}));
    (googleBusinessAPI.getStatus as jest.Mock).mockReturnValue(new Promise(() => {}));
    (subscriptionsAPI.getCurrent as jest.Mock).mockReturnValue(new Promise(() => {}));

    await advanceToStep3();

    // Three tools have API-dependent status (WhatsApp, GBP, Razorpay) — should show "Checking…"
    await waitFor(() => {
      expect(screen.getAllByText(/Checking/).length).toBe(3);
    });
  });

  it('shows "Connected" badges when APIs report connected', async () => {
    (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: true } },
    });
    (googleBusinessAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: true } },
    });
    // PRO plan → Razorpay considered connected
    (subscriptionsAPI.getCurrent as jest.Mock).mockResolvedValue({
      data: { success: true, data: { plan: 'PRO' } },
    });

    await advanceToStep3();

    // WhatsApp, GBP, Razorpay → Connected; Google Sheets → always Connect button
    await waitFor(() => {
      expect(screen.getAllByText(/Connected/).length).toBe(3);
    });
    // Google Sheets should still show as Connect
    expect(screen.getAllByText('Connect').length).toBe(1);
  });

  it('shows "Connect" buttons when APIs return disconnected', async () => {
    // Default beforeEach already sets everything to disconnected
    await advanceToStep3();

    await waitFor(() => {
      // 4 Connect buttons for all tools
      expect(screen.getAllByText('Connect').length).toBe(4);
    });
  });

  it('shows "Connect" buttons when API calls fail', async () => {
    (whatsappAPI.getStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
    (googleBusinessAPI.getStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
    (subscriptionsAPI.getCurrent as jest.Mock).mockRejectedValue(new Error('Network error'));

    await advanceToStep3();

    await waitFor(() => {
      // All four should default to disconnected → "Connect"
      expect(screen.getAllByText('Connect').length).toBe(4);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
//  onComplete callback
// ════════════════════════════════════════════════════════════════════════

describe('onComplete callback', () => {
  it('calls onComplete when the user finishes the wizard', async () => {
    const onComplete = jest.fn();
    renderOnboarding(onComplete);

    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Connect your tools/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/You're all set!/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Get Started/));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when connecting a tool from step 3', async () => {
    const onComplete = jest.fn();
    renderOnboarding(onComplete);

    clickContinue();
    await waitFor(() => expect(screen.getByText(/Welcome to BizzAuto!/)).toBeInTheDocument());
    clickManualSetup();
    await waitFor(() => expect(screen.getByText(/Tell us about your business/)).toBeInTheDocument());
    clickContinue();
    await waitFor(() => expect(screen.getByText(/Connect your tools/)).toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThanOrEqual(3);
    });

    const connectBtns = screen.getAllByText('Connect');
    fireEvent.click(connectBtns[0]); // Connect WhatsApp

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});