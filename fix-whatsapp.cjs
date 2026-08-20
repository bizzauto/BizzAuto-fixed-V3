const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'WhatsAppModule.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('File loaded, length:', content.length);
console.log('Contains MOCK_CONTACTS:', content.includes('MOCK_CONTACTS'));
console.log('Contains MOCK_TEMPLATES:', content.includes('MOCK_TEMPLATES'));
console.log('Contains MOCK_AUTO_REPLIES:', content.includes('MOCK_AUTO_REPLIES'));
console.log('Contains generateMessages:', content.includes('generateMessages'));

// 1. Replace MOCK DATA section with API helpers
const mockStart = content.indexOf('// ============================================================\n// MOCK DATA');
const mockEnd = content.indexOf('// ============================================================\n// EVOLUTION API');

if (mockStart !== -1 && mockEnd !== -1) {
  const newHelpers = `// ============================================================
// API HELPERS
// ============================================================

const fetchTemplates = async (): Promise<WATemplate[]> => {
  try {
    const res = await whatsappAPI.getTemplates();
    const data = res?.data?.data || res?.data || [];
    return Array.isArray(data) ? data.map((t: any) => ({
      id: t.id || t.templateId || String(Math.random()),
      name: t.name || '',
      category: t.category || 'MARKETING',
      language: t.language || 'en',
      status: t.status || 'pending',
      content: t.content || t.body?.text || '',
      variables: t.variables || [],
      buttons: t.buttons || undefined,
      header: t.header || undefined,
      footer: t.footer || undefined,
    })) : [];
  } catch {
    return [];
  }
};

const fetchAutoReplies = async (): Promise<AutoReplyRule[]> => {
  try {
    const res = await apiClient.get('/settings/whatsapp/auto-replies');
    const data = res?.data?.data || res?.data || [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

`;
  content = content.substring(0, mockStart) + newHelpers + content.substring(mockEnd);
  console.log('Step 1: Replaced MOCK DATA with API helpers');
} else {
  console.log('Step 1: SKIP - mock section not found, start:', mockStart, 'end:', mockEnd);
}

// 2. Fix selectContact - make async and replace generateMessages
content = content.replace(
  'const selectContact = useCallback((contact: WAContact) => {\n    setSelectedContact(contact);\n    setMessages(generateMessages(contact.id));',
  `const selectContact = useCallback(async (contact: WAContact) => {
    setSelectedContact(contact);
    // Fetch messages from API
    try {
      const res = await tryAPI(
        () => evolutionAPI.getMessages({ instanceName: evolutionInstanceName, remoteJid: contact.phone + '@s.whatsapp.net', count: 50 }),
        [] as WAMessage[]
      );
      const apiMsgs = Array.isArray(res) ? res : (res as any)?.messages || [];
      setMessages(apiMsgs.length > 0 ? apiMsgs.map((m: any, i: number) => ({
        id: m.key?.id || 'msg-' + i,
        content: m.message?.conversation || m.message?.extendedTextMessage?.text || '',
        timestamp: m.messageTimestamp ? new Date(parseInt(m.messageTimestamp) * 1000).toISOString() : new Date().toISOString(),
        time: m.messageTimestamp ? new Date(parseInt(m.messageTimestamp) * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        direction: m.key?.fromMe ? 'outbound' as const : 'inbound' as const,
        status: m.key?.fromMe ? 'delivered' as const : 'read' as const,
        type: 'text' as const,
      })) : []);
    } catch {
      setMessages([]);
    }`
);
console.log('Step 2: Replaced generateMessages call');

// 3. Add templates state to ChatView
content = content.replace(
  "const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');",
  `const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [templates, setTemplates] = useState<WATemplate[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);`
);
console.log('Step 3: Added templates state to ChatView');

// 4. Replace MOCK_TEMPLATES in ChatView template panel
content = content.replace(
  'MOCK_TEMPLATES.filter(t => t.status === \'approved\').slice(0, 4).map',
  'templates.filter(t => t.status === \'approved\').slice(0, 4).map'
);
console.log('Step 4: Replaced MOCK_TEMPLATES in ChatView');

// 5. Fix BroadcastView - add contacts/templates state, replace MOCK references
content = content.replace(
  `const BroadcastView: React.FC = () => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WATemplate | null>(null);
  const [step, setStep] = useState<'select' | 'compose' | 'preview' | 'sent'>('select');
  const [broadcastName, setBroadcastName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterTag, setFilterTag] = useState('all');

  const allTags = Array.from(new Set(MOCK_CONTACTS.flatMap(c => c.tags)));
  const filteredContacts = MOCK_CONTACTS.filter(c => {`,
  `const BroadcastView: React.FC = () => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WATemplate | null>(null);
  const [step, setStep] = useState<'select' | 'compose' | 'preview' | 'sent'>('select');
  const [broadcastName, setBroadcastName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterTag, setFilterTag] = useState('all');
  const [broadcastContacts, setBroadcastContacts] = useState<WAContact[]>([]);
  const [broadcastTemplates, setBroadcastTemplates] = useState<WATemplate[]>([]);

  useEffect(() => {
    tryAPI(() => evolutionAPI.getChats(''), [] as any).then(res => {
      const data = Array.isArray(res) ? res : (res as any)?.chats || [];
      setBroadcastContacts(data.map((c: any, i: number) => ({
        id: c.id?.remoteJid || String(i), name: c.name || c.pushName || c.id?.remoteJid?.replace('@s.whatsapp.net','') || 'Unknown',
        phone: c.id?.remoteJid?.replace('@s.whatsapp.net','') || '', avatar: '', lastMessage: '', lastMessageTime: '',
        unreadCount: c.unreadCount || 0, online: false, tags: [], isGroup: !!c.id?.remoteJid?.startsWith('@g.us'),
      })));
    }).catch(() => setBroadcastContacts([]));
    fetchTemplates().then(setBroadcastTemplates);
  }, []);

  const allTags = Array.from(new Set(broadcastContacts.flatMap(c => c.tags)));
  const filteredContacts = broadcastContacts.filter(c => {`
);
console.log('Step 5: Fixed BroadcastView contacts and templates');

// 6. Replace MOCK_TEMPLATES in BroadcastView compose step
content = content.replace(
  'MOCK_TEMPLATES.filter(t => t.status === \'approved\').map',
  'broadcastTemplates.filter(t => t.status === \'approved\').map'
);
console.log('Step 6: Replaced MOCK_TEMPLATES in BroadcastView');

// 7. Fix TemplateManagerView
content = content.replace(
  `const TemplateManagerView: React.FC = () => {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);`,
  `const TemplateManagerView: React.FC = () => {
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    fetchTemplates().then(t => { setTemplates(t); setTemplatesLoading(false); });
  }, []);`
);
console.log('Step 7: Fixed TemplateManagerView');

// 8. Fix WhatsAppSettingsView auto-replies
content = content.replace(
  'const [autoReplies, setAutoReplies] = useState(MOCK_AUTO_REPLIES);',
  `const [autoReplies, setAutoReplies] = useState<AutoReplyRule[]>([]);
  const [autoRepliesLoading, setAutoRepliesLoading] = useState(true);

  useEffect(() => {
    fetchAutoReplies().then(r => { setAutoReplies(r); setAutoRepliesLoading(false); });
  }, []);`
);
console.log('Step 8: Fixed WhatsAppSettingsView auto-replies');

fs.writeFileSync(filePath, content);
console.log('\nALL DONE - WhatsAppModule.tsx updated!');
console.log('Contains MOCK_CONTACTS after:', content.includes('MOCK_CONTACTS'));
console.log('Contains MOCK_TEMPLATES after:', content.includes('MOCK_TEMPLATES'));
console.log('Contains MOCK_AUTO_REPLIES after:', content.includes('MOCK_AUTO_REPLIES'));
console.log('Contains generateMessages after:', content.includes('generateMessages'));
