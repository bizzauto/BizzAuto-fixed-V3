const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem("rp-token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(json.error || "Request failed", res.status);
  }

  return json;
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    request<{ reseller: any; clients: any[]; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; company?: string; phone?: string }) =>
    request<{ reseller: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Clients API
export const clientsAPI = {
  list: () =>
    request<{ clients: any[] }>("/clients"),

  create: (data: { name: string; email: string; phone?: string; product?: string; plan?: string }) =>
    request<{ client: any }>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<void>(`/clients/${id}`, { method: "DELETE" }),

  updateStatus: (id: string, status: string) =>
    request<{ client: any }>(`/clients/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getStats: () =>
    request<{ total: number; active: number; pending: number; suspended: number }>("/clients/stats"),
};

// Branding API
export const brandingAPI = {
  get: () =>
    request<{ company: string; domain: string; logo: string; primaryColor: string }>("/branding"),

  update: (data: { company?: string; domain?: string; logo?: string; primaryColor?: string }) =>
    request<{ company: string; domain: string; logo: string; primaryColor: string }>("/branding", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Products API
export const productsAPI = {
  list: () =>
    request<{ products: any[] }>("/products"),

  get: (id: string) =>
    request<{ product: any }>(`/products/${id}`),
};
