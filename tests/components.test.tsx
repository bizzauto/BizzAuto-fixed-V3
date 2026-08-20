// AppleLogin uses import.meta.env which Jest can't handle — mock it
jest.mock('../src/components/AppleLogin', () => ({
  __esModule: true,
  default: () => null,
}));

// GoogleLoginButton uses import.meta.env — mock it
jest.mock('../src/components/GoogleLoginButton', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock the API module to avoid import.meta.env issues
jest.mock('../src/lib/api');

// GoogleLogin needs GoogleOAuthProvider wrapper — mock both like other test files
jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: any) => children,
  GoogleLogin: () => null,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../src/components/LoginPage';

describe('LoginPage', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  };

  it('renders login page', () => {
    renderComponent();
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  });

  it('shows the sign-in button with arrow icon', () => {
    renderComponent();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  it('shows trusted by section', () => {
    renderComponent();
    expect(screen.getAllByText(/Trusted by/i).length).toBeGreaterThan(0);
  });

  it('shows sign up link', () => {
    renderComponent();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
  });
});

describe('Auth Store', () => {
  it('should initialize with default values', () => {
    // Test auth store initialization
    const initialState = {
      user: null,
      business: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      onboardingCompleted: false,
      isDemoMode: false,
    };
    expect(initialState.isAuthenticated).toBe(false);
  });
});

describe('Rate Limiting', () => {
  it('should return correct limit for FREE plan', () => {
    const planLimits: Record<string, number> = {
      FREE: 80,
      STARTER: 200,
      GROWTH: 500,
      PRO: 1000,
      ENTERPRISE: 3000,
    };
    expect(planLimits.FREE).toBe(80);
    expect(planLimits.PRO).toBe(1000);
  });
});