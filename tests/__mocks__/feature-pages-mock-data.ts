// Shared mock data for all feature page tests

import React from 'react';

// ======== Mock lucide-react icons ========
jest.mock('lucide-react', () => {
  const createMockIcon = (name: string) => {
    const Icon = (props: any) =>
      React.createElement('svg', {
        'data-testid': `icon-${name.toLowerCase()}`,
        ...props,
      });
    Icon.displayName = name;
    return Icon;
  };

  const icons = [
    'Activity', 'AlertCircle', 'ArrowRight', 'ArrowUpRight', 'Award',
    'BarChart3', 'Bell', 'Bot', 'Calendar', 'Check', 'CheckCircle',
    'ChevronDown', 'ChevronLeft', 'ChevronRight', 'Clock', 'Copy',
    'CreditCard', 'Download', 'DollarSign', 'Edit', 'Eye', 'ExternalLink',
    'FileText', 'Filter', 'Globe', 'HelpCircle', 'Loader2',
    'Mail', 'MapPin', 'MessageSquare', 'Mic', 'MicOff', 'Minus',
    'Moon', 'MoreHorizontal', 'Package', 'Percent', 'Phone', 'PhoneCall',
    'PhoneIncoming', 'PhoneOff', 'PhoneOutgoing', 'Play', 'Plus',
    'RefreshCw', 'Repeat', 'Search', 'Send', 'Settings', 'Share2',
    'Shield', 'ShoppingCart', 'Sparkles', 'Star', 'Sun', 'Tag',
    'Target', 'ThumbsUp', 'Trash2', 'TrendingUp', 'Truck',
    'Upload', 'User', 'UserPlus', 'Users', 'Video', 'Volume2',
    'VolumeX', 'X', 'Zap', 'AlertTriangle', 'Map',
    'Package', 'Plus as PlusIcon', 'Trash', 'Check as CheckIcon',
    'X as XIcon',
  ];

  const iconMap: Record<string, any> = {};
  icons.forEach(name => {
    const cleanName = name.replace(' as ', '-').split('-')[0].trim();
    iconMap[cleanName] = createMockIcon(cleanName);
  });

  // Add special aliases
  iconMap['PlusIcon'] = createMockIcon('plus');
  iconMap['CheckIcon'] = createMockIcon('check');
  iconMap['XIcon'] = createMockIcon('x');

  return iconMap;
});

// ======== Mock recharts ========
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children, width, height }: any) =>
    React.createElement('div', {
      'data-testid': 'recharts-container',
      style: { width: width || '100%', height: height || 300 },
    }, children),
  BarChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'recharts-barchart' }, children),
  AreaChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'recharts-areachart' }, children),
  PieChart: ({ children }: any) => React.createElement('div', { 'data-testid': 'recharts-piechart' }, children),
  Bar: () => React.createElement('div', { 'data-testid': 'recharts-bar' }),
  Area: () => React.createElement('div', { 'data-testid': 'recharts-area' }),
  Pie: ({ children }: any) => React.createElement('div', { 'data-testid': 'recharts-pie' }, children),
  Cell: () => React.createElement('div', { 'data-testid': 'recharts-cell' }),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// ======== Mock react-i18next ========
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

// ======== Mock auth store ========
jest.mock('../../src/lib/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = {
        user: { id: '1', name: 'Test User', role: 'OWNER', email: 'test@example.com' },
        business: { id: 'b1', name: 'Test Business', type: 'general', plan: 'STARTER' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        onboardingCompleted: true,
        isDemoMode: false,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        user: { id: '1', name: 'Test User', role: 'OWNER', email: 'test@example.com' },
        business: { id: 'b1', name: 'Test Business', type: 'general', plan: 'STARTER' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        onboardingCompleted: true,
        isDemoMode: false,
      }),
      subscribe: jest.fn(),
      destroy: jest.fn(),
    }
  ),
}));

// ======== Mock API modules ========
const mockApiResponse = (data: any, success = true) =>
  Promise.resolve({ data: { success, data } });

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

jest.mock('../../src/lib/api', () => ({
  __esModule: true,
  default: mockApiClient,
  apiClient: mockApiClient,
  authAPI: {
    register: jest.fn(),
    login: jest.fn(),
    googleLogin: jest.fn(),
    appleLogin: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resetPassword: jest.fn(),
    setupTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
  },
  contactsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: { contacts: [] } } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulkDelete: jest.fn(),
    import: jest.fn(),
    export: jest.fn(),
  },
  businessAPI: {
    get: jest.fn(),
    update: jest.fn(),
    getStats: jest.fn(),
  },
  whatsappAPI: {
    send: jest.fn(),
    getTemplates: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    getTemplate: jest.fn(),
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    sendMessage: jest.fn(),
    sendBulk: jest.fn(),
    getAnalytics: jest.fn(),
    getStats: jest.fn(),
    getWebhook: jest.fn(),
    setWebhook: jest.fn(),
    syncContacts: jest.fn(),
    listBroadcasts: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createBroadcast: jest.fn(),
    updateBroadcast: jest.fn(),
    deleteBroadcast: jest.fn(),
    sendBroadcast: jest.fn(),
    listAutoReplies: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createAutoReply: jest.fn(),
    updateAutoReply: jest.fn(),
    deleteAutoReply: jest.fn(),
    getAutomationStats: jest.fn(),
    startBot: jest.fn(),
    stopBot: jest.fn(),
    getBotStatus: jest.fn(),
  },
  emailAPI: {
    listTemplates: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    getTemplate: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    listDrips: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createDrip: jest.fn(),
    updateDrip: jest.fn(),
    toggleDrip: jest.fn(),
    deleteDrip: jest.fn(),
    listLists: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    createList: jest.fn(),
    deleteList: jest.fn(),
    testConnection: jest.fn(),
    saveConfig: jest.fn(),
  },
  campaignsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    schedule: jest.fn(),
    start: jest.fn(),
    pause: jest.fn(),
    stats: jest.fn(),
    send: jest.fn(),
  },
  postsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: { posts: [] } } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    schedule: jest.fn(),
  },
  analyticsAPI: {
    dashboard: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    messages: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    leads: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    reports: jest.fn(),
    exportPDF: jest.fn(),
    overview: jest.fn(),
    getOverview: jest.fn(),
  },
  reviewsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: { reviews: [] } } }),
    get: jest.fn(),
    reply: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  },
  documentsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: { documents: [] } } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    send: jest.fn(),
    share: jest.fn(),
    sign: jest.fn(),
  },
  billingAPI: {
    getCurrent: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    getInvoices: jest.fn().mockResolvedValue({ data: { success: true, data: { invoices: [] } } }),
    cancelSubscription: jest.fn(),
    upgradeSubscription: jest.fn(),
    changePlan: jest.fn(),
    updatePaymentMethod: jest.fn(),
  },
  subscriptionsAPI: {
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
  },
  automationAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggle: jest.fn(),
    getLogs: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    getTemplates: jest.fn().mockResolvedValue({ data: { success: true, data: [] } }),
  },
  aiAPI: {
    generate: jest.fn().mockResolvedValue({ data: { success: true, data: { text: 'AI response' } } }),
    chat: jest.fn(),
    analyze: jest.fn(),
    enhance: jest.fn(),
  },
  teamAPI: {
    list: jest.fn(),
    invite: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  leadsAPI: {
    list: jest.fn().mockResolvedValue({ data: { success: true, data: { contacts: [] } } }),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    bulkCreate: jest.fn(),
    bulkReply: jest.fn(),
    export: jest.fn(),
  },
  notificationsAPI: {
    list: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  },
  apiKeysAPI: { list: jest.fn(), create: jest.fn(), delete: jest.fn() },
  googleBusinessAPI: { list: jest.fn(), update: jest.fn() },
  auditLogAPI: { list: jest.fn() },
  postersAPI: { list: jest.fn(), create: jest.fn(), delete: jest.fn() },
}));

// ======== Mock react-router-dom ========
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
}));


