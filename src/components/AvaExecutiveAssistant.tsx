import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Send, Volume2, VolumeX, Bot, User, Globe, Briefcase, Settings, TrendingUp, Users, Calendar, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'briefing' | 'metric' | 'alert' | 'normal';
  data?: any;
}

interface BriefingData {
  greeting: string;
  date: string;
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
    topDeals: { contact: string; value: number; stage: string }[];
  };
  sales: {
    dealsWonToday: number;
    dealsWonWeek: number;
    totalPipelineValue: number;
    conversionRate: number;
  };
  leads: {
    newToday: number;
    totalActive: number;
    hotLeads: { name: string; score: number }[];
    needsFollowUp: { name: string; daysSince: number }[];
  };
  pipeline: {
    totalValue: number;
    stuckDeals: { contact: string; daysInStage: number }[];
  };
  appointments: {
    today: number;
    tomorrow: number;
    missed: number;
  };
  support: {
    openTickets: number;
    urgentTickets: number;
  };
  alerts: { type: string; message: string }[];
  recommendations: string[];
}

// Welcome messages in all languages
const WELCOME_MESSAGES: Record<string, string> = {
  'en-IN': 'Good day! I\'m Ava, your AI Executive Assistant. I can help with revenue, leads, pipeline, appointments, and more. Say "Good morning" for a full briefing. How can I assist you today?',
  'hi-IN': 'नमस्ते! मैं आपकी AI एग्ज़ीक्यूटिव असिस्टेंट Ava हूँ। मैं रेवेन्यू, लीड्स, पाइपलाइन, अपॉइंटमेंट में मदद कर सकती हूँ। "सुबह का अपडेट" बोलें पूरी जानकारी के लिए। आज मैं आपकी कैसे सहायता कर सकती हूँ?',
  'mr-IN': 'नमस्कार! मी तुमची AI एग्ज़ीक्यूटिव असिस्टेंट Ava आहे। मी रेव्हेन्यू, लीड्स, पाइपलाइन, अपॉइंटमेंटमध्ये मदत करू शकते। "सकाळचा अपडेट" बोला पूर्ण माहितीसाठी। आज मी तुम्हाला कशी मदत करू शकते?',
  'gu-IN': 'નમસ્તે! હું તમારી AI એક્ઝિક્યુટિવ આસિસ્ટન્ટ Ava છુઁ। હું રેવન્યુ, લીડ્સ, પાઇપલાઇન, એપોઇન્ટમેન્ટમાં મદદ કરી શકું છું। "સવારનું અપડેટ" બોલો સંપૂર્ણ માહિતી માટે। આજે હું તમને કેવી રીતે મદદ કરી શકું?',
  'ta-IN': 'வணக்கம்! நான் உங்கள் AI நிர்வாக உதவியாளர் Ava. வருவாய், லீட்கள், பைப்லைன், சந்திப்புகளில் உதவ முடியும். "காலை அப்டேட்" என்று சொல்லுங்கள். இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?',
  'te-IN': 'నమస్తే! నేను మీ AI ఎగ్జిక్యూటివ్ అసిస్టెంట్ Ava. రెవెన్యూ, లీడ్స్, పైప్‌లైన్, అపాయింట్‌మెంట్లలో సహాయం చేయగలను. "ఉదయం అప్డేట్" అనండి. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?',
  'bn-IN': 'নমস্কার! আমি আপনার AI এক্সিকিউটিভ অ্যাসিস্ট্যান্ট Ava। রেভিনিউ, লিড, পাইপলাইন, অ্যাপয়েন্টমেন্টে সাহায্য করতে পারি। "সকালের আপডেট" বলুন। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
  'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಕಾರ್ಯನಿರ್ವಾಹಕ ಸಹಾಯಕ Ava. ಆದಾಯ, ಲೀಡ್‌ಗಳು, ಪೈಪ್‌ಲೈನ್, ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. "ಬೆಳಿಗ್ಗೆ ಅಪ್ಡೇಟ್" ಎಂದು ಹೇಳಿ. ಇಂದು ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?',
  'ml-IN': 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI എക്സിക്യൂട്ടീവ് അസിസ്റ്റന്റ് Ava. വരുമാനം, ലീഡുകൾ, പൈപ്പ്‌ലൈൻ, അപ്പോയിൻറ്റ്‌മെന്റുകൾ എന്നിവയിൽ സഹായിക്കാം. "രാവിലെ അപ്ഡേറ്റ്" പറയുക. ഇന്ന് ഞാൻ എങ്ങനെ സഹായിക്കാം?',
  'pa-IN': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ AI ਐਗ਼ਜ਼ੀਕਿਊਟਿਵ ਅਸਿਸਟੈਂਟ Ava ਹਾਂ। ਰੈਵਨਿਊ, ਲੀਡਜ਼, ਪਾਈਪਲਾਈਨ, ਅਪਾਇਂਟਮੈਂਟ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ। "ਸਵੇਰ ਦਾ ਅਪਡੇਟ" ਬੋਲੋ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?'
};

const AvaExecutiveAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>('en-IN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputTextRef = useRef<string>('');
  const navigate = useNavigate();
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  const LANGUAGES = [
    { code: 'en-IN', name: 'English', nativeName: 'English', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  ];

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: '0',
      text: WELCOME_MESSAGES[selectedLang] || WELCOME_MESSAGES['en-IN'],
      isUser: false,
      timestamp: new Date(),
      type: 'normal'
    }]);
  }, []); // Only on mount

  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
    return () => {
      synthesisRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (text: string, isUser: boolean, type: Message['type'] = 'normal', data?: any) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        isUser,
        timestamp: new Date(),
        type,
        data
      },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const fetchBriefing = async () => {
    setIsLoadingBriefing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ava/briefing', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBriefing(data.data);
        setShowBriefing(true);
        
        // Add briefing message
        const b = data.data;
        let briefingText = `${b.greeting}\n\n📊 Executive Briefing - ${b.date}\n\n`;
        briefingText += `💰 Revenue\n• Today: ${formatCurrency(b.revenue.today)}\n• This Month: ${formatCurrency(b.revenue.thisMonth)} (${b.revenue.growth > 0 ? '+' : ''}${b.revenue.growth}%)\n\n`;
        briefingText += `📈 Sales\n• Won Today: ${b.sales.dealsWonToday}\n• Pipeline: ${formatCurrency(b.sales.totalPipelineValue)}\n• Conversion: ${b.sales.conversionRate}%\n\n`;
        briefingText += `👥 Leads\n• New Today: ${b.leads.newToday}\n• Active: ${b.leads.totalActive}\n\n`;
        briefingText += `📅 Appointments\n• Today: ${b.appointments.today}\n• Tomorrow: ${b.appointments.tomorrow}`;
        
        if (b.alerts.length > 0) {
          briefingText += `\n\n⚠️ Alerts\n${b.alerts.map((a: any) => `• ${a.message}`).join('\n')}`;
        }
        
        if (b.recommendations.length > 0) {
          briefingText += `\n\n💡 Recommendations\n${b.recommendations.map((r: string) => `• ${r}`).join('\n')}`;
        }
        
        addMessage(briefingText, false, 'briefing', b.data);
        speakText(`Here's your briefing for ${b.date}. Revenue today is ${formatCurrency(b.revenue.today)}. You have ${b.leads.newToday} new leads and ${b.appointments.today} appointments today.`);
      }
    } catch (error) {
      addMessage('I apologize, but I\'m unable to fetch the briefing at the moment. Please try again later.', false);
    }
    setIsLoadingBriefing(false);
  };

  const speakText = async (text: string) => {
    if (isMuted || !text) return;
    
    // Stop any current speech
    synthesisRef.current?.cancel();
    setIsSpeaking(true);
    
    console.log('Ava speaking with language:', selectedLang);
    
    try {
      // Try Edge TTS with NeerjaNeural voice (BEST quality - FREE)
      const response = await fetch('/api/jimi/tts/edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          lang: selectedLang || 'en-IN',
          voiceStyle: 'professional'  // Executive assistant tone - NeerjaNeural
        })
      });
      
      const data = await response.json();
      console.log('Edge TTS response:', data.engine || 'fallback');
      
      if (data.audio && !data.fallback) {
        // Play Edge TTS audio (NeerjaNeural voice)
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.volume = 1.0;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          speakWithBrowser(text);
        };
        await audio.play();
        return;
      }
    } catch (error) {
      console.log('Edge TTS failed, using browser fallback:', error);
    }
    
    // Fallback to browser SpeechSynthesis with Neerja voice
    speakWithBrowser(text);
  };

  const speakWithBrowser = (text: string) => {
    if (!synthesisRef.current) {
      setIsSpeaking(false);
      return;
    }
    
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language based on selected language
    utterance.lang = selectedLang || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Find Neerja or any Indian English female voice
    const voices = synthesisRef.current.getVoices();
    console.log('Available voices:', voices.filter(v => v.lang.includes('IN')).map(v => `${v.name} (${v.lang})`));
    
    // Priority: Neerja > Neural > Indian > Female
    const preferredVoice = voices.find(v => 
      v.name.includes('Neerja')
    ) || voices.find(v => 
      v.name.includes('Neural')
    ) || voices.find(v => 
      v.lang === 'en-IN' && v.name.includes('Female')
    ) || voices.find(v => 
      v.lang.startsWith('hi') || v.lang.startsWith('en-IN')
    ) || voices.find(v => 
      v.lang.includes('IN')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log('Using voice:', preferredVoice.name, preferredVoice.lang);
    } else {
      console.log('No Indian voice found, using default');
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthesisRef.current?.cancel();
    setIsSpeaking(false);
    // Also stop any Edge TTS audio
    const audios = document.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  const handleSendMessage = async (overrideText?: string) => {
    const messageToSend = overrideText || inputTextRef.current || inputText;
    if (!messageToSend.trim()) return;

    const userMessage = messageToSend.trim();
    setInputText('');
    inputTextRef.current = '';
    setIsTyping(true);

    addMessage(userMessage, true);

    // Check for briefing request
    const lower = userMessage.toLowerCase();
    if (lower.includes('good morning') || lower.includes('briefing') || lower.includes('status') || lower.includes('update') || lower.includes('शुभ प्रभात') || lower.includes('ब्रीफिंग') || lower.includes('बताओ') || lower.includes('क्या चल रहा') || lower.includes('how are you') || lower.includes('कैसे हो')) {
      await fetchBriefing();
      setIsTyping(false);
      return;
    }

    // Check for specific commands
    if (lower.includes('revenue') || lower.includes('पैसा') || lower.includes('कमाई') || lower.includes('income') || lower.includes('रुपय') || lower.includes('प्रॉफिट') || lower.includes('profit')) {
      await handleCommand('revenue');
      setIsTyping(false);
      return;
    }

    if (lower.includes('leads') || lower.includes('लीड') || lower.includes('customers') || lower.includes('ग्राहक') || lower.includes('क्लाइंट')) {
      await handleCommand('leads');
      setIsTyping(false);
      return;
    }

    if (lower.includes('pipeline') || lower.includes('deals') || lower.includes('डील') || lower.includes('सौदे') || lower.includes('डील्स')) {
      await handleCommand('pipeline');
      setIsTyping(false);
      return;
    }

    if (lower.includes('appointment') || lower.includes('meeting') || lower.includes('मीटिंग') || lower.includes('अपॉइंटमेंट') || lower.includes('बुकिंग') || lower.includes('शेड्यूल')) {
      await handleCommand('appointments');
      setIsTyping(false);
      return;
    }

    // Check for navigation commands
    const navHandled = handleNavigation(userMessage);
    if (navHandled) {
      setIsTyping(false);
      return;
    }

    // General AI chat
    try {
      const token = localStorage.getItem('token');
      const history = messages.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await fetch('/api/ava/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: userMessage, history, language: selectedLang })
      });

      const data = await response.json();
      if (data.success) {
        addMessage(data.data.text, false);
        speakText(data.data.text);
      } else {
        const errorMessages: Record<string, string> = {
          'en-IN': 'I apologize, but I encountered an issue. Please try again.',
          'hi-IN': 'माफ़ कीजिये, कुछ समस्या हुई। कृपया दोबारा कोशिश करें।',
          'mr-IN': 'माफ करा, काही समस्या झाली. कृपया पुन्हा प्रयत्न करा.',
          'gu-IN': 'માફ કરશો, કંઈક સમસ્યા થઈ. કૃપા કરીને ફરી પ્રયાસ કરો.',
          'ta-IN': 'மன்னிக்கவும், ஏதோ பிரச்சனை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
          'te-IN': 'క్షమించండి, ఏదో సమస్య వచ్చింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
          'bn-IN': 'দুঃখিত, কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          'kn-IN': 'ಕ್ಷಮಿಸಿ, ಏನೋ ತೊಂದರೆ ಆಯಿತು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
          'ml-IN': 'ക്ഷമിക്കണം, എന്തോ പ്രശ്നം സംഭവിച്ചു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
          'pa-IN': 'ਮਾਫ਼ ਕਰਨਾ, ਕੁਝ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
        };
        addMessage(errorMessages[selectedLang] || errorMessages['en-IN'], false);
      }
    } catch (error) {
      const connectivityMessages: Record<string, string> = {
        'en-IN': 'I apologize, but I\'m experiencing a connectivity issue. Please try again.',
        'hi-IN': 'माफ़ कीजिये, कनेक्टिविटी में समस्या है। कृपया दोबारा कोशिश करें।',
        'mr-IN': 'माफ करा, कनेक्टिव्हिटीमा समस्या आहे. कृपया पुन्हा प्रयत्न करा.',
        'gu-IN': 'માફ કરશો, કનેક્ટિવિટીમાં સમસ્યા છે. કૃપા કરીને ફરી પ્રયાસ કરો.',
        'ta-IN': 'மன்னிக்கவும், இணைப்பில் பிரச்சனை. மீண்டும் முயற்சிக்கவும்.',
        'te-IN': 'క్షమించండి, కనెక్టివిటీ సమస్య ఉంది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
        'bn-IN': 'দুঃখিত, সংযোগ সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        'kn-IN': 'ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕ ಸಮಸ್ಯೆ ಇದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        'ml-IN': 'ക്ഷമിക്കണം, കണക്റ്റിവിറ്റി പ്രശ്നം ഉണ്ട്. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
        'pa-IN': 'ਮਾਫ਼ ਕਰਨਾ, ਕਨੈਕਟਿਵਿਟੀ ਸਮੱਸਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
      };
      addMessage(connectivityMessages[selectedLang] || connectivityMessages['en-IN'], false);
    }

    setIsTyping(false);
  };

  const handleCommand = async (command: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ava/command', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
      });

      const data = await response.json();
      if (data.success) {
        addMessage(data.message, false, 'metric', data.data);
        speakText(data.message);
      }
    } catch (error) {
      addMessage('I apologize, but I couldn\'t fetch the data. Please try again.', false);
    }
  };

  const handleNavigation = (text: string) => {
    const lower = text.toLowerCase();
    
    // Navigation routes with English + Hindi keywords
    const routes: Record<string, string[]> = {
      '/dashboard': ['dashboard', 'home', 'डैशबोर्ड', 'होम', 'मुख्य पृष्ठ'],
      '/leads': ['leads', 'lead', 'contacts', 'contact', 'लीड', 'लीड्स', 'संपर्क', 'ग्राहक', 'customers'],
      '/whatsapp': ['whatsapp', 'message', 'chat', 'व्हाट्सएप', 'मैसेज', 'चैट', 'संदेश'],
      '/campaigns': ['campaigns', 'campaign', 'कैंपेन', 'प्रचार', 'promotion'],
      '/analytics': ['analytics', 'insights', 'reports', 'data', 'एनालिटिक्स', 'रिपोर्ट', 'डेटा', 'आंकड़े'],
      '/settings': ['settings', 'setting', 'config', 'सेटिंग्स', 'कॉन्फ़िग'],
      '/appointments': ['appointments', 'appointment', 'calendar', 'schedule', 'meeting', 'अपॉइंटमेंट', 'कैलेंडर', 'शेड्यूल', 'मीटिंग', 'बुकिंग'],
      '/social': ['social', 'social media', 'facebook', 'instagram', 'सोशल', 'सोशल मीडिया'],
      '/email-marketing': ['email', 'mail', 'ईमेल', 'मेल', 'ईमेल मार्केटिंग'],
      '/reviews': ['reviews', 'review', 'rating', 'रिव्यू', 'समीक्षा', 'रेटिंग'],
      '/creative': ['creative', 'poster', 'design', 'क्रिएटिव', 'पोस्टर', 'डिज़ाइन'],
      '/workflows': ['automation', 'workflow', 'automate', 'ऑटोमेशन', 'वर्कफ़्लो'],
      '/deals': ['deals', 'deal', 'डील', 'डील्स', 'सौदे'],
      '/pipelines': ['pipeline', 'pipeline', 'पाइपलाइन'],
      '/team': ['team', 'members', 'staff', 'टीम', 'सदस्य', 'कर्मचारी'],
      '/documents': ['documents', 'files', 'docs', 'दस्तावेज़', 'फ़ाइलें', 'डॉक्स'],
      '/crm': ['crm', 'customer relationship', 'सीआरएम'],
      '/ecommerce': ['ecommerce', 'e-commerce', 'store', 'shop', 'ई-कॉमर्स', 'स्टोर', 'दुकान'],
      '/subscriptions': ['subscription', 'billing', 'plan', 'सब्सक्रिप्शन', 'बिलिंग', 'प्लान'],
    };

    // Check for navigation keywords
    const navKeywords = ['open', 'go to', 'navigate', 'show', 'खोलो', 'जाओ', 'दिखाओ', 'ले चलो', 'खोल', 'जा'];
    const isNavCommand = navKeywords.some(kw => lower.includes(kw));

    // Find matching route
    for (const [route, keywords] of Object.entries(routes)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          const displayName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
          addMessage(`Opening ${displayName}...`, false);
          setTimeout(() => navigate(route), 300);
          return;
        }
      }
    }

    // If it's a navigation command but no route matched
    if (isNavCommand) {
      addMessage('I can open: Dashboard, Leads, WhatsApp, Campaigns, Analytics, Settings, Appointments, Social Media, Email, Reviews, Creative, Workflows, Deals, Pipeline, Team, Documents, CRM, E-Commerce, or Subscriptions. Which one?', false);
    } else {
      // Not a navigation command - return false to let AI chat handle it
      return false;
    }
    return true;
  };

  const handleToggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage('Speech recognition is not supported in your browser. Please use Chrome or Edge.', false);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLang;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      inputTextRef.current = transcript;
      setIsListening(false);
      // Auto-send after voice input with the transcript directly
      setTimeout(() => {
        handleSendMessage(transcript);
      }, 200);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setIsListening(true);
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      stopSpeaking();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-800'
            : isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-gradient-to-r from-slate-700 to-blue-600 hover:from-slate-800 hover:to-blue-700'
        }`}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : isListening ? (
          <MicOff size={24} className="text-white" />
        ) : (
          <span className="text-2xl">👩‍💼</span>
        )}
      </button>

      {/* Listening Indicator */}
      {isListening && !isOpen && (
        <div className="fixed bottom-36 right-6 z-50 bg-slate-700 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          🎤 Listening...
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-38 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: '600px', maxHeight: 'calc(100vh - 150px)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-blue-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                👩‍💼
              </div>
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Ava Executive Assistant
                </h3>
                <p className="text-white/80 text-xs">
                  {isListening ? '🎤 Listening...' : isTyping ? '🧠 Processing...' : isSpeaking ? '🔊 Speaking...' : 'Ready to assist'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Briefing Button */}
              <button
                onClick={fetchBriefing}
                disabled={isLoadingBriefing}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Get Daily Briefing"
              >
                <RefreshCw size={18} className={`text-white ${isLoadingBriefing ? 'animate-spin' : ''}`} />
              </button>
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors flex items-center gap-1"
                  title="Change Language"
                >
                  <Globe size={18} className="text-white" />
                  <span className="text-white text-xs hidden sm:inline">
                    {LANGUAGES.find(l => l.code === selectedLang)?.nativeName}
                  </span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                    {/* Preview Button */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => {
                          speakText('Hello! I am Ava, your executive assistant. Neerja voice is active.');
                        }}
                        className="w-full px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center justify-center gap-1"
                      >
                        🔊 Preview Voice
                      </button>
                    </div>
                    {/* Language List */}
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setShowLangMenu(false);
                          // Speak confirmation in selected language
                          const confirmTexts: Record<string, string> = {
                            'en-IN': 'Language changed to English. Neerja voice active.',
                            'hi-IN': 'भाषा हिंदी में बदल दी गई। नीरजा आवाज़ सक्रिय।',
                            'mr-IN': 'भाषा मराठीत बदलली. नीरजा आवाज सक्रिय.',
                            'gu-IN': 'ભાષા ગુજરાતીમાં બદલી. નીરજા અવાજ સક્રિય.',
                            'ta-IN': 'மொழி தமிழில் மாற்றப்பட்டது. நீரஜா குரல் செயல்படுகிறது.',
                            'te-IN': 'భాషా తెలుగులో మార్చబడింది. నీరజా వాయిస్ యాక్టివ్.',
                            'bn-IN': 'ভাষা বাংলায় পরিবর্তন করা হয়েছে। নীরজা ভয়েস সক্রিয়।',
                            'kn-IN': 'ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ನೀರಜಾ ಧ್ವನಿ ಸಕ್ರಿಯ.',
                            'ml-IN': 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി. നീരജ വോയ്സ് ആക്റ്റീവ്.',
                            'pa-IN': 'ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲੀ। ਨੀਰਜਾ ਵੌਿਸ ਐਕਟਿਵ।'
                          };
                          setTimeout(() => {
                            speakText(confirmTexts[lang.code] || 'Language changed');
                          }, 300);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedLang === lang.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <div className="flex-1">
                          <div className="font-medium">{lang.nativeName}</div>
                          <div className="text-xs text-gray-400">{lang.name}</div>
                        </div>
                        {selectedLang === lang.code && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX size={18} className="text-white" />
                ) : (
                  <Volume2 size={18} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Briefing Panel */}
          {showBriefing && briefing && (
            <div className="bg-gradient-to-r from-slate-600 to-blue-500 px-4 py-3 border-b border-slate-500 overflow-y-auto" style={{ maxHeight: '200px' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold text-sm">📊 Quick Overview</h4>
                <button onClick={() => setShowBriefing(false)} className="text-white/70 hover:text-white">
                  <ChevronUp size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-white/70">Revenue Today</div>
                  <div className="text-white font-bold">{formatCurrency(briefing.revenue.today)}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-white/70">Pipeline</div>
                  <div className="text-white font-bold">{formatCurrency(briefing.pipeline.totalValue)}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-white/70">New Leads</div>
                  <div className="text-white font-bold">{briefing.leads.newToday}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="text-white/70">Appointments</div>
                  <div className="text-white font-bold">{briefing.appointments.today}</div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    msg.isUser
                      ? 'bg-gradient-to-r from-slate-700 to-blue-600 text-white rounded-br-md'
                      : msg.type === 'briefing'
                      ? 'bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/30 text-gray-900 dark:text-white rounded-bl-md border border-blue-200 dark:border-blue-700'
                      : msg.type === 'metric'
                      ? 'bg-green-50 dark:bg-green-900/30 text-gray-900 dark:text-white rounded-bl-md border border-green-200 dark:border-green-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!msg.isUser && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-slate-700 to-blue-600 flex items-center justify-center shrink-0">
                        <Bot size={14} className="text-white" />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    {msg.isUser && (
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <User size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-slate-700 to-blue-600 flex items-center justify-center">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={fetchBriefing}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap flex items-center gap-1"
              >
                <RefreshCw size={12} /> Briefing
              </button>
              <button
                onClick={() => handleCommand('revenue')}
                className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 whitespace-nowrap flex items-center gap-1"
              >
                <TrendingUp size={12} /> Revenue
              </button>
              <button
                onClick={() => handleCommand('leads')}
                className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 whitespace-nowrap flex items-center gap-1"
              >
                <Users size={12} /> Leads
              </button>
              <button
                onClick={() => handleCommand('appointments')}
                className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 whitespace-nowrap flex items-center gap-1"
              >
                <Calendar size={12} /> Appointments
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleListening}
                className={`p-3 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Click to speak"
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  inputTextRef.current = e.target.value;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about revenue, leads, pipeline..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="p-3 rounded-full bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
              <span>🟢 Online • Data refreshes in real-time</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AvaExecutiveAssistant;
