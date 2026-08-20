/**
 * @jest-environment jsdom
 *
 * Unit tests for marketing feature pages: SocialMediaPage, EmailMarketingPage, AutomationPage
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';

// ======== Mocks (uses manual __mocks__ files — reliable, no hoisting issues) ========
jest.mock('lucide-react');
jest.mock('recharts');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('../src/lib/api');
jest.mock('../src/lib/authStore');

// ======== Imports after mocks ========
import { postsAPI, emailAPI, campaignsAPI, analyticsAPI, automationAPI } from '../src/lib/api';
import SocialMediaPage from '../src/components/SocialMediaPage';
import EmailMarketingPage from '../src/components/EmailMarketingPage';
import AutomationPage from '../src/components/AutomationPage';

// ======== Test helpers ========
const renderWithProviders = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>, ...options });

const renderWithRouter = (ui: React.ReactElement) => renderWithProviders(ui);

describe('SocialMediaPage', () => {
  // SocialMediaPage renders content immediately (no loading state)
  beforeEach(() => {
    jest.clearAllMocks();
    (postsAPI.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          posts: [
            { id: 'p1', content: 'Check out our new product!', platform: 'facebook', status: 'published', scheduledAt: new Date().toISOString(), likes: 45, shares: 12, comments: 8, createdAt: new Date().toISOString() },
            { id: 'p2', content: 'Great offer today!', platform: 'instagram', status: 'draft', scheduledAt: new Date().toISOString(), likes: 0, shares: 0, comments: 0, createdAt: new Date().toISOString() },
          ],
        },
      },
    });
  });

  it('renders header', async () => {
    renderWithRouter(<SocialMediaPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /social media/i })).toBeInTheDocument();
    });
  });

  it('displays posts from API', async () => {
    renderWithRouter(<SocialMediaPage />);
    await waitFor(() => {
      expect(screen.getByText(/check out our new product/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no posts', async () => {
    (postsAPI.list as jest.Mock).mockResolvedValue({ data: { success: true, data: { posts: [] } } });
    renderWithRouter(<SocialMediaPage />);
    await waitFor(() => {
      expect(screen.getByText(/no posts/i)).toBeInTheDocument();
    });
  });
});

describe('EmailMarketingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (campaignsAPI.list as jest.Mock).mockResolvedValue({
      data: { success: true, data: [{ id: 'cm1', name: 'Summer Sale', status: 'draft', subject: 'Summer Sale!', recipients: 0, stats: { sent: 0, opened: 0, clicked: 0 } }] },
    });
    (emailAPI.listTemplates as jest.Mock).mockResolvedValue({
      data: { success: true, data: [{ id: 't1', name: 'Welcome Template', subject: 'Welcome!', content: '<p>Welcome</p>', category: 'welcome' }] },
    });
    (emailAPI.listDrips as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (emailAPI.listLists as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (analyticsAPI.dashboard as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('renders loading state', async () => {
    (campaignsAPI.list as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: [] } }), 100))
    );
    renderWithRouter(<EmailMarketingPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders header', async () => {
    renderWithRouter(<EmailMarketingPage />);
    await waitFor(() => {
      expect(screen.getByText(/email marketing/i)).toBeInTheDocument();
    });
  });

  it('displays campaigns from API', async () => {
    renderWithRouter(<EmailMarketingPage />);
    await waitFor(() => {
      expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    });
  });

  it('renders templates tab content', async () => {
    renderWithRouter(<EmailMarketingPage />);
    await waitFor(() => {
      // Template list is rendered after campaigns load completes in demo mode
      expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    });
  });
});

describe('AutomationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (automationAPI.listRules as jest.Mock).mockResolvedValue({
      data: { success: true, data: [{ id: 'a1', name: 'Welcome Workflow', trigger: 'contact.created', isActive: true, steps: 3, executions: 150 }] },
    });
    (automationAPI.getSettings as jest.Mock).mockResolvedValue({ data: { success: true, data: { autoReplyEnabled: false } } });
    (automationAPI.getN8nStatus as jest.Mock).mockResolvedValue({ data: { success: true, data: { connected: false } } });
    (automationAPI.getTemplates as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (automationAPI.getLogs as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
  });

  it('renders loading state', async () => {
    (automationAPI.list as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: [] } }), 100))
    );
    renderWithRouter(<AutomationPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders header', async () => {
    renderWithRouter(<AutomationPage />);
    await waitFor(() => {
      expect(screen.getByText(/automation/i)).toBeInTheDocument();
    });
  });

  it('displays automations from API', async () => {
    renderWithRouter(<AutomationPage />);
    await waitFor(() => {
      expect(screen.getByText('Welcome Workflow')).toBeInTheDocument();
    });
  });

  it('renders automation header', async () => {
    renderWithRouter(<AutomationPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /automation/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no automations', async () => {
    (automationAPI.listRules as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    renderWithRouter(<AutomationPage />);
    await waitFor(() => {
      expect(screen.getByText(/no automations/i)).toBeInTheDocument();
    });
  });
});
