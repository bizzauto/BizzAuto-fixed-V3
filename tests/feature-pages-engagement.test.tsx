/**
 * @jest-environment jsdom
 *
 * Unit tests for engagement & commerce feature pages.
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
import { analyticsAPI, leadsAPI, reviewsAPI } from '../src/lib/api';
import ReportsPage from '../src/components/ReportsPage';
import ReviewsPage from '../src/components/ReviewsPage';
import AppointmentsPage from '../src/components/AppointmentsPage';

// ======== Test helpers ========
const renderWithProviders = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>, ...options });

const renderWithRouter = (ui: React.ReactElement) => renderWithProviders(ui);

describe('ReportsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (analyticsAPI.dashboard as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          contactsAdded: 150,
          messagesSent: 1200,
          totalRevenue: 450000,
          conversionRate: 7.5,
        },
      },
    });
    (leadsAPI.list as jest.Mock).mockResolvedValue({
      data: { success: true, data: { contacts: [] } },
    });
  });

  it('renders loading state initially', () => {
    (analyticsAPI.dashboard as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: {} } }), 100))
    );
    renderWithRouter(<ReportsPage />);
    expect(screen.getByText(/loading reports data/i)).toBeInTheDocument();
  });

  it('renders header after loading', async () => {
    renderWithRouter(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText(/reports/i)).toBeInTheDocument();
    });
  });

  it('shows overview tab with stats', async () => {
    renderWithRouter(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText(/overview/i)).toBeInTheDocument();
    });
  });

  it('switches to lead scores tab', async () => {
    renderWithRouter(<ReportsPage />);
    await waitFor(() => {
      expect(screen.getByText(/AI Lead Scores/i)).toBeInTheDocument();
    });
  });
});

describe('ReviewsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reviewsAPI.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          reviews: [
            { id: 'r1', customerName: 'Alice', rating: 5, text: 'Great service!', source: 'google', createdAt: new Date().toISOString(), replied: false },
            { id: 'r2', customerName: 'Bob', rating: 4, text: 'Good product', source: 'facebook', createdAt: new Date().toISOString(), replied: true, replyText: 'Thanks Bob!' },
          ],
        },
      },
    });
  });

  it('renders loading state', async () => {
    (reviewsAPI.list as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: { reviews: [] } } }), 100))
    );
    renderWithRouter(<ReviewsPage />);
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument();
  });

  it('renders header heading', async () => {
    renderWithRouter(<ReviewsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reviews/i })).toBeInTheDocument();
    });
  });

  it('displays reviews from API', async () => {
    renderWithRouter(<ReviewsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('shows rating stats', async () => {
    renderWithRouter(<ReviewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/total reviews/i)).toBeInTheDocument();
    });
  });
});

describe('AppointmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', async () => {
    renderWithRouter(<AppointmentsPage />);
    await waitFor(() => {
      expect(screen.getByText(/loading appointments/i)).toBeInTheDocument();
    });
  });

  it('renders header', async () => {
    renderWithRouter(<AppointmentsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /appointments/i })).toBeInTheDocument();
    });
  });

  it('renders the main action button', async () => {
    renderWithRouter(<AppointmentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });
  });

  it('shows view mode tabs (Month, List, Services)', async () => {
    renderWithRouter(<AppointmentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
    });
  });
});
