// Manual mock for lucide-react icons
// Uses a Proxy to auto-create any icon that's requested — no more "Element type is invalid" errors
const R = require('react');

const iconCache = new Map<string, any>();

const handler: Record<string, any> = {
  get(_target: any, name: string | symbol) {
    if (typeof name === 'string' && name !== 'then' && name !== '$$typeof') {
      if (!iconCache.has(name)) {
        const Icon = (props: Record<string, unknown>) =>
          R.createElement('svg', {
            'data-testid': `icon-${name.toLowerCase()}`,
            key: name,
            ...props,
          });
        Icon.displayName = name;
        iconCache.set(name, Icon);
      }
      return iconCache.get(name);
    }
    return undefined;
  },
  has(_target: any, _name: string | symbol) {
    return true;
  },
};

// Pre-warm commonly used icons so testid lookups are deterministic
const preWarm = [
  'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ArrowUp', 'ArrowUpLeft', 'ArrowUpRight', 'Award', 'BarChart3', 'Bell', 'Bot',
  'Building2', 'Calendar', 'Camera', 'Check', 'CheckCheck', 'CheckCircle',
  'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'Clock', 'Columns',
  'Copy', 'CreditCard', 'DollarSign', 'Download', 'Edit', 'Edit3', 'Eye',
  'ExternalLink', 'Facebook', 'FileText', 'Filter', 'Flag', 'Globe', 'Grid',
  'Headphones', 'Heart', 'HelpCircle', 'Image', 'Linkedin', 'List', 'Loader2',
  'Lock', 'LogOut', 'Mail', 'MapPin', 'Menu', 'MessageCircle', 'MessageSquare',
  'Mic', 'MicOff', 'Minus', 'Moon', 'MoreHorizontal', 'MoreVertical', 'Package',
  'Paperclip', 'Pause', 'Percent', 'Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOff',
  'PhoneOutgoing', 'PieChart', 'Play', 'Plus', 'Printer', 'QrCode', 'Radio',
  'RefreshCw', 'Repeat', 'Save', 'Search', 'Send', 'Settings', 'Share2', 'Shield',
  'ShoppingCart', 'Sliders', 'Smartphone', 'Smile', 'Sparkles', 'Star', 'Sun',
  'Table', 'Tag', 'Target', 'ThumbsUp', 'Trash2', 'TrendingUp', 'Truck', 'Twitter',
  'Upload', 'User', 'UserCheck', 'UserPlus', 'Users', 'Video', 'VideoOff',
  'Volume2', 'VolumeX', 'Wifi', 'WifiOff', 'X', 'XCircle', 'Zap',
];
preWarm.forEach((name) => {
  // Access once to prime the cache — result ignored
  handler.get({} as any, name, undefined);
});

module.exports = new Proxy({}, handler);
