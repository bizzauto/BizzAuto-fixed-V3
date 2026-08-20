// API Client for Frontend - Connects to Backend
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Don't use window.location.href - app uses tab-based navigation
      // The auth store will handle redirect via isAuthenticated state
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (credentials: any) => apiClient.post('/auth/login', credentials),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/change-password', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  verifyOTP: (email: string, otp: string) => apiClient.post('/auth/verify-otp', { email, otp }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { email, otp, newPassword }),
};

// Contacts API
export const contactsAPI = {
  list: (params?: any) => apiClient.get('/contacts', { params }),
  get: (id: string) => apiClient.get(`/contacts/${id}`),
  create: (data: any) => apiClient.post('/contacts', data),
  update: (id: string, data: any) => apiClient.put(`/contacts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/contacts/${id}`),
  import: (formData: FormData) =>
    apiClient.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  search: (query: string) => apiClient.get('/contacts/search', { params: { q: query } }),
};

// Leads API
export const leadsAPI = {
  list: (params?: any) => apiClient.get('/leads', { params }),
  get: (id: string) => apiClient.get(`/leads/${id}`),
  create: (data: any) => apiClient.post('/leads/manual', data),
  delete: (id: string) => apiClient.delete(`/leads/${id}`),
  export: (format: string, data?: any) => apiClient.post(`/leads/export/${format}`, data, { responseType: 'blob' }),
  bulkReply: (data: any) => apiClient.post('/leads/bulk-reply', data),
};

// WhatsApp API
export const whatsappAPI = {
  getConversations: (params?: any) => apiClient.get('/whatsapp/conversations', { params }),
  getMessages: (contactId: string, params?: any) =>
    apiClient.get(`/whatsapp/messages/${contactId}`, { params }),
  sendText: (data: { phone: string; message: string }) =>
    apiClient.post('/whatsapp/send/text', data),
  sendTemplate: (data: { phone: string; templateName: string; components?: any[] }) =>
    apiClient.post('/whatsapp/send/template', data),
  sendImage: (data: { phone: string; imageUrl: string; caption?: string }) =>
    apiClient.post('/whatsapp/send/image', data),
  getTemplates: () => apiClient.get('/whatsapp/templates'),
  createTemplate: (data: any) => apiClient.post('/whatsapp/templates', data),
  deleteTemplate: (id: string) => apiClient.delete(`/whatsapp/templates/${id}`),
  connect: (data: { code: string }) => apiClient.post('/whatsapp/connect', data),
  getAutoReplies: () => apiClient.get('/whatsapp/auto-replies'),
  createAutoReply: (data: any) => apiClient.post('/whatsapp/auto-replies', data),
  updateAutoReply: (id: string, data: any) => apiClient.put(`/whatsapp/auto-replies/${id}`, data),
  deleteAutoReply: (id: string) => apiClient.delete(`/whatsapp/auto-replies/${id}`),
  sendBroadcast: (data: any) => apiClient.post('/whatsapp/broadcast', data),
  getContacts: (params?: any) => apiClient.get('/whatsapp/contacts', { params }),
  getStatus: () => apiClient.get('/whatsapp/status'),
  disconnect: () => apiClient.post('/whatsapp/disconnect'),
};

// Campaigns API
export const campaignsAPI = {
  list: (params?: any) => apiClient.get('/campaigns', { params }),
  get: (id: string) => apiClient.get(`/campaigns/${id}`),
  create: (data: any) => apiClient.post('/campaigns', data),
  update: (id: string, data: any) => apiClient.put(`/campaigns/${id}`, data),
  delete: (id: string) => apiClient.delete(`/campaigns/${id}`),
  schedule: (id: string, scheduledAt: string) =>
    apiClient.post(`/campaigns/${id}/schedule`, { scheduledAt }),
  start: (id: string) => apiClient.post(`/campaigns/${id}/start`),
  pause: (id: string) => apiClient.post(`/campaigns/${id}/pause`),
  stats: (id: string) => apiClient.get(`/campaigns/${id}/stats`),
};

// Social Posts API
export const postsAPI = {
  list: (params?: any) => apiClient.get('/posts', { params }),
  get: (id: string) => apiClient.get(`/posts/${id}`),
  create: (data: any) => apiClient.post('/posts', data),
  update: (id: string, data: any) => apiClient.put(`/posts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/posts/${id}`),
  schedule: (id: string, scheduledAt: string) =>
    apiClient.post(`/posts/${id}/schedule`, { scheduledAt }),
  publish: (id: string) => apiClient.post(`/posts/${id}/publish`),
  generateCaption: (data: any) => apiClient.post('/ai/caption', data),
};

// Posters API
export const postersAPI = {
  list: (params?: any) => apiClient.get('/posters', { params }),
  get: (id: string) => apiClient.get(`/posters/${id}`),
  create: (data: any) => apiClient.post('/posters', data),
  generate: (data: { templateId: string; userData: any }) =>
    apiClient.post('/posters/generate', data),
  download: (id: string) => apiClient.get(`/posters/${id}/download`, { responseType: 'blob' }),
};

// Chatbot API
export const chatbotAPI = {
  list: () => apiClient.get('/chatbot'),
  get: (id: string) => apiClient.get(`/chatbot/${id}`),
  create: (data: any) => apiClient.post('/chatbot', data),
  update: (id: string, data: any) => apiClient.put(`/chatbot/${id}`, data),
  delete: (id: string) => apiClient.delete(`/chatbot/${id}`),
  activate: (id: string) => apiClient.post(`/chatbot/${id}/activate`),
  deactivate: (id: string) => apiClient.post(`/chatbot/${id}/deactivate`),
  test: (id: string, message: string) =>
    apiClient.post(`/chatbot/${id}/test`, { message }),
};

// AI API
export const aiAPI = {
  generate: (data: { type: string; prompt: string; context?: any }) =>
    apiClient.post('/ai/generate', data),
  caption: (data: { topic: string; businessType: string; platform: string }) =>
    apiClient.post('/ai/caption', data),
  hashtags: (data: { topic: string; platform: string }) =>
    apiClient.post('/ai/hashtags', data),
  reviewReply: (data: { reviewText: string; rating: number; businessType: string }) =>
    apiClient.post('/ai/review-reply', data),
  contentCalendar: (data: { businessType: string; month: string; year: number }) =>
    apiClient.post('/ai/content-calendar', data),
};

// Analytics API
export const analyticsAPI = {
  dashboard: (params?: any) => apiClient.get('/analytics/dashboard', { params }),
  messages: (params?: any) => apiClient.get('/analytics/messages', { params }),
  campaigns: (params?: any) => apiClient.get('/analytics/campaigns', { params }),
  social: (params?: any) => apiClient.get('/analytics/social', { params }),
  contacts: (params?: any) => apiClient.get('/analytics/contacts', { params }),
};

// Reviews API
export const reviewsAPI = {
  list: (params?: any) => apiClient.get('/reviews', { params }),
  get: (id: string) => apiClient.get(`/reviews/${id}`),
  reply: (id: string, reply: string) => apiClient.put(`/reviews/${id}/reply`, { replyText: reply }),
  sync: () => apiClient.post('/reviews/sync'),
  stats: () => apiClient.get('/reviews/stats'),
};

// Business API
export const businessAPI = {
  get: () => apiClient.get('/business'),
  update: (data: any) => apiClient.put('/business', data),
  getSettings: () => apiClient.get('/business/settings'),
  updateSettings: (data: any) => apiClient.put('/business/settings', data),
  getPipelines: () => apiClient.get('/business/pipelines'),
  createPipeline: (data: any) => apiClient.post('/business/pipelines', data),
};

// Subscriptions API
export const subscriptionsAPI = {
  getCurrent: () => apiClient.get('/subscriptions/current'),
  getPlans: () => apiClient.get('/subscriptions/plans'),
  createCheckout: (data: { plan: string; period: string }) =>
    apiClient.post('/subscriptions/checkout', data),
  createSubscription: (data: any) => apiClient.post('/subscriptions/create', data),
  cancel: (reason?: string) => apiClient.post('/subscriptions/cancel', { reason }),
  upgrade: (plan: string) => apiClient.post('/subscriptions/upgrade', { plan }),
  verify: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; plan: string; period: string }) =>
    apiClient.post('/subscriptions/verify', data),
};

// Webhooks API
export const webhooksAPI = {
  list: () => apiClient.get('/webhooks'),
  create: (data: any) => apiClient.post('/webhooks', data),
  update: (id: string, data: any) => apiClient.put(`/webhooks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/webhooks/${id}`),
  test: (id: string) => apiClient.post(`/webhooks/${id}/test`),
};

export const auditLogAPI = {
  list: (params?: any) => apiClient.get('/team/audit-logs', { params }),
  export: (params?: any) => apiClient.get('/team/audit-logs/export', { params, responseType: 'blob' }),
};

export const apiKeysAPI = {
  list: () => apiClient.get('/team/api-keys'),
  create: (data: { name: string; permissions: string[] }) => apiClient.post('/team/api-keys', data),
  revoke: (id: string) => apiClient.delete(`/team/api-keys/${id}`),
};

export const billingAPI = {
  getCurrent: () => apiClient.get('/subscriptions/current'),
  getInvoices: (params?: any) => apiClient.get('/subscriptions/invoices', { params }),
  getPlans: () => apiClient.get('/subscriptions/plans'),
  changePaymentMethod: (data: any) => apiClient.put('/subscriptions/payment-method', data),
  cancelSubscription: (reason?: string) => apiClient.post('/subscriptions/cancel', { reason }),
  upgradeSubscription: (plan: string) => apiClient.post('/subscriptions/upgrade', { plan }),
};

export const teamAPI = {
  listMembers: () => apiClient.get('/team/members'),
  inviteMember: (data: { email: string; role: string }) => apiClient.post('/team/invite', data),
  updateMember: (id: string, data: any) => apiClient.put(`/team/members/${id}`, data),
  removeMember: (id: string) => apiClient.delete(`/team/members/${id}`),
};

export const notificationsAPI = {
  list: (params?: { isRead?: boolean; type?: string; limit?: number; offset?: number }) =>
    apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};

// Automation API
export const automationAPI = {
  listRules: () => apiClient.get('/automation/rules'),
  getRule: (id: string) => apiClient.get(`/automation/rules/${id}`),
  createRule: (data: any) => apiClient.post('/automation/rules', data),
  updateRule: (id: string, data: any) => apiClient.put(`/automation/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete(`/automation/rules/${id}`),
  toggleRule: (id: string, isActive: boolean) => apiClient.patch(`/automation/rules/${id}/toggle`, { isActive }),
  getSettings: () => apiClient.get('/automation/settings'),
  updateSettings: (data: any) => apiClient.put('/automation/settings', data),
  getN8nStatus: () => apiClient.get('/automation/n8n/status'),
  getN8nWorkflows: () => apiClient.get('/automation/n8n/workflows'),
  triggerN8nWorkflow: (workflowId: string, data?: any) => apiClient.post(`/automation/n8n/workflows/${workflowId}/trigger`, data),
};

// Appointments API
export const appointmentsAPI = {
  list: (params?: any) => apiClient.get('/appointments', { params }),
  get: (id: string) => apiClient.get(`/appointments/${id}`),
  create: (data: any) => apiClient.post('/appointments', data),
  update: (id: string, data: any) => apiClient.put(`/appointments/${id}`, data),
  delete: (id: string) => apiClient.delete(`/appointments/${id}`),
  confirm: (id: string) => apiClient.patch(`/appointments/${id}/confirm`),
  cancel: (id: string) => apiClient.patch(`/appointments/${id}/cancel`),
  complete: (id: string) => apiClient.patch(`/appointments/${id}/complete`),
};

// Documents API
export const documentsAPI = {
  list: (params?: any) => apiClient.get('/documents', { params }),
  get: (id: string) => apiClient.get(`/documents/${id}`),
  create: (data: any) => apiClient.post('/documents', data),
  update: (id: string, data: any) => apiClient.put(`/documents/${id}`, data),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),
  convert: (id: string, targetType: string) => apiClient.post(`/documents/${id}/convert`, { targetType }),
  send: (id: string, data: any) => apiClient.post(`/documents/${id}/send`, data),
};

// E-Commerce API
export const ecommerceAPI = {
  getStore: () => apiClient.get('/ecommerce/store'),
  updateStore: (data: any) => apiClient.put('/ecommerce/store', data),
  listProducts: (params?: any) => apiClient.get('/ecommerce/products', { params }),
  getProduct: (id: string) => apiClient.get(`/ecommerce/products/${id}`),
  createProduct: (data: any) => apiClient.post('/ecommerce/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/ecommerce/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/ecommerce/products/${id}`),
  listOrders: (params?: any) => apiClient.get('/ecommerce/orders', { params }),
  getOrder: (id: string) => apiClient.get(`/ecommerce/orders/${id}`),
  updateOrderStatus: (id: string, status: string) => apiClient.patch(`/ecommerce/orders/${id}/status`, { status }),
};

// Google Business API
export const googleBusinessAPI = {
  getStatus: () => apiClient.get('/google-business/status'),
  connect: (data: any) => apiClient.post('/google-business/connect', data),
  disconnect: () => apiClient.post('/google-business/disconnect'),
  getReviews: (params?: any) => apiClient.get('/google-business/reviews', { params }),
  replyToReview: (id: string, reply: string) => apiClient.post(`/google-business/reviews/${id}/reply`, { reply }),
  getPosts: (params?: any) => apiClient.get('/google-business/posts', { params }),
  createPost: (data: any) => apiClient.post('/google-business/posts', data),
  deletePost: (id: string) => apiClient.delete(`/google-business/posts/${id}`),
  getStats: () => apiClient.get('/google-business/stats'),
};

export default apiClient;
