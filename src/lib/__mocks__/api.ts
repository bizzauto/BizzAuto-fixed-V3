// Manual mock for the API module
// Each HTTP method gets its own jest.fn() to prevent cross-method interference
const mockApiClient = {
  get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  post: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  put: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  patch: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

const createMockAPI = (methods: Record<string, any>) => {
  const result: Record<string, any> = {};
  for (const [key, defaultValue] of Object.entries(methods)) {
    result[key] = jest.fn().mockResolvedValue(defaultValue);
  }
  return result;
};

module.exports = {
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  authAPI: {
    register: jest.fn(), login: jest.fn(), googleLogin: jest.fn(), appleLogin: jest.fn(),
    getProfile: jest.fn(), updateProfile: jest.fn(), changePassword: jest.fn(),
    sendOtp: jest.fn(), verifyOtp: jest.fn(), resetPassword: jest.fn(),
    setupTwoFactor: jest.fn(), verifyTwoFactor: jest.fn(),
  },
  contactsAPI: createMockAPI({
    list: { success: true, data: { contacts: [] } },
    get: {}, create: {}, update: {}, delete: {}, bulkDelete: {}, import: {}, export: {},
  }),
  appointmentsAPI: createMockAPI({
    list: { success: true, data: { appointments: [] } },
    get: {}, create: {}, update: {}, delete: {},
  }),
  businessAPI: createMockAPI({ get: {}, update: {}, getStats: {} }),
  whatsappAPI: {
    connect: jest.fn().mockResolvedValue({ data: { signupUrl: 'https://oauth.example.com/connect' } }),
    getStatus: jest.fn().mockResolvedValue({ data: { success: true, data: { connected: false } } }),
    send: jest.fn(), getTemplates: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createTemplate: jest.fn(), updateTemplate: jest.fn(), deleteTemplate: jest.fn(), getTemplate: jest.fn(),
    getConversations: jest.fn().mockResolvedValue({ data: { success: true, data: { conversations: [] } } }),
    getConversation: jest.fn(), sendMessage: jest.fn(), sendBulk: jest.fn(), getContacts: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    getAnalytics: jest.fn(), getStats: jest.fn().mockResolvedValue({ data: { success: true, data: { connected: false } } }),
    getWebhook: jest.fn(), setWebhook: jest.fn(),
    syncContacts: jest.fn(), listBroadcasts: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createBroadcast: jest.fn(), updateBroadcast: jest.fn(), deleteBroadcast: jest.fn(), sendBroadcast: jest.fn(),
    listAutoReplies: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    getAutoReplies: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createAutoReply: jest.fn(), updateAutoReply: jest.fn(), deleteAutoReply: jest.fn(),
    getAutomationStats: jest.fn(), startBot: jest.fn(), stopBot: jest.fn(), getBotStatus: jest.fn(),
  },
  emailAPI: createMockAPI({
    listTemplates: { success: true, data: [] }, getTemplate: {}, createTemplate: {},
    updateTemplate: {}, deleteTemplate: {}, listDrips: { success: true, data: [] },
    createDrip: {}, updateDrip: {}, toggleDrip: {}, deleteDrip: {},
    listLists: { success: true, data: [] }, createList: {}, deleteList: {},
    testConnection: {}, saveConfig: {},
  }),
  campaignsAPI: createMockAPI({
    list: { success: true, data: [] }, get: {}, create: {}, update: {}, delete: {},
    schedule: {}, start: {}, pause: {}, stats: {}, send: {},
  }),
  postsAPI: createMockAPI({
    list: { success: true, data: { posts: [] } }, get: {}, create: {}, update: {},
    delete: {}, schedule: {},
  }),
  analyticsAPI: createMockAPI({
    dashboard: { success: true, data: {} }, messages: { success: true, data: {} },
    leads: { success: true, data: {} }, reports: {}, exportPDF: {}, overview: {}, getOverview: {},
  }),
  reviewsAPI: createMockAPI({
    list: { success: true, data: { reviews: [] } }, get: {}, reply: {}, create: {}, delete: {}, request: {},
  }),
  documentsAPI: createMockAPI({
    list: { success: true, data: { documents: [] } }, get: {}, create: {}, update: {},
    delete: {}, send: {}, share: {}, sign: {},
  }),
  billingAPI: createMockAPI({
    getCurrent: { success: true, data: {} },
    getInvoices: { success: true, data: { invoices: [] } },
    cancelSubscription: {}, upgradeSubscription: {}, changePlan: {}, updatePaymentMethod: {},
  }),
  subscriptionsAPI: createMockAPI({ get: {}, list: {}, create: {} }),
  automationAPI: createMockAPI({
    list: { success: true, data: [] }, get: {}, create: {}, update: {}, delete: {},
    toggle: {}, getLogs: {}, updateRule: {},
    getTemplates: { success: true, data: [] },
    listRules: { success: true, data: [] },
    getSettings: { success: true, data: {} },
    getN8nStatus: { success: true, data: {} },
    toggleRule: {}, deleteRule: {}, createRule: {}, updateSettings: {},
  }),
  aiAPI: createMockAPI({
    generate: { success: true, data: { text: 'AI response' } }, chat: {}, analyze: {}, enhance: {},
  }),
  teamAPI: createMockAPI({ list: {}, invite: {}, update: {}, remove: {} }),
  leadsAPI: createMockAPI({
    list: { success: true, data: { contacts: [] } }, get: {}, create: {}, update: {},
    delete: {}, bulkCreate: {}, bulkReply: {}, export: {},
  }),
  notificationsAPI: createMockAPI({ list: {}, markRead: {}, markAllRead: {} }),
  apiKeysAPI: createMockAPI({ list: {}, create: {}, delete: {} }),
  googleBusinessAPI: createMockAPI({ list: {}, update: {} }),
  auditLogAPI: createMockAPI({ list: {} }),
  postersAPI: createMockAPI({ list: {}, create: {}, delete: {} }),
  instagramAPI: createMockAPI({
    connect: {}, disconnect: {}, getStatus: {},
    getAccount: {}, uploadMedia: {}, createContainer: {},
    createCarouselContainer: {}, checkContainerStatus: {},
    publishContainer: {}, publish: {}, publishCarousel: {},
    publishPost: {}, getMedia: {}, getMediaInsights: {},
  }),
  socialAccountsAPI: createMockAPI({
    list: { success: true, data: [] },
    getStatus: {}, connect: {}, disconnect: {},
    connectFacebook: {}, disconnectFacebook: {},
    connectLinkedIn: {}, disconnectLinkedIn: {},
    connectTwitter: {}, disconnectTwitter: {},
    connectYouTube: {}, disconnectYouTube: {},
  }),
  webhooksAPI: createMockAPI({ list: {}, create: {}, update: {}, delete: {}, test: {} }),
  conversationsAPI: createMockAPI({ list: {}, getStats: {}, get: {}, reply: {}, markRead: {}, archive: {} }),
  leadFinderAPI: createMockAPI({ search: {}, analyze: {}, import: {}, history: {}, score: {}, bulkScore: {}, leads: {} }),
  funnelAPI: createMockAPI({ list: {}, get: {}, create: {}, update: {}, delete: {}, preview: {}, getTemplates: {}, cloneTemplate: {}, getAnalytics: {}, addPage: {}, updatePage: {}, deletePage: {}, togglePagePublish: {} }),
  workflowsAPI: createMockAPI({ list: {}, get: {}, create: {}, update: {}, delete: {}, toggle: {}, run: {}, getRuns: {}, getExecution: {}, getDeployTemplates: {}, deployTemplate: {}, generateWithAI: {} }),
  paymentLinksAPI: createMockAPI({ list: {}, get: {}, create: {}, update: {}, delete: {}, getTransactions: {}, send: {}, verifyTransaction: {} }),
  uploadAPI: createMockAPI({ upload: {}, uploadMultiple: {}, list: {}, delete: {}, getStats: {} }),
  claudeWhatsAppAPI: createMockAPI({ getConfig: {}, saveConfig: {}, getChannels: {}, getStatus: {}, send: {}, sendBulk: {}, optimize: {}, testChannel: {}, getCostStats: {} }),
  unofficialWhatsAppAPI: createMockAPI({ getConfig: {}, saveConfig: {}, getProviders: {}, getStatus: {}, connect: {}, logout: {}, test: {}, checkNumber: {}, send: {}, sendBulk: {} }),
  settingsAPI: createMockAPI({ getWhiteLabel: {}, updateWhiteLabel: {} }),
  crmInvoicesAPI: createMockAPI({ list: {}, create: {}, update: {}, markPaid: {}, delete: {} }),
  dealsAPI: createMockAPI({ list: {}, stats: {}, updateStage: {}, update: {} }),
  pipelinesAPI: createMockAPI({ list: {}, create: {}, addStage: {}, delete: {} }),
  goalsAPI: createMockAPI({ list: {}, create: {}, update: {}, delete: {} }),
  ledgerAPI: createMockAPI({ list: {}, stats: {}, create: {}, update: {}, delete: {} }),
  superAdminAPI: createMockAPI({ getStats: {}, getGrowth: {}, listBusinesses: {}, getBusiness: {}, updateBusinessPlan: {}, toggleBusinessStatus: {}, listUsers: {}, changeUserRole: {}, toggleUserStatus: {}, deleteUser: {}, listSubscriptions: {}, listBackgrounds: {}, createBackground: {}, updateBackground: {}, deleteBackground: {}, getSettings: {} }),
};
