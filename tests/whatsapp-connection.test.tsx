/**
 * @jest-environment jsdom
 *
 * Tests for WhatsAppModule connection status transitions:
 *   disconnected → scanning → connecting → connected
 *
 * Note: After successful connection, the component auto-switches
 * currentView back to 'chats'. To see the connected UI screen
 * (WhatsApp Connected!, phone number, Disconnect button), the user
 * must click the Connection nav tab again.
 */

import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';

// ======== Mocks ========
jest.mock('lucide-react');
jest.mock('recharts');
jest.mock('qrcode.react');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('../src/lib/api');

// ======== Imports after mocks ========
import apiClient, { whatsappAPI } from '../src/lib/api';
import WhatsAppModule from '../src/components/WhatsAppModule';

// ======== Test helpers ========
const renderWithRouter = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>, ...options });

/** Helper: navigate to the Connection view and wait for it to render */
async function navigateToConnectView() {
  fireEvent.click(screen.getByText('Connection'));
  await waitFor(() => {
    expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
  });
}

/** Helper: run through the full Meta QR connection sequence */
function connectViaMetaQR() {
  fireEvent.click(screen.getByText(/Simulate Scan/i));
}

describe('WhatsAppModule - Connection Status Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Stub all API calls the component makes on mount and during interaction
    (whatsappAPI.getTemplates as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.listBroadcasts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getContacts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getAutoReplies as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getConversations as jest.Mock).mockResolvedValue({ data: { success: true, data: { conversations: [] } } });

    // Mock whatsappAPI.connect() for Meta OAuth flow — returns signupUrl
    (whatsappAPI.connect as jest.Mock).mockResolvedValue({ data: { signupUrl: 'https://oauth.example.com/connect' } });

    // apiClient.get returns empty data (no Evolution API pre-configured)
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    // Mock whatsappAPI.getStatus to return disconnected (prevents leaks from other tests)
    (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: false } },
    });

    // apiClient.post returns success by default
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
  });

  // ── Initial state ──

  it('starts with disconnected status indicator', async () => {
    renderWithRouter(<WhatsAppModule />);

    await waitFor(() => {
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });
  });

  it('shows Connection tab in the navigation bar', async () => {
    renderWithRouter(<WhatsAppModule />);

    await waitFor(() => {
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });
  });

  // ── Navigate to Connection view ──

  it('navigates to QR connect view when Connection tab is clicked', async () => {
    renderWithRouter(<WhatsAppModule />);

    await waitFor(() => {
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Connection'));

    await waitFor(() => {
      expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Link your WhatsApp Business account to start messaging/i)
    ).toBeInTheDocument();
  });

  // ── disconnected ──

  it('shows Simulate Scan & Connect button when disconnected', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();

    expect(screen.getByText(/Simulate Scan/i)).toBeInTheDocument();
  });

  it('shows error when connection API fails', async () => {
    // Override connect mock to reject — simulates API failure
    (whatsappAPI.connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();

    fireEvent.click(screen.getByText(/Simulate Scan/i));

    // Error should be displayed from the catch block
    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });
  });

  it('can navigate between Connection and Chats views', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();

    // Switch to Chats view
    const chatsButtons = screen.getAllByText('Chats');
    const chatsNavButton = chatsButtons[0];
    fireEvent.click(chatsNavButton);

    await waitFor(() => {
      expect(screen.getByText(/BizzAuto Solutions WhatsApp/i)).toBeInTheDocument();
    });
  });

  it('shows disconnected status in nav bar', async () => {
    renderWithRouter(<WhatsAppModule />);

    await waitFor(() => {
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });

    // Connection tab still works
    fireEvent.click(screen.getByText('Connection'));
    await waitFor(() => {
      expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
    });
  });
});

// ========================================================
// Evolution API Connection Mode
// ========================================================

describe('WhatsAppModule - Evolution API Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Stub all API calls the component makes on mount and during interaction
    (whatsappAPI.getTemplates as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.listBroadcasts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getContacts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getAutoReplies as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
    (whatsappAPI.getConversations as jest.Mock).mockResolvedValue({ data: { success: true, data: { conversations: [] } } });

    // apiClient.get returns empty data (no Evolution API pre-configured)
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    // Mock whatsappAPI.getStatus to return disconnected (prevents leaks from other tests)
    (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
      data: { success: true, data: { connected: false } },
    });

    // apiClient.post returns QR code data for Evolution API connect endpoints
    (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
      if (url === '/evolution/connect') {
        return { data: { success: true, data: { qrCodeBase64: 'data:image/png;base64,testqrcodedata', status: 'scanning' } } };
      }
      if (url === '/evolution/instance') {
        return { data: { success: true } };
      }
      return { data: { success: true, data: {} } };
    });
  });

  it('shows Evolution API tab alongside Meta Official API in connection view', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();

    // Both mode selector tabs must be present
    expect(screen.getByText('Meta Official API')).toBeInTheDocument();
    expect(screen.getByText('Evolution API')).toBeInTheDocument();
  });

  it('switches to Evolution API view when Evolution tab is clicked', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();

    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
    });
    // Evolution API info box must be visible (unique to Evolution mode)
    expect(screen.getByText(/What is Evolution API\?/i)).toBeInTheDocument();
    // 'How to connect' instructions must NOT appear (Meta-only content)
    expect(screen.queryByText(/How to connect/i)).not.toBeInTheDocument();
  });

  it('shows Configure Evolution API button when not yet configured', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();
    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
    });

    // Meta QR instructions must not be visible in Evolution mode
    expect(screen.queryByText(/How to connect/i)).not.toBeInTheDocument();
  });

  it('opens configuration form with all input fields when Configure button clicked', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();
    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Configure Evolution API'));

    await waitFor(() => {
      expect(screen.getByText('Evolution API Configuration')).toBeInTheDocument();
    });

    // All three form fields must be present
    expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your Evolution API key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Auto-generated if empty')).toBeInTheDocument();

    // Save button must be present
    expect(screen.getByText(/Save Configuration/i)).toBeInTheDocument();
  });

  it('saves configuration and shows configured badge with Connect button', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();
    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Configure Evolution API'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
      target: { value: 'https://evolution.example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
      target: { value: 'sk-test-key-12345' },
    });

    // Save
    fireEvent.click(screen.getByText(/Save Configuration/i));

    await waitFor(() => {
      expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
    });
    // The base URL must appear in the configured badge
    expect(screen.getByText(/https:\/\/evolution\.example\.com/)).toBeInTheDocument();
    // Connect button must appear
    expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();
    // Update Configuration link must appear
    expect(screen.getByText('Update Configuration')).toBeInTheDocument();
  });

  it('connects via Evolution API and transitions to scanning state', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();
    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Configure Evolution API'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument();
    });

    // Configure
    fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
      target: { value: 'https://evolution.example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
      target: { value: 'sk-test-key' },
    });
    fireEvent.click(screen.getByText(/Save Configuration/i));

    await waitFor(() => {
      expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();
    });

    // Click Connect — triggers handleEvolutionConnect → apiClient.post('/evolution/connect', ...)
    fireEvent.click(screen.getByText('Connect & Get QR Code'));

    // After the async call resolves, connectionStatus becomes 'scanning'     // Verify the component shows scanning UI (QR code display) instead of badge
    await waitFor(() => {
      expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument();
    });

    // The nav bar should still show Disconnected (scanning is not connected)
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
  });

  it('switches back to Meta Official API view from Evolution mode', async () => {
    renderWithRouter(<WhatsAppModule />);
    await navigateToConnectView();
    fireEvent.click(screen.getByText('Evolution API'));

    await waitFor(() => {
      expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
    });

    // Switch back to Meta
    fireEvent.click(screen.getByText('Meta Official API'));

    await waitFor(() => {
      // Meta QR instructions must be visible again
      expect(screen.getByText(/Link your WhatsApp Business account/i)).toBeInTheDocument();
    });
    // Simulate Scan button must be back
    expect(screen.getByText(/Simulate Scan/i)).toBeInTheDocument();
  });

  // ========================================================
  // Mode Switching - Stale State Tests
  // ========================================================

  describe('Mode Switching - Stale State Prevention', () => {
    /**
     * Tests that switching between Meta and Evolution modes doesn't
     * leak stale UI elements, and each mode's state is properly
     * preserved or isolated when toggling.
     *
     * Key behaviors:
     * - Evolution config persists in parent state (never cleared on mode switch)
     * - Meta-specific elements (Simulate Scan, Refresh QR Code, QR code)
     *   are only visible in Meta mode
     * - Evolution-specific elements (Configured badge, Connect & Get QR Code,
     *   What is Evolution API?) are only visible in Evolution mode
     * - The QRConnectView local state (showEvolutionForm) persists because
     *   the component stays mounted across mode switches
     */

    it('Evolution API config is preserved when switching to Meta and back', async () => {
      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // ── Configure Evolution API ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Configure Evolution API'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));

      await waitFor(() => {
        expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
      });

      // ── Switch to Meta mode ──
      fireEvent.click(screen.getByText('Meta Official API'));
      await waitFor(() => {
        expect(screen.getByText(/Link your WhatsApp Business account/i)).toBeInTheDocument();
      });

      // Evolution-specific elements must NOT be visible in Meta mode
      expect(screen.queryByText('Evolution API Configured')).not.toBeInTheDocument();
      expect(screen.queryByText(/What is Evolution API\?/i)).not.toBeInTheDocument();

      // Meta-specific elements must be visible
      expect(screen.getByText(/Simulate Scan/i)).toBeInTheDocument();
      expect(screen.getByText(/How to connect/i)).toBeInTheDocument();

      // ── Switch back to Evolution mode ──
      fireEvent.click(screen.getByText('Evolution API'));

      // Evolution config must still be preserved
      await waitFor(() => {
        expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
      });
      expect(screen.getByText(/https:\/\/evo\.example\.com/)).toBeInTheDocument();
      expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();

      // Meta-specific elements must NOT be visible
      expect(screen.queryByText(/Simulate Scan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/How to connect/i)).not.toBeInTheDocument();
    });

    it('Evolution config form state persists when switching to Meta and back', async () => {
      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // ── Enter Evolution mode and open config form ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
      });

      // Open the form
      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() => {
        expect(screen.getByText('Evolution API Configuration')).toBeInTheDocument();
      });
      // Fill in a field so we can verify form state persists
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://persist-test.com' },
      });

      // ── Switch to Meta mode ──
      fireEvent.click(screen.getByText('Meta Official API'));
      await waitFor(() => {
        expect(screen.getByText(/Link your WhatsApp Business account/i)).toBeInTheDocument();
      });

      // Evolution form fields must NOT be visible in Meta mode
      expect(screen.queryByText('Evolution API Configuration')).not.toBeInTheDocument();

      // ── Switch back to Evolution mode ──
      fireEvent.click(screen.getByText('Evolution API'));

      // The form should still be open (React state persists in mounted component)
      await waitFor(() => {
        expect(screen.getByText('Evolution API Configuration')).toBeInTheDocument();
      });
      // The input value should still be preserved
      expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toHaveValue('https://persist-test.com');
    });

    it('connected screen is mode-agnostic and no mode-specific elements leak through', async () => {
      // Mock getStatus to return connected so the mount-time check sets connected state
      (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
        data: { success: true, data: { connected: true, phoneNumber: '+91 8983027975' } },
      });

      renderWithRouter(<WhatsAppModule />);

      // Nav shows Connected
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Navigate to Connection tab to see connected screen
      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });

      // Connected screen elements
      expect(screen.getByText(/Disconnect WhatsApp/)).toBeInTheDocument();

      // Mode-specific elements must NOT appear in the connected screen
      expect(screen.queryByText(/Evolution API/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Simulate Scan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/How to connect/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Connect & Get QR Code/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Refresh QR Code')).not.toBeInTheDocument();
    });

    it('does not show Evolution-specific elements when switching to Meta mode after configuration', async () => {
      // Even after configuring Evolution, Meta mode must show only Meta content
      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // ── Configure Evolution ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument();
      });
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => {
        expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
      });

      // ── Switch to Meta ──
      fireEvent.click(screen.getByText('Meta Official API'));
      await waitFor(() => {
        expect(screen.getByText(/Link your WhatsApp Business account/i)).toBeInTheDocument();
      });

      // Evolution-specific content must not leak into Meta mode
      expect(screen.queryByText('Evolution API Configured')).not.toBeInTheDocument();
      expect(screen.queryByText(/What is Evolution API\?/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Connect & Get QR Code')).not.toBeInTheDocument();

      // Meta content must show
      expect(screen.getByText(/Simulate Scan/i)).toBeInTheDocument();
      expect(screen.getByText('Refresh QR Code')).toBeInTheDocument();
      expect(screen.getByText(/How to connect/i)).toBeInTheDocument();
    });

    it('does not show Meta-specific elements when switching back to Evolution mode', async () => {
      // After switching from Evolution to Meta and back to Evolution,
      // Meta-specific elements must not be visible
      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // ── Switch to Evolution mode ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
      });

      // ── Switch to Meta mode ──
      fireEvent.click(screen.getByText('Meta Official API'));
      await waitFor(() => {
        expect(screen.getByText(/Link your WhatsApp Business account/i)).toBeInTheDocument();
      });

      // ── Switch back to Evolution mode ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument();
      });

      // Meta elements must NOT leak into Evolution mode
      expect(screen.queryByText(/Simulate Scan/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/How to connect/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Refresh QR Code')).not.toBeInTheDocument();

      // Evolution content must show
      expect(screen.getByText('Configure Evolution API')).toBeInTheDocument();
    });
  });

  // ========================================================
  // Evolution API - Disconnect Flow
  // ========================================================

  describe('Evolution API - Disconnect Flow', () => {
    /**
     * Evolution API disconnect flow (connected → disconnected).
     *
     * The Evolution API only transitions to 'connected' via the mount-time
     * status check (getStatus returning 'open'). There is no automatic
     * scanning→connected transition like Meta QR mode.
     *
     * Key behavior: connectionMode defaults to 'meta'. The mount-time
     * Evolution auto-connect sets connectionStatus='connected' and
     * isEvolutionConnected=true but does NOT change connectionMode.
     * The connected screen is mode-agnostic (same for both modes).
     * After disconnect, the connect view shows in the current
     * connectionMode (usually 'meta') — to verify Evolution-specific
     * state, the tests switch to 'evolution' mode after disconnecting.
     */

    let statusCallCount = 0;

    beforeEach(() => {
      statusCallCount = 0;

      // Override apiClient.get to return Evolution configured config + connected status
      const mockGet = apiClient.get as jest.Mock;
      mockGet.mockReset();
      mockGet.mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/config') {
          return {
            data: {
              baseUrl: 'https://evo.test.com',
              apiKey: 'sk-test',
              instanceName: 'test-instance',
            },
          };
        }
        if (typeof url === 'string' && url.includes('/evolution/status')) {
          statusCallCount++;
          // First call = mount-time check → return 'connected' for auto-connect
          // Subsequent calls = polling → return 'close' so scanning→connected doesn't auto-trigger
          if (statusCallCount === 1) {
            return { data: { data: { status: 'connected' } } };
          }
          return { data: { data: { status: 'close' } } };
        }
        return { data: { success: true, data: {} } };
      });

      // apiClient.post returns QR code data for Evolution API connect endpoints
      (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/connect') {
          return { data: { success: true, data: { qrCodeBase64: 'data:image/png;base64,testqrcodedata', status: 'scanning' } } };
        }
        if (url === '/evolution/instance') {
          return { data: { success: true } };
        }
        return { data: { success: true, data: {} } };
      });
    });

    afterEach(() => {
      // Restore default mock so other tests aren't affected
      const mockFn = apiClient.get as jest.Mock;
      mockFn.mockReset();
      mockFn.mockResolvedValue({ data: { success: true, data: {} } });
    });

    it('shows connected state on mount when Evolution API is pre-configured and connected', async () => {
      renderWithRouter(<WhatsAppModule />);

      // Wait for the mount-time getConfig/getStatus to resolve
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Navigate to Connection tab to see the connected screen
      fireEvent.click(screen.getByText('Connection'));

      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });
      // Disconnect button must be present
      expect(screen.getByText(/Disconnect WhatsApp/)).toBeInTheDocument();
      // Connected UI stats must be visible
      expect(screen.getByText(/To Send Messages/)).toBeInTheDocument();
      expect(screen.getByText(/All Systems Go/)).toBeInTheDocument();
    });

    it('disconnects and returns to connect view with Evolution state preserved', async () => {
      renderWithRouter(<WhatsAppModule />);

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Navigate to Connection tab to see connected screen
      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });

      // Click Disconnect (mode is 'meta', so disconnect skips Evolution API call but resets state)
      fireEvent.click(screen.getByText(/Disconnect WhatsApp/i));

      // Should show the connect view in Meta mode (since connectionMode defaults to 'meta')
      await waitFor(() => {
        expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
      });

      // Switch to Evolution mode to verify Evolution state is preserved
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        // Evolution API Configured badge must still show (config is independent of connection)
        expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
      });
      // Connect & Get QR Code button must be available
      expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();
    });

    it('shows Disconnected status in nav bar after Evolution API disconnect', async () => {
      renderWithRouter(<WhatsAppModule />);

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });

      // Disconnect
      fireEvent.click(screen.getByText(/Disconnect WhatsApp/i));

      // Nav bar must show Disconnected (mode-agnostic)
      await waitFor(() => {
        expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
      });
    });

    it('does not call disconnect API when mode is meta (default) during disconnect', async () => {
      // When connectionMode is 'meta' (the default), the disconnect handler
      // skips the evolutionAPI.disconnectInstance call. Only state is reset.
      renderWithRouter(<WhatsAppModule />);

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });

      // Clear call history before disconnecting
      (apiClient.get as jest.Mock).mockClear();

      fireEvent.click(screen.getByText(/Disconnect WhatsApp/i));

      await waitFor(() => {
        expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
      });

      // The disconnect API should NOT have been called (mode is 'meta')
      expect(apiClient.get).not.toHaveBeenCalledWith('/evolution/disconnect', expect.anything());
    });

    it('allows reconnection via Connect & Get QR Code after disconnecting', async () => {
      renderWithRouter(<WhatsAppModule />);

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });

      // Disconnect
      fireEvent.click(screen.getByText(/Disconnect WhatsApp/i));
      await waitFor(() => {
        expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
      });

      // Switch to Evolution mode to see Evolution connect options
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => {
        expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();
      });

      // Reconnect
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      // Should transition to scanning state (QR code displayed)
      await waitFor(() => {
        expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument();
      });
      // Nav should still show Disconnected (scanning !== connected)
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
    });
  });

  // ========================================================
  // Evolution API - Scanning to Connected Transition
  // ========================================================

  describe('Evolution API - Scanning to Connected Transition', () => {
    /**
     * Evolution API scanning → connected transition tests.
     *
     * Unlike Meta QR mode (which auto-transitions scanning → connecting → connected
     * via timers at 2s and 4s), the Evolution API connection flow only sets
     * connectionStatus to 'scanning' and waits for an external event (webhook,
     * socket, or page refresh) to detect the connected state.
     *
     * The only mechanism that transitions scanning → connected is the mount-time
     * useEffect which checks /evolution/config → /evolution/status. If status
     * returns state: 'open', it sets isEvolutionConnected(true) and
     * connectionStatus('connected').
     *
     * These tests verify:
     * 1. Evolution scanning does NOT auto-connect (unlike Meta mode)
     * 2. Scanning → connected via re-mount with state='open'
     * 3. Scanning persists when switching view tabs
     * 4. Error during Evolution connect shows error message
     */

    beforeEach(() => {
      jest.clearAllMocks();

      // apiClient.get returns empty data (no Evolution API pre-configured)
      const apiGet = apiClient.get as jest.Mock;
      apiGet.mockReset();
      apiGet.mockResolvedValue({ data: { success: true, data: {} } });

      const apiPost = apiClient.post as jest.Mock;
      apiPost.mockReset();
      apiPost.mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/connect') {
          return { data: { success: true, data: { qrCodeBase64: 'data:image/png;base64,testqrcodedata', status: 'scanning' } } };
        }
        if (url === '/evolution/instance') {
          return { data: { success: true } };
        }
        return { data: { success: true, data: {} } };
      });

      (whatsappAPI.getTemplates as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
      (whatsappAPI.listBroadcasts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
      (whatsappAPI.getContacts as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
      (whatsappAPI.getAutoReplies as jest.Mock).mockResolvedValue({ data: { success: true, data: [] } });
      (whatsappAPI.getConversations as jest.Mock).mockResolvedValue({ data: { success: true, data: { conversations: [] } } });

      // Mock whatsappAPI.getStatus to return disconnected (prevents leaks from other tests)
      (whatsappAPI.getStatus as jest.Mock).mockResolvedValue({
        data: { success: true, data: { connected: false } },
      });
    });

    it('does NOT auto-transition to connected after scanning (unlike Meta mode)', async () => {
      // Evolution mode: after Connect & Get QR Code, connectionStatus stays 'scanning'
      // with NO auto-transition timers (unlike the old Meta QR mode).

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // ── Configure Evolution API ──
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );

      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));

      await waitFor(() => {
        expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();
      });

      // ── Connect → scanning ──
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      await waitFor(() => {
        expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument();
      });

      // Verify: still Disconnected (scanning !== connected)
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Evolution stays Disconnected — no auto-transition to connected
      expect(screen.queryByText(/WhatsApp Connected/i)).not.toBeInTheDocument();

      // Verify there is no "Connecting..." overlay (Evolution never enters 'connecting' state)
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();

      // The Evolution mode scanning UI should still be showing (QR code displayed)
      expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument();
    });

    it('transitions scanning → connected when re-mounted with state=open from status check', async () => {
      // Simulates what happens after a page refresh or when external polling
      // detects that the Evolution API instance is now connected.
      //
      // Scenario:
      //   1. First mount: Evolution config exists but status returns 'close'
      //   2. Configure → Connect → scanning state
      //   3. External event changes server state → 'open'
      //   4. Unmount + remount with status='open' → connected detects it

      // ── First render: status returns 'close' (not connected yet) ──
      const firstRenderMock = jest.fn().mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/config') {
          return {
            data: { baseUrl: 'https://evo.test.com', apiKey: 'sk-test', instanceName: 'test-instance' },
          };
        }
        if (typeof url === 'string' && url.includes('/evolution/status')) {
          return { data: { data: { status: 'close' } } }; // Not connected yet
        }
        return { data: { success: true, data: {} } };
      });
      (apiClient.get as jest.Mock).mockImplementation(firstRenderMock);

      const { unmount } = renderWithRouter(<WhatsAppModule />);

      // Wait for mount to settle — should show Disconnected (status is 'close')
      await waitFor(() => {
        expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
      });

      // Navigate to Connection, switch to Evolution — should show configured badge
      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument());

      // Connect → scanning
      fireEvent.click(screen.getByText('Connect & Get QR Code'));
      await waitFor(() => expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument());
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // ── Simulate external event: server now reports state=open ──
      unmount();

      // Reset mock and set up to return 'open' on next mount
      const secondRenderMock = jest.fn().mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/config') {
          return {
            data: { baseUrl: 'https://evo.test.com', apiKey: 'sk-test', instanceName: 'test-instance' },
          };
        }
        if (typeof url === 'string' && url.includes('/evolution/status')) {
          return { data: { data: { status: 'connected' } } }; // Now connected!
        }
        return { data: { success: true, data: {} } };
      });
      (apiClient.get as jest.Mock).mockReset();
      (apiClient.get as jest.Mock).mockImplementation(secondRenderMock);

      renderWithRouter(<WhatsAppModule />);

      // Mount-time check should detect 'open' and auto-connect
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      // Navigate to Connection tab to verify full connected UI
      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText(/WhatsApp Connected/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Disconnect WhatsApp/)).toBeInTheDocument();
      expect(screen.getByText(/Ready/)).toBeInTheDocument();
    });

    it('preserves scanning state when switching between Connection and Chats views', async () => {
      // After clicking Connect in Evolution mode, the component enters scanning
      // state. Switching away from the Connection tab and back should preserve
      // the scanning state (no regression to disconnected).

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // Configure Evolution API
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => expect(screen.getByText('Evolution API Configured')).toBeInTheDocument());

      // Connect → scanning
      fireEvent.click(screen.getByText('Connect & Get QR Code'));
      await waitFor(() => expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument());
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // ── Switch to Chats view ──
      fireEvent.click(screen.getByText('Chats'));
      await waitFor(() => {
        expect(screen.getByText(/BizzAuto Solutions WhatsApp/i)).toBeInTheDocument();
      });

      // Nav should still show Disconnected
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // ── Switch back to Connection view ──
      fireEvent.click(screen.getByText('Connection'));
      await waitFor(() => {
        expect(screen.getByText('Connect WhatsApp')).toBeInTheDocument();
      });

      // Evolution scanning state should still be preserved (component not recreated)
      fireEvent.click(screen.getByRole('button', { name: /Evolution API/i }));
      await waitFor(() => {
        expect(screen.getByText(/Scan this QR code with WhatsApp/i)).toBeInTheDocument();
      });

      // Nav should still show Disconnected — scanning state preserved
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Refresh QR Code button should be available in scanning state
      expect(screen.getByText(/Refresh QR Code/i)).toBeInTheDocument();
    });

    it('shows error message when Evolution API connect fails', async () => {
      // When the Evolution API instance creation or connect call fails,
      // an error message should be displayed instead of entering scanning state.

      // Override apiClient.post to reject on Evolution connect endpoints
      (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/instance' || url === '/evolution/connect') {
          throw new Error('Evolution API instance not reachable');
        }
        return { data: { success: true, data: {} } };
      });

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // Configure Evolution API
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => expect(screen.getByText('Evolution API Configured')).toBeInTheDocument());

      // Click Connect — will fail
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/Evolution API instance not reachable/i)).toBeInTheDocument();
      });

      // The component should NOT be in scanning state — nav still shows Disconnected
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Evolution config should still be preserved (error doesn't clear config)
      expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();

      // Restore mock
      (apiClient.post as jest.Mock).mockReset();
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    });

    it('shows network error message when Evolution API URL is invalid/unreachable', async () => {
      // When the base URL is incorrect or the server is not reachable,
      // the apiClient.post call fails with a network-level error.

      // Override apiClient.post to reject with network error for Evolution endpoints
      (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/instance' || url === '/evolution/connect') {
          throw new Error('Network error: Failed to connect to Evolution API server at https://invalid.example.com');
        }
        return { data: { success: true, data: {} } };
      });

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // Configure Evolution API with an invalid URL
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://invalid.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => expect(screen.getByText('Evolution API Configured')).toBeInTheDocument());

      // Click Connect — will fail with network error
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      // The network error message should appear in the error banner
      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to Evolution API server/i)).toBeInTheDocument();
      });

      // Component should NOT be in scanning state
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Evolution config should still be preserved
      expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();

      // The configured badge and error banner both show the URL — verify it appears
      expect(screen.getAllByText(/invalid\.example\.com/).length).toBeGreaterThanOrEqual(1);

      // User should still be able to update configuration after error
      expect(screen.getByText('Update Configuration')).toBeInTheDocument();

      // Restore mock
      (apiClient.post as jest.Mock).mockReset();
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    });

    it('shows authentication error when Evolution API key is invalid', async () => {
      // When the API key is wrong or expired, the Evolution API returns
      // an authentication error (401 Unauthorized).

      // Override apiClient.post to reject with auth error for Evolution endpoints
      (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/instance' || url === '/evolution/connect') {
          throw new Error('Authentication failed: Invalid API key (401)');
        }
        return { data: { success: true, data: {} } };
      });

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // Configure Evolution API with a bad API key
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'invalid-key-12345' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => expect(screen.getByText('Evolution API Configured')).toBeInTheDocument());

      // Click Connect — will fail with auth error
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      // The authentication error message should appear
      await waitFor(() => {
        expect(screen.getByText(/Invalid API key \(401\)/i)).toBeInTheDocument();
      });

      // Component should NOT be in scanning state
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Evolution config should still be preserved
      expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();

      // User should be able to update config to fix their API key
      expect(screen.getByText('Update Configuration')).toBeInTheDocument();

      // Restore mock
      (apiClient.post as jest.Mock).mockReset();
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    });

    it('shows timeout error when Evolution API server does not respond', async () => {
      // When the Evolution API server is slow or unresponsive,
      // the request times out with a timeout error.

      // Override apiClient.post to reject with timeout error for Evolution endpoints
      (apiClient.post as jest.Mock).mockImplementation(async (url: string, ..._rest: any[]) => {
        if (url === '/evolution/instance' || url === '/evolution/connect') {
          throw new Error('Request timeout: Evolution API server took too long to respond');
        }
        return { data: { success: true, data: {} } };
      });

      renderWithRouter(<WhatsAppModule />);
      await navigateToConnectView();

      // Configure Evolution API
      fireEvent.click(screen.getByText('Evolution API'));
      await waitFor(() => expect(screen.getByText(/Connect via Evolution API/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText('Configure Evolution API'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('https://your-evolution-api.com')).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText('https://your-evolution-api.com'), {
        target: { value: 'https://evo.example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Your Evolution API key'), {
        target: { value: 'sk-test' },
      });
      fireEvent.click(screen.getByText(/Save Configuration/i));
      await waitFor(() => expect(screen.getByText('Evolution API Configured')).toBeInTheDocument());

      // Click Connect — will fail with timeout error
      fireEvent.click(screen.getByText('Connect & Get QR Code'));

      // The timeout error message should appear
      await waitFor(() => {
        expect(screen.getByText(/Request timeout/i)).toBeInTheDocument();
      });

      // Component should NOT be in scanning state
      expect(screen.getByText(/Disconnected/)).toBeInTheDocument();

      // Evolution config should still be preserved
      expect(screen.getByText('Evolution API Configured')).toBeInTheDocument();

      // User should be able to retry — connect button still present
      expect(screen.getByText('Connect & Get QR Code')).toBeInTheDocument();

      // Restore mock
      (apiClient.post as jest.Mock).mockReset();
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } });
    });
  });
});
