// API Client for Frontend - Connects to Backend
import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// On Capacitor native, the webview serves from a custom scheme and `/api`
// would 404. Use the production URL from VITE_API_URL when on native.
// On web, use the relative `/api` path so the same bundle works with the
// Vite dev-server proxy and the production web reverse-proxy.
const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
const API_BASE_URL = isNative
  ? (import.meta.env.VITE_API_URL || 'https://bizzauto.com/api')
  : '/api';

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

// Response interceptor - Handle errors + JWT refresh token rotation
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error || !token) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Check if server signals token needs refresh
    if (response.headers['x-token-needs-refresh'] === 'true') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !isRefreshing) {
        isRefreshing = true;
        axios
          .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            const { token: newToken, refreshToken: newRefreshToken } = res.data.data;
            localStorage.setItem('token', newToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            processQueue(null, newToken);
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          })
          .finally(() => {
            isRefreshing = false;
          });
      }
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // If 401 and we have a refresh token, try to refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        return axios
          .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            const { token: newToken, refreshToken: newRefreshToken } = res.data.data;
            localStorage.setItem('token', newToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            return Promise.reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      }

      // No refresh token — clear and let auth store handle redirect
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (credentials: any) => apiClient.post('/auth/login', credentials),
  googleLogin: (credential: string) => apiClient.post('/auth/google', { credential }),
  googleLinkUrl: () => apiClient.get('/auth/google/link-url'),
  googleUnlink: () => apiClient.post('/auth/google/unlink'),
  appleLogin: (credential: string, name?: string) => apiClient.post('/auth/apple', { credential, name }),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/change-password', data),
  listUsers: (params?: any) => apiClient.get('/auth/users', { params }),
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
  connect: () => apiClient.post('/whatsapp/connect'),
  connectManual: (data: { wabaId?: string; phoneNumberId: string; accessToken: string; webhookSecret?: string }) =>
    apiClient.post('/whatsapp/connect-manual', data),
  getAutoReplies: () => apiClient.get('/whatsapp/auto-replies'),
  createAutoReply: (data: any) => apiClient.post('/whatsapp/auto-replies', data),
  updateAutoReply: (id: string, data: any) => apiClient.put(`/whatsapp/auto-replies/${id}`, data),
  deleteAutoReply: (id: string) => apiClient.delete(`/whatsapp/auto-replies/${id}`),
  sendBroadcast: (data: any) => apiClient.post('/whatsapp/broadcast', data),
  listBroadcasts: (params?: any) => apiClient.get('/whatsapp/broadcasts', { params }),
  getContacts: (params?: any) => apiClient.get('/whatsapp/contacts', { params }),
  getStatus: () => apiClient.get('/whatsapp/status'),
  getChannelStatus: () => apiClient.get('/whatsapp/channel-status'),
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
  send: (id: string) => apiClient.post(`/campaigns/${id}/send`),
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
  generateImage: (data: { prompt?: string; format?: string; headline?: string; subtitle?: string; businessName?: string; phone?: string }) =>
    apiClient.post('/posters/generate-image', data),
  download: (id: string) => apiClient.get(`/posters/${id}/download`, { responseType: 'blob' }),
  generated: (params?: { page?: number; limit?: number; category?: string }) =>
    apiClient.get('/posters/generated', { params }),
  deleteGenerated: (id: string) => apiClient.delete(`/posters/generated/${id}`),
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
  roi: (params?: any) => apiClient.get('/analytics/roi', { params }),
  funnel: (params?: any) => apiClient.get('/analytics/funnel', { params }),
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

// Admission Form API
export const admissionAPI = {
  submit: (data: FormData) => apiClient.post('/admission/submit', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStatus: () => apiClient.get('/admission/status'),
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

// Email Marketing API
export const emailAPI = {
  listTemplates: (params?: any) => apiClient.get('/email/templates', { params }),
  getTemplate: (id: string) => apiClient.get(`/email/templates/${id}`),
  createTemplate: (data: any) => apiClient.post('/email/templates', data),
  updateTemplate: (id: string, data: any) => apiClient.put(`/email/templates/${id}`, data),
  deleteTemplate: (id: string) => apiClient.delete(`/email/templates/${id}`),
  listDrips: () => apiClient.get('/email/drips'),
  createDrip: (data: any) => apiClient.post('/email/drips', data),
  updateDrip: (id: string, data: any) => apiClient.put(`/email/drips/${id}`, data),
  toggleDrip: (id: string, isActive: boolean) => apiClient.patch(`/email/drips/${id}/toggle`, { isActive }),
  deleteDrip: (id: string) => apiClient.delete(`/email/drips/${id}`),
  listLists: () => apiClient.get('/email/lists'),
  createList: (data: any) => apiClient.post('/email/lists', data),
  deleteList: (id: string) => apiClient.delete(`/email/lists/${id}`),
  testConnection: (config: any) => apiClient.post('/email/test-connection', config),
  saveConfig: (config: any) => apiClient.post('/email/config', config),
};

// Automation API
export const automationAPI = {
  listRules: () => apiClient.get('/automation/rules'),
  getRule: (id: string) => apiClient.get(`/automation/rules/${id}`),
  createRule: (data: any) => apiClient.post('/automation/rules', data),
  updateRule: (id: string, data: any) => apiClient.put(`/automation/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete(`/automation/rules/${id}`),
  toggleRule: (id: string, isActive: boolean) => apiClient.patch(`/automation/rules/${id}/toggle`, { isActive }),
  getTemplates: () => apiClient.get('/automation/templates'),
  getLogs: (params?: any) => apiClient.get('/automation/logs', { params }),
  list: (params?: any) => apiClient.get('/automation/rules', { params }),
  getSettings: () => apiClient.get('/automation/settings'),
  updateSettings: (data: any) => apiClient.put('/automation/settings', data),
  getN8nStatus: () => apiClient.get('/automation/n8n/status'),
  getN8nWorkflows: () => apiClient.get('/automation/n8n/workflows'),
  triggerN8nWorkflow: (workflowId: string, data?: any) => apiClient.post(`/automation/n8n/workflows/${workflowId}/trigger`, data),
};

// Trigger Links API
export const triggerLinksAPI = {
  list: (params?: any) => apiClient.get('/trigger-links', { params }),
  get: (id: string) => apiClient.get(`/trigger-links/${id}`),
  create: (data: any) => apiClient.post('/trigger-links', data),
  update: (id: string, data: any) => apiClient.put(`/trigger-links/${id}`, data),
  delete: (id: string) => apiClient.delete(`/trigger-links/${id}`),
  toggle: (id: string) => apiClient.patch(`/trigger-links/${id}/toggle`),
  analytics: (id: string, params?: any) => apiClient.get(`/trigger-links/${id}/analytics`, { params }),
  qrCode: (id: string) => apiClient.get(`/trigger-links/${id}/qr`, { responseType: 'blob' }),
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
  getAuthUrl: () => apiClient.get('/google-business/auth/url'),
  getStatus: () => apiClient.get('/google-business/status'),
  connect: (data: any) => apiClient.post('/google-business/connect', data),
  disconnect: () => apiClient.post('/google-business/disconnect'),
  getReviews: (params?: any) => apiClient.get('/google-business/reviews', { params }),
  replyToReview: (id: string, reply: string) => apiClient.post(`/google-business/reviews/${id}/reply`, { reply }),
  getPosts: (params?: any) => apiClient.get('/google-business/posts', { params }),
  createPost: (data: any) => apiClient.post('/google-business/posts', data),
  deletePost: (id: string) => apiClient.delete(`/google-business/posts/${id}`),
  getStats: () => apiClient.get('/google-business/stats'),
  // Auto-Post endpoints
  getAutoPostConfig: () => apiClient.get('/google-business/auto-post/config'),
  updateAutoPostConfig: (data: any) => apiClient.put('/google-business/auto-post/config', data),
  getAutoPostTemplates: () => apiClient.get('/google-business/auto-post/templates'),
  addAutoPostTemplate: (data: any) => apiClient.post('/google-business/auto-post/templates', data),
  updateAutoPostTemplate: (id: string, data: any) => apiClient.put(`/google-business/auto-post/templates/${id}`, data),
  deleteAutoPostTemplate: (id: string) => apiClient.delete(`/google-business/auto-post/templates/${id}`),
  triggerAutoPost: () => apiClient.post('/google-business/auto-post/trigger'),
  getAutoPostStatus: () => apiClient.get('/google-business/auto-post/status'),
};

// Social Accounts API
export const socialAccountsAPI = {
  list: () => apiClient.get('/social-accounts'),
  getStatus: () => apiClient.get('/social-accounts'),
  connectFacebook: (data: { fbPageId: string; fbAccessToken: string }) =>
    apiClient.post('/social-accounts/facebook/connect', data),
  disconnectFacebook: () => apiClient.delete('/social-accounts/facebook/disconnect'),
  connectLinkedIn: (data: { linkedinPageId: string; linkedinAccessToken: string }) =>
    apiClient.post('/social-accounts/linkedin/connect', data),
  disconnectLinkedIn: () => apiClient.delete('/social-accounts/linkedin/disconnect'),
  connectTwitter: (data: { twitterUserId: string; twitterAccessToken: string }) =>
    apiClient.post('/social-accounts/twitter/connect', data),
  disconnectTwitter: () => apiClient.delete('/social-accounts/twitter/disconnect'),
  connectYouTube: (data: { youtubeChannelId: string; youtubeAccessToken: string }) =>
    apiClient.post('/social-accounts/youtube/connect', data),
  disconnectYouTube: () => apiClient.delete('/social-accounts/youtube/disconnect'),
};

// Instagram API
export const instagramAPI = {
  connect: (data: { igUserId: string; igAccessToken: string }) =>
    apiClient.post('/instagram/connect', data),
  disconnect: () => apiClient.delete('/instagram/disconnect'),
  getStatus: () => apiClient.get('/instagram/status'),
  getAccount: () => apiClient.get('/instagram/account'),
  uploadMedia: (formData: FormData) =>
    apiClient.post('/instagram/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createContainer: (data: { mediaUrl: string; caption?: string; mediaType?: string }) =>
    apiClient.post('/instagram/media/container', data),
  createCarouselContainer: (data: { children: Array<{ mediaUrl: string; mediaType?: string }>; caption?: string }) =>
    apiClient.post('/instagram/media/container/carousel', data),
  checkContainerStatus: (creationId: string) =>
    apiClient.get(`/instagram/media/container/${creationId}/status`),
  publishContainer: (creationId: string) =>
    apiClient.post('/instagram/media/publish', { creationId }),
  publish: (data: { mediaUrl: string; caption?: string; mediaType?: string }) =>
    apiClient.post('/instagram/publish', data),
  publishCarousel: (data: { children: Array<{ mediaUrl: string; mediaType?: string }>; caption?: string }) =>
    apiClient.post('/instagram/carousel', data),
  publishPost: (postId: string) =>
    apiClient.post(`/instagram/post/${postId}/publish`),
  getMedia: (limit?: number) => apiClient.get('/instagram/media', { params: { limit } }),
  getMediaInsights: (mediaId: string) =>
    apiClient.get(`/instagram/media/${mediaId}/insights`),
};

// Conversations / Unified Inbox API
export const conversationsAPI = {
  list: (params?: { channel?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/conversations', { params }),
  getStats: () => apiClient.get('/conversations/stats'),
  get: (contactId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/conversations/${encodeURIComponent(contactId)}`, { params }),
  reply: (contactId: string, data: { content: string; channel?: string }) =>
    apiClient.post(`/conversations/${encodeURIComponent(contactId)}/reply`, data),
  markRead: (contactId: string) =>
    apiClient.patch(`/conversations/${encodeURIComponent(contactId)}/read`),
  archive: (contactIds: string[]) =>
    apiClient.post('/conversations/archive', { contactIds }),
};

// Payment Links API
export const paymentLinksAPI = {
  list: (params?: any) => apiClient.get('/payment-links', { params }),
  get: (id: string) => apiClient.get(`/payment-links/${id}`),
  create: (data: any) => apiClient.post('/payment-links', data),
  update: (id: string, data: any) => apiClient.put(`/payment-links/${id}`, data),
  delete: (id: string) => apiClient.delete(`/payment-links/${id}`),
  getTransactions: (id: string, params?: any) => apiClient.get(`/payment-links/${id}/transactions`, { params }),
  send: (id: string) => apiClient.post(`/payment-links/${id}/send`),
  verifyTransaction: (transactionId: string) =>
    apiClient.post('/payments/verify', { transactionId }),
};

// Live Chat API
export const liveChatAPI = {
  // Public (no auth)
  getWidget: (businessId: string) =>
    apiClient.get('/live-chat/widget', { params: { businessId } }),
  createSession: (data: { businessId: string; visitorName?: string; visitorEmail?: string; visitorPhone?: string; metadata?: any }) =>
    apiClient.post('/live-chat/sessions', data),
  addMessage: (sessionId: string, data: { senderType?: string; senderId?: string; content: string; contentType?: string; metadata?: any }) =>
    apiClient.post(`/live-chat/sessions/${sessionId}/messages`, data),
  rateSession: (sessionId: string, satisfaction: number) =>
    apiClient.patch(`/live-chat/sessions/${sessionId}/rate`, { satisfaction }),

  // Authenticated (admin)
  listSessions: (params?: { status?: string; assignedTo?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/live-chat', { params }),
  getStats: () => apiClient.get('/live-chat/stats'),
  getSession: (id: string) => apiClient.get(`/live-chat/${id}`),
  assignSession: (id: string, assignedTo: string) =>
    apiClient.patch(`/live-chat/${id}/assign`, { assignedTo }),
  closeSession: (id: string) => apiClient.patch(`/live-chat/${id}/close`),
  saveWidget: (data: any) => apiClient.post('/live-chat/widget', data),
};

// Custom Fields API
export const customFieldsAPI = {
  listAll: (params?: { entityType?: string; isVisible?: string; search?: string }) =>
    apiClient.get('/custom-fields', { params }),
  get: (id: string) => apiClient.get(`/custom-fields/${id}`),
  create: (data: any) => apiClient.post('/custom-fields', data),
  update: (id: string, data: any) => apiClient.put(`/custom-fields/${id}`, data),
  delete: (id: string) => apiClient.delete(`/custom-fields/${id}`),
  reorder: (fieldIds: string[]) => apiClient.put('/custom-fields/reorder', { fieldIds }),
  getEntityFields: (entityType: string) =>
    apiClient.get(`/custom-fields/entity/${entityType}`),
  getEntityFieldValues: (entityType: string, entityId: string) =>
    apiClient.get(`/custom-fields/entity/${entityType}/${entityId}`),
  saveEntityFieldValues: (entityType: string, entityId: string, values: Record<string, any>) =>
    apiClient.post(`/custom-fields/entity/${entityType}/values`, { entityId, values }),
};

// Voice Calls API (Dograh)
export const voiceCallsAPI = {
  list: (params?: any) => apiClient.get('/voice-calls', { params }),
  getStats: (params?: any) => apiClient.get('/voice-calls/stats', { params }),
  get: (id: string) => apiClient.get(`/voice-calls/${id}`),
  dial: (data: { phoneNumber?: string; contactId?: string; workflowId?: number; callType: 'phone' | 'browser'; context?: any }) =>
    apiClient.post('/voice-calls/dial', data),
  getAgents: () => apiClient.get('/voice-calls/agents'),
  getSettings: () => apiClient.get('/voice-calls/settings'),
  updateSettings: (data: any) => apiClient.put('/voice-calls/settings', data),
  checkConnection: () => apiClient.get('/voice-calls/check'),
};

// WhatsApp Media Cleanup API
export const whatsappMediaCleanupAPI = {
  getStats: () => apiClient.get('/whatsapp-media/cleanup/stats'),
  getPendingFiles: (userId?: string) => apiClient.get('/whatsapp-media/cleanup/pending', { 
    params: userId ? { userId } : {} 
  }),
  getUserWarnings: () => apiClient.get('/whatsapp-media/cleanup/users'),
  sendWarnings: () => apiClient.post('/whatsapp-media/cleanup/warn-users'),
  exportFiles: (fileIds: string[], format: 'csv' | 'json' | 'zip') =>
    apiClient.post('/whatsapp-media/cleanup/export', { fileIds, format }),
  deleteFiles: (fileIds: string[], reason: string, confirmed: boolean) =>
    apiClient.delete('/whatsapp-media/cleanup', { data: { fileIds, reason, confirmed } }),
  triggerCleanup: () => apiClient.post('/whatsapp-media/cleanup/cleanup-trigger'),
};

// Wallet API
export const walletAPI = {
  get: () => apiClient.get('/wallet'),
  getTransactions: (params?: any) => apiClient.get('/wallet/transactions', { params }),
  recharge: (data: { amount: number }) => apiClient.post('/wallet/recharge', data),
  verifyRecharge: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; amount: number }) =>
    apiClient.post('/wallet/recharge/verify', data),
  balanceCheck: (estimatedMinutes?: number) =>
    apiClient.get('/wallet/balance-check', { params: { estimatedMinutes } }),
  updateThreshold: (threshold: number) =>
    apiClient.put('/wallet/threshold', { threshold }),
  getEarnings: (params?: any) => apiClient.get('/wallet/earnings', { params }),
  getEarningsByBusiness: () => apiClient.get('/wallet/earnings/by-business'),
  settleEarnings: (earningIds: string[]) =>
    apiClient.post('/wallet/earnings/settle', { earningIds }),
};

// ====================================================================
// Claude WhatsApp Provider - AI-powered smart messaging with SMS fallback
// ====================================================================
export const claudeWhatsAppAPI = {
  getConfig: () => apiClient.get('/claude-whatsapp/config'),
  saveConfig: (config: any) => apiClient.post('/claude-whatsapp/config', config),
  getChannels: () => apiClient.get('/claude-whatsapp/channels'),
  getStatus: () => apiClient.get('/claude-whatsapp/status'),
  send: (message: any) => apiClient.post('/claude-whatsapp/send', message),
  sendBulk: (messages: any[]) => apiClient.post('/claude-whatsapp/send-bulk', { messages }),
  optimize: (body: string, channel?: string, contactName?: string) =>
    apiClient.post('/claude-whatsapp/optimize', { body, channel, contactName }),
  testChannel: (channel: string, phone: string) =>
    apiClient.post(`/claude-whatsapp/test/${channel}`, { phone }),
  getCostStats: (from?: string, to?: string) =>
    apiClient.get('/claude-whatsapp/cost-stats', { params: { from, to } }),
};

// ====================================================================
// Unofficial WhatsApp Provider - SMS Gate Hub / WPPConnect / Baileys wrappers
// ====================================================================
export const unofficialWhatsAppAPI = {
  getConfig: () => apiClient.get('/unofficial-whatsapp/config'),
  saveConfig: (config: any) => apiClient.post('/unofficial-whatsapp/config', config),
  getProviders: () => apiClient.get('/unofficial-whatsapp/providers'),
  getStatus: () => apiClient.get('/unofficial-whatsapp/status'),
  connect: () => apiClient.post('/unofficial-whatsapp/connect', {}),
  logout: () => apiClient.post('/unofficial-whatsapp/logout', {}),
  test: () => apiClient.post('/unofficial-whatsapp/test', {}),
  checkNumber: (phone: string) => apiClient.get(`/unofficial-whatsapp/check/${encodeURIComponent(phone)}`),
  send: (message: any) => apiClient.post('/unofficial-whatsapp/send', message),
  sendBulk: (messages: any[]) => apiClient.post('/unofficial-whatsapp/send-bulk', { messages }),
};

// SMS Marketing API
export const smsMarketingAPI = {
  listCampaigns: (params?: any) => apiClient.get('/sms-marketing/campaigns', { params }),
  getCampaign: (id: string) => apiClient.get(`/sms-marketing/campaigns/${id}`),
  createCampaign: (data: any) => apiClient.post('/sms-marketing/campaigns', data),
  updateCampaign: (id: string, data: any) => apiClient.put(`/sms-marketing/campaigns/${id}`, data),
  deleteCampaign: (id: string) => apiClient.delete(`/sms-marketing/campaigns/${id}`),
  sendCampaign: (id: string) => apiClient.post(`/sms-marketing/campaigns/${id}/send`),
  sendMessage: (data: any) => apiClient.post('/sms-marketing/send', data),
  listMessages: (params?: any) => apiClient.get('/sms-marketing/messages', { params }),
  getStats: () => apiClient.get('/sms-marketing/stats'),
};

// Ledger API (CRM Accounting)
export const ledgerAPI = {
  list: (params?: any) => apiClient.get('/ledger', { params }),
  stats: () => apiClient.get('/ledger/stats'),
  create: (data: any) => apiClient.post('/ledger', data),
  update: (id: string, data: any) => apiClient.put(`/ledger/${id}`, data),
  delete: (id: string) => apiClient.delete(`/ledger/${id}`),
}

// ==================== GOALS ====================
export const goalsAPI = {
  list: (params?: Record<string, any>) => apiClient.get('/goals', { params }),
  create: (data: { title: string; type: string; target: number; current?: number; period?: string; startDate?: string; endDate?: string }) =>
    apiClient.post('/goals', data),
  update: (id: string, data: Record<string, any>) => apiClient.put(`/goals/${id}`, data),
  delete: (id: string) => apiClient.delete(`/goals/${id}`),
};

// ==================== DEALS & PIPELINES ====================
export const dealsAPI = {
  list: (params?: Record<string, any>) => apiClient.get('/deals', { params }),
  stats: () => apiClient.get('/deals/stats'),
  updateStage: (id: string, data: { stage?: string; stageId?: string; pipelineId?: string }) =>
    apiClient.put(`/deals/${id}/stage`, data),
  update: (id: string, data: Record<string, any>) => apiClient.put(`/deals/${id}`, data),
};

export const pipelinesAPI = {
  list: () => apiClient.get('/pipelines'),
  create: (data: { name: string; description?: string; stages?: any[] }) => apiClient.post('/pipelines', data),
  addStage: (pipelineId: string, data: { name: string; color?: string }) =>
    apiClient.post(`/pipelines/${pipelineId}/stages`, data),
  delete: (id: string) => apiClient.delete(`/pipelines/${id}`),
};

// ==================== FILE UPLOAD ====================
export const uploadAPI = {
  upload: (file: File, category?: string, entityType?: string, entityId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (entityType) formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId);
    return apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files: File[], category?: string, entityType?: string, entityId?: string) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (category) formData.append('category', category);
    if (entityType) formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId);
    return apiClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  list: (params?: Record<string, any>) => apiClient.get('/upload', { params }),
  delete: (id: string) => apiClient.delete(`/upload/${id}`),
  getStats: () => apiClient.get('/upload/stats'),
};

// ==================== CRM INVOICES ====================
export const crmInvoicesAPI = {
  list: (params?: Record<string, any>) => apiClient.get('/crm-invoices', { params }),
  create: (data: {
    customerName: string; customerEmail: string; customerPhone: string;
    items: { description: string; quantity: number; rate: number; amount: number }[];
    taxRate?: number; notes?: string; dueDate?: string; contactId?: string;
  }) => apiClient.post('/crm-invoices', data),
  update: (id: string, data: Record<string, any>) => apiClient.put(`/crm-invoices/${id}`, data),
  markPaid: (id: string, data?: { paymentMethod?: string }) => apiClient.put(`/crm-invoices/${id}/pay`, data || {}),
  delete: (id: string) => apiClient.delete(`/crm-invoices/${id}`),
};

// ==================== LEAD FINDER ====================
export const leadFinderAPI = {
  search: (data: { category: string; city: string; radius?: number }) =>
    apiClient.post('/lead-finder/search', data),
  analyze: (places: any[]) => apiClient.post('/lead-finder/analyze', { places }),
  import: (data: { places: any[]; searchId: string }) => apiClient.post('/lead-finder/import', data),
  history: (params?: { limit?: number }) => apiClient.get('/lead-finder/history', { params }),
  score: (contactId: string) => apiClient.post(`/lead-finder/score/${contactId}`),
  bulkScore: (contactIds?: string[]) => apiClient.post('/lead-finder/bulk-score', { contactIds }),
  leads: (params?: { category?: string; source?: string; page?: number; limit?: number }) =>
    apiClient.get('/lead-finder/leads', { params }),
};

// ==================== OUTREACH ====================
export const outreachAPI = {
  generate: (data: { contactId: string; template?: string }) => apiClient.post('/outreach/generate', data),
  preview: (data: { contactIds: string[]; template?: string }) => apiClient.post('/outreach/preview', data),
  send: (data: { campaignId: string; contactId: string; messageType?: string }) => apiClient.post('/outreach/send', data),
  bulk: (data: { campaignId: string; messageType?: string; delayMs?: number; maxMessages?: number }) => apiClient.post('/outreach/bulk', data),
  listCampaigns: () => apiClient.get('/outreach/campaigns'),
  getCampaign: (id: string) => apiClient.get(`/outreach/campaigns/${id}`),
  createCampaign: (data: { name: string; template: string; contactIds: string[] }) =>
    apiClient.post('/outreach/campaigns', data),
  activateCampaign: (id: string) => apiClient.post(`/outreach/campaigns/${id}/activate`),
  pauseCampaign: (id: string) => apiClient.post(`/outreach/campaigns/${id}/pause`),
  scheduleFollowUps: (data: { campaignId: string; rules?: any }) =>
    apiClient.post('/outreach/followup/schedule', data),
  processFollowUps: () => apiClient.post('/outreach/followup/process'),
  handleReply: (data: { contactId: string; campaignId: string; replyContent?: string }) =>
    apiClient.post('/outreach/reply', data),
};

// ==================== WHITE-LABEL SETTINGS ====================
export const settingsAPI = {
  getWhiteLabel: () => apiClient.get('/settings'),
  updateWhiteLabel: (data: {
    brandName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    customCss?: string;
    customDomain?: string;
    isActive?: boolean;
  }) => apiClient.put('/settings', data),
};

// ==================== WORKFLOWS (Visual Builder) ====================
export const workflowsAPI = {
  list: (params?: Record<string, any>) => apiClient.get('/workflows', { params }),
  get: (id: string) => apiClient.get(`/workflows/${id}`),
  create: (data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, any>;
    nodes?: any[];
    edges?: any[];
  }) => apiClient.post('/workflows', data),
  update: (id: string, data: Record<string, any>) => apiClient.put(`/workflows/${id}`, data),
  delete: (id: string) => apiClient.delete(`/workflows/${id}`),
  toggle: (id: string) => apiClient.patch(`/workflows/${id}/toggle`),
  run: (id: string, triggerData?: Record<string, any>) => apiClient.post(`/workflows/${id}/run`, { triggerData }),
  getRuns: (id: string, params?: Record<string, any>) => apiClient.get(`/workflows/${id}/runs`, { params }),
  getExecution: (executionId: string) => apiClient.get(`/workflows/executions/${executionId}`),
  getDeployTemplates: () => apiClient.get('/automation/deploy-templates'),
  deployTemplate: (data: { templateId: string; name?: string; config?: Record<string, any> }) =>
    apiClient.post('/automation/deploy-template', data),
  generateWithAI: (data: { prompt: string }) => apiClient.post('/ai/generate', { type: 'workflow', prompt: data.prompt }),
};

// ==================== FUNNEL BUILDER ====================
export const funnelAPI = {
  list: (params?: Record<string, any>) => apiClient.get('/funnels', { params }),
  get: (id: string) => apiClient.get(`/funnels/${id}`),
  create: (data: { name: string; description?: string; domain?: string; isActive?: boolean }) =>
    apiClient.post('/funnels', data),
  update: (id: string, data: Record<string, any>) => apiClient.put(`/funnels/${id}`, data),
  delete: (id: string) => apiClient.delete(`/funnels/${id}`),
  preview: (id: string) => apiClient.get(`/funnels/${id}/preview`),
  getTemplates: () => apiClient.get('/funnels/templates'),
  cloneTemplate: (templateId: string, data?: { name?: string }) =>
    apiClient.post(`/funnels/templates/${templateId}/clone`, data || {}),

  // Analytics & Tracking
  getAnalytics: (id: string) => apiClient.get(`/funnels/${id}/analytics`),
  trackPageView: (pageId: string, data?: { visitorId?: string }) =>
    apiClient.post(`/funnels/pages/${pageId}/view`, data || {}),

  // Funnel Pages
  addPage: (funnelId: string, data: {
    name: string; slug: string; type?: string;
    content?: any; html?: string;
    seoTitle?: string; seoDescription?: string; seoImage?: string;
    customCss?: string; customJs?: string; conversionScript?: string;
    isPublished?: boolean;
  }) => apiClient.post(`/funnels/${funnelId}/pages`, data),
  updatePage: (pageId: string, data: Record<string, any>) => apiClient.put(`/funnels/pages/${pageId}`, data),
  deletePage: (pageId: string) => apiClient.delete(`/funnels/pages/${pageId}`),
  togglePagePublish: (pageId: string) => apiClient.patch(`/funnels/pages/${pageId}/publish`),
};

// ==================== SUPER ADMIN API ====================
export const superAdminAPI = {
  // Stats & Analytics
  getStats: () => apiClient.get('/super-admin/stats'),
  getGrowth: () => apiClient.get('/super-admin/growth'),

  // Businesses
  listBusinesses: (params?: Record<string, any>) => apiClient.get('/super-admin/businesses', { params }),
  getBusiness: (id: string) => apiClient.get(`/super-admin/businesses/${id}`),
  updateBusinessPlan: (id: string, data: { plan: string; expiresAt?: string }) =>
    apiClient.put(`/super-admin/businesses/${id}/plan`, data),
  toggleBusinessStatus: (id: string, isActive: boolean) =>
    apiClient.put(`/super-admin/businesses/${id}/status`, { isActive }),

  // Users
  listUsers: (params?: Record<string, any>) => apiClient.get('/super-admin/users', { params }),
  changeUserRole: (userId: string, role: string) => apiClient.put(`/super-admin/users/${userId}/role`, { role }),
  toggleUserStatus: (userId: string, isActive: boolean) =>
    apiClient.put(`/super-admin/users/${userId}/status`, { isActive }),
  deleteUser: (userId: string) => apiClient.delete(`/super-admin/users/${userId}`),

  // Subscriptions
  listSubscriptions: (params?: Record<string, any>) => apiClient.get('/super-admin/subscriptions', { params }),

  // Poster Backgrounds
  listBackgrounds: (params?: Record<string, any>) => apiClient.get('/super-admin/backgrounds', { params }),
  createBackground: (data: Record<string, any>) => apiClient.post('/super-admin/backgrounds', data),
  updateBackground: (id: string, data: Record<string, any>) => apiClient.put(`/super-admin/backgrounds/${id}`, data),
  deleteBackground: (id: string) => apiClient.delete(`/super-admin/backgrounds/${id}`),

  // Settings
  getSettings: () => apiClient.get('/super-admin/settings'),
};

// ==================== ADMIN INFRASTRUCTURE API ====================
export const adminInfrastructureAPI = {
  getStatus: () => apiClient.get('/admin/infrastructure/status'),
  getCircuitBreaker: () => apiClient.get('/admin/infrastructure/circuit-breaker'),
  getCircuitBreakerService: (service: string) => apiClient.get(`/admin/infrastructure/circuit-breaker/${service}`),
  resetCircuitBreaker: (service: string) => apiClient.post(`/admin/infrastructure/circuit-breaker/${service}/reset`),
  getWebhookQueue: () => apiClient.get('/admin/infrastructure/webhook-queue'),
  retryWebhook: (jobId: string) => apiClient.post(`/admin/infrastructure/webhook-queue/${jobId}/retry`),
  getAuditPrune: () => apiClient.get('/admin/infrastructure/audit-prune'),
  runAuditPrune: (retentionDays?: number) =>
    apiClient.post('/admin/infrastructure/audit-prune/run', null, { params: retentionDays ? { retentionDays } : {} }),
};

// ==================== ADMIN ANALYTICS API ====================
export const adminAnalyticsAPI = {
  getAnalytics: () => apiClient.get('/admin/analytics/analytics'),
  getFeatureFlags: () => apiClient.get('/admin/analytics/feature-flags'),
  updateFeatureFlags: (flags: Record<string, boolean>) => apiClient.put('/admin/analytics/feature-flags', flags),
  getAuditLog: (params?: Record<string, any>) => apiClient.get('/admin/analytics/audit-log', { params }),
};

export default apiClient;

