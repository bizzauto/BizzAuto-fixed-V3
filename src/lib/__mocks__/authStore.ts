// Manual mock for authStore
const mockState = {
  user: { id: '1', name: 'Test User', role: 'OWNER', email: 'test@example.com' },
  business: { id: 'b1', name: 'Test Business', type: 'general', plan: 'STARTER' },
  token: 'mock-token',
  isAuthenticated: true,
  isLoading: false,
  isInitialized: true,
  onboardingCompleted: true,
  isDemoMode: false,
};

const mockFn = jest.fn();

const useAuthStore = Object.assign(
  (selector?: any) => selector ? selector(mockState) : mockState,
  {
    getState: () => mockState,
    setState: mockFn,
    subscribe: mockFn,
    destroy: mockFn,
  }
);

module.exports = { useAuthStore };
