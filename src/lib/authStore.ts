import { create } from 'zustand';
import { authAPI } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  businessId: string;
  avatar?: string;
  image?: string;
  lastLogin?: string;
}

interface Business {
  id: string;
  name: string;
  type: string;
  city?: string;
  plan: string;
  aiCreditsUsed?: number;
  aiCreditsLimit?: number;
  contactsLimit?: number;
  messagesLimit?: number;
  usersLimit?: number;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  brandColors?: { primary?: string; secondary?: string };
}

interface AuthState {
  user: User | null;
  business: Business | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  onboardingCompleted: boolean;
  admissionCompleted: boolean;
  isDemoMode: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => void;
  register: (data: {
    email: string;
    password: string;
    name: string;
    businessName: string;
    businessType: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string, name?: string) => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  setOnboardingCompleted: (val: boolean) => void;
  setAdmissionCompleted: (val: boolean) => void;
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  business: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  onboardingCompleted: false,
  admissionCompleted: false,
  isDemoMode: false,

  initialize: async () => {
    set({ isLoading: true });

    // Check for demo mode
    const demoMode = localStorage.getItem('demoMode') === 'true';
    if (demoMode) {
      const demoUser: User = {
        id: 'demo-user-id',
        email: 'bizzauto.solution@gmail.com',
        name: 'Demo User',
        phone: '+91 8983027975',
        role: 'OWNER',
        businessId: 'demo-business-id',
        avatar: undefined,
        lastLogin: new Date().toISOString(),
      };

      const demoBusiness: Business = {
        id: 'demo-business-id',
        name: 'Demo Business',
        type: 'general',
        city: 'Demo City',
        plan: 'FREE',
        aiCreditsUsed: 5,
        aiCreditsLimit: 10,
        contactsLimit: 100,
        messagesLimit: 100,
        phone: '+91 8983027975',
        email: 'demo@bizzauto.com',
        address: 'Demo Address',
        website: 'https://www.bizzautoai.com',
      };

      set({
        token: 'demo-token',
        user: demoUser,
        business: demoBusiness,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        onboardingCompleted: true,
        admissionCompleted: true,
        isDemoMode: true,
      });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      set({ isInitialized: true, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const res = await authAPI.getProfile();
      const { user, business } = res.data.data;
      const onboardingCompleted = localStorage.getItem('onboardingCompleted') === 'true';
      const admissionCompleted = localStorage.getItem('admissionCompleted') === 'true';
      
      // Map image to avatar for backward compatibility
      if (user?.image && !user.avatar) {
        user.avatar = user.image;
      }
      
      // Sync admission status from business data if available
      if (business?.admissionCompleted) {
        localStorage.setItem('admissionCompleted', 'true');
      }
      
      set({
        token,
        user,
        business,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        onboardingCompleted,
        admissionCompleted: admissionCompleted || business?.admissionCompleted || false,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const isAuthError = status === 401 || status === 403;
      if (isAuthError) {
        localStorage.removeItem('token');
        set({ token: null, user: null, business: null, isAuthenticated: false });
      } else {
        // Server/network error — token is still valid, don't log out.
        // Next API call will re-verify via middleware and interceptor.
        set({ isAuthenticated: true });
      }
      set({ isInitialized: true, isLoading: false });
    }
  },

  login: async (email, password) => {
    const debug = (window as any).__loginDebug;
    if (debug) debug.storeStep = 'login_called';
    set({ isLoading: true });
    try {
      if (debug) debug.storeStep = 'calling_auth_api';
      const res = await authAPI.login({ email, password });
      if (debug) { debug.storeStep = 'auth_api_response_received'; debug.status = res.status; }
      const { user, business, token, refreshToken } = res.data.data;
      if (debug) { debug.storeStep = 'parsed_response'; debug.hasToken = !!token; debug.hasUser = !!user; }
      const onboardingCompleted = user.onboardingCompleted ?? false;
      const admissionCompleted = user.admissionCompleted ?? false;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('onboardingCompleted', String(onboardingCompleted));
      localStorage.setItem('admissionCompleted', String(admissionCompleted));
      set({ user, business, token, isAuthenticated: true, isLoading: false, onboardingCompleted, admissionCompleted });
      if (debug) debug.storeStep = 'state_updated_isAuthenticated_true';
    } catch (error: any) {
      set({ isLoading: false });
      if (debug) { debug.storeStep = 'store_error'; debug.storeError = error?.response?.data || error?.message || String(error); }
      const message = error.response?.data?.error || error.response?.data?.message || 'Invalid email or password';
      throw new Error(message);
    }
  },

  googleLogin: async (credential: string) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.googleLogin(credential);
      const { user, business, token, refreshToken } = res.data.data;
      const onboardingCompleted = user.onboardingCompleted ?? false;
      const admissionCompleted = user.admissionCompleted ?? false;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('onboardingCompleted', String(onboardingCompleted));
      localStorage.setItem('admissionCompleted', String(admissionCompleted));
      set({ user, business, token, isAuthenticated: true, isLoading: false, onboardingCompleted, admissionCompleted });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error || error.response?.data?.message || 'Google sign-in failed';
      throw new Error(message);
    }
  },

  appleLogin: async (credential: string, name?: string) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.appleLogin(credential, name);
      const { user, business, token, refreshToken } = res.data.data;
      const onboardingCompleted = user.onboardingCompleted ?? false;
      const admissionCompleted = user.admissionCompleted ?? false;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('onboardingCompleted', String(onboardingCompleted));
      localStorage.setItem('admissionCompleted', String(admissionCompleted));
      set({ user, business, token, isAuthenticated: true, isLoading: false, onboardingCompleted, admissionCompleted });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error || error.response?.data?.message || 'Apple sign-in failed';
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.register(data);
      const { user, business, token, refreshToken } = res.data.data;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('onboardingCompleted', 'true');
      set({ user, business, token, isAuthenticated: true, isLoading: false, onboardingCompleted: true });
    } catch (error: any) {
      set({ isLoading: false });
      const reqUrl = error.config?.baseURL + error.config?.url || '';
      const status = error.response?.status || '';
      const msg = error.response?.data?.error || error.response?.data?.message || 'Registration failed. Please try again.';
      console.error('REGISTER FAIL:', { url: reqUrl, status, msg, config: error.config?.baseURL });
      throw new Error(`[${status}] ${msg} (URL: ${reqUrl})`);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('admissionCompleted');
    localStorage.removeItem('demoMode');
    set({ user: null, business: null, token: null, isAuthenticated: false, onboardingCompleted: false, admissionCompleted: false });
  },

  demoLogin: () => {
    // Only allow demo mode if DEMO_MODE_ENABLED env var is set on server
    // OR if we're on localhost (development)
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (!isLocalhost) {
      console.warn('[DemoMode] Blocked: demo mode only allowed on localhost');
      return;
    }

    // Enable demo mode
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('admissionCompleted', 'true');

    const demoUser: User = {
      id: 'demo-user-id',
      email: 'demo@bizzauto.com',
      name: 'Demo User',
      phone: '+91 8983027975',
      role: 'VIEWER',  // Restrict demo to VIEWER — no destructive actions
      businessId: 'demo-business-id',
      avatar: undefined,
      lastLogin: new Date().toISOString(),
    };

    const demoBusiness: Business = {
      id: 'demo-business-id',
      name: 'BizzAuto Demo',
      type: 'general',
      city: 'Demo City',
      plan: 'FREE',  // FREE plan — shows real limitations
      aiCreditsUsed: 0,
      aiCreditsLimit: 10,
      contactsLimit: 100,
      messagesLimit: 50,
      phone: '+91 8983027975',
      email: 'demo@bizzauto.com',
      address: 'Demo Address - Pune',
      website: 'https://www.bizzautoai.com',
    };

    set({
      token: 'demo-token',
      user: demoUser,
      business: demoBusiness,
      isAuthenticated: true,
      isLoading: false,
      onboardingCompleted: true,
      admissionCompleted: true,
      isDemoMode: true,
    });

    console.info('[DemoMode] Activated: role=VIEWER, plan=FREE, localhost only');
  },

  updateProfile: async (data) => {
    try {
      const res = await authAPI.updateProfile(data);
      const { user } = res.data.data;
      set({ user });
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Update failed. Please try again.';
      throw new Error(message);
    }
  },

  setOnboardingCompleted: (val) => {
    localStorage.setItem('onboardingCompleted', val ? 'true' : 'false');
    set({ onboardingCompleted: val });
  },

  setAdmissionCompleted: (val) => {
    localStorage.setItem('admissionCompleted', val ? 'true' : 'false');
    set({ admissionCompleted: val });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setTokens: (token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ token });
  },
}));
