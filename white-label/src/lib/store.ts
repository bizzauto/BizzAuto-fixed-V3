import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI, clientsAPI, brandingAPI, productsAPI } from "./api";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  price: string;
  features: string[];
  color: string;
  demoUrl?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "google-reviews", name: "AI Google Reviews QR", tagline: "Automate Google Reviews with AI",
    description: "AI-powered Google Review QR code system with auto-reply, review filtering, and NFC card integration.",
    icon: "Star", price: "₹499/mo", color: "#f59e0b",
    features: ["AI-powered Google Review QR codes","Smart auto-reply to reviews","Negative review filtering & redirect","NFC card integration","White-label branding","Real-time review monitoring","Review request automation","Analytics dashboard"],
  },
  {
    id: "digital-vcard", name: "Digital V-Card Maker", tagline: "Smart Digital Business Cards with NFC",
    description: "Create stunning digital business cards with 30+ templates, NFC support, media galleries, and full white-label customization.",
    icon: "CreditCard", price: "₹399/mo", color: "#6366f1",
    features: ["30+ ready-to-use templates","NFC technology support","Add products & services","Social media integration","Image & video galleries","Fully editable anytime","Powerful admin dashboard","100% white-label solution"],
  },
  {
    id: "website-builder", name: "Single Page Website Builder", tagline: "No-Code Website Builder for Businesses",
    description: "Build beautiful single-page websites in minutes. No coding required. Perfect for portfolios, landing pages, and small businesses.",
    icon: "Globe", price: "₹599/mo", color: "#14b8a6",
    features: ["Drag-and-drop no-code builder","Responsive mobile-first design","20+ professional templates","Custom domain support","SEO optimized","Analytics integration","Contact form builder","White-label under your brand"],
  },
];

export interface Reseller {
  id: string; name: string; email: string; company: string;
  plan: string; domain: string; logo: string; primaryColor: string;
  clients: number; revenue: string; joinedAt: string;
}

export interface Client {
  id: string; name: string; email: string; phone: string;
  product: string; status: "active" | "pending" | "suspended";
  createdAt: string; plan: string;
}

interface WhiteLabelStore {
  isAuthenticated: boolean;
  reseller: Reseller | null;
  clients: Client[];
  activeTab: string;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveTab: (tab: string) => void;
  addClient: (data: { name: string; email: string; phone?: string; product?: string; plan?: string }) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  updateBranding: (data: { company?: string; domain?: string; primaryColor?: string; logo?: string }) => Promise<void>;
  clearError: () => void;
}

export const useWhiteLabelStore = create<WhiteLabelStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      reseller: null,
      clients: [],
      activeTab: "dashboard",
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        const res = await authAPI.login(email, password);
        if (res.data) {
          localStorage.setItem("rp-token", res.data.token);
          set({
            isAuthenticated: true,
            reseller: res.data.reseller,
            clients: res.data.clients,
            isLoading: false,
          });
        }
      },

      logout: () => {
        localStorage.removeItem("rp-token");
        set({ isAuthenticated: false, reseller: null, clients: [], activeTab: "dashboard" });
      },

      setActiveTab: (tab: string) => set({ activeTab: tab }),

      addClient: async (data) => {
        const res = await clientsAPI.create(data);
        if (res.data?.client) {
          set((state) => ({ clients: [...state.clients, res.data!.client] }));
        }
      },

      removeClient: async (id: string) => {
        await clientsAPI.remove(id);
        set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
      },

      updateBranding: async (data) => {
        await brandingAPI.update(data);
        const state = get();
        if (state.reseller) {
          set({ reseller: { ...state.reseller, ...data } });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "resellerpro-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        reseller: state.reseller,
        clients: state.clients,
      }),
    }
  )
);
