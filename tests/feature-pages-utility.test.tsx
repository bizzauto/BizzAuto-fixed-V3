/**
 * @jest-environment jsdom
 *
 * Unit tests for utility feature pages: AIChatbotPage, DocumentsPage, BillingPage
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { aiAPI, documentsAPI, billingAPI, analyticsAPI } from '../src/lib/api';
import AIChatbotPage from '../src/components/AIChatbotPage';
import DocumentsPage from '../src/components/DocumentsPage';
import BillingPage from '../src/components/BillingPage';

// ======== Test helpers ========
const renderWithProviders = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>, ...options });

const renderWithRouter = (ui: React.ReactElement) => renderWithProviders(ui);

describe('AIChatbotPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chat interface heading', () => {
    renderWithRouter(<AIChatbotPage />);
    expect(screen.getByRole('heading', { name: /bizzauto ai assistant/i })).toBeInTheDocument();
  });

  it('shows initial greeting message', () => {
    renderWithRouter(<AIChatbotPage />);
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });

  it('shows suggested prompts', () => {
    renderWithRouter(<AIChatbotPage />);
    expect(screen.getByText('Marketing tips')).toBeInTheDocument();
    expect(screen.getByText('Poster ideas')).toBeInTheDocument();
  });

  it('has input field and send button', () => {
    renderWithRouter(<AIChatbotPage />);
    expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();
  });
});

describe('DocumentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (documentsAPI.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          documents: [
            { id: 'd1', documentNumber: 'Q-001', title: 'Website Design Quote', type: 'quote', contactName: 'Alice', amount: 50000, status: 'draft', createdAt: new Date().toISOString() },
            { id: 'd2', documentNumber: 'INV-001', title: 'Monthly Invoice', type: 'invoice', contactName: 'Bob', amount: 25000, status: 'sent', createdAt: new Date().toISOString() },
          ],
        },
      },
    });
  });

  it('renders loading state', async () => {
    (documentsAPI.list as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: { documents: [] } } }), 100))
    );
    renderWithRouter(<DocumentsPage />);
    expect(screen.getByText(/loading documents/i)).toBeInTheDocument();
  });

  it('renders header', async () => {
    renderWithRouter(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /documents/i })).toBeInTheDocument();
    });
  });

  it('displays documents from API', async () => {
    renderWithRouter(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText('Website Design Quote')).toBeInTheDocument();
      expect(screen.getByText('Monthly Invoice')).toBeInTheDocument();
    });
  });

  it('shows empty state when no documents', async () => {
    (documentsAPI.list as jest.Mock).mockResolvedValue({
      data: { success: true, data: { documents: [] } },
    });
    renderWithRouter(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    });
  });

  it('shows new document button', async () => {
    renderWithRouter(<DocumentsPage />);
    await waitFor(() => {
      expect(screen.getByText(/new document/i)).toBeInTheDocument();
    });
  });
});

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The component expects subscription to have plan as an object with name/price,
    // not a plain string. Match the component's expected data shape.
    (billingAPI.getCurrent as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          plan: { name: 'STARTER', price: '₹1,499' },
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'Active',
        },
      },
    });
    (billingAPI.getInvoices as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          invoices: [
            { id: 'INV-001', amount: '₹1,499', date: new Date().toISOString(), plan: 'STARTER', status: 'paid' },
          ],
        },
      },
    });
    (analyticsAPI.dashboard as jest.Mock).mockResolvedValue({
      data: { success: true, data: { stats: { contactsUsed: 50, contactsLimit: 1000 } } },
    });
  });

  it('renders loading state', () => {
    (billingAPI.getCurrent as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: {} } }), 100))
    );
    renderWithRouter(<BillingPage />);
    expect(screen.getByText(/loading billing/i)).toBeInTheDocument();
  });

  it('renders header', async () => {
    renderWithRouter(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /billing & subscription/i })).toBeInTheDocument();
    });
  });

  it('shows current plan info', async () => {
    renderWithRouter(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByText('STARTER')).toBeInTheDocument();
    });
  });

  it('shows invoice history', async () => {
    renderWithRouter(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
  });

  it('shows usage bars', async () => {
    renderWithRouter(<BillingPage />);
    await waitFor(() => {
      expect(screen.getByText(/contacts/i)).toBeInTheDocument();
    });
  });
});
