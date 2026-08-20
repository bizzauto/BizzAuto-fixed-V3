// Jimi AI Voice Assistant Service - CLEAN VERSION
// Based on original (commit 2bbebba) + Project Manager + Hindi keywords + Safety
// Uses Web Speech API (free) + Nvidia NIM (free) for voice commands

export interface JimiConfig {
  language?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export type Language = 'hi-IN' | 'en-US' | 'mr-IN' | 'ta-IN' | 'te-IN' | 'bn-IN' | 'gu-IN' | 'kn-IN' | 'ml-IN' | 'pa-IN';

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

// Voice settings interface - keep for settings dashboard
// (User said "settings dashboard rahane do" - yeh JIMIASSISTANT SETTINGS KE LIYE ZAROORI HAI)
export interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  speakingStyle: 'warm' | 'professional' | 'casual' | 'cheerful';
  voiceStyle: string;
  pauseAfterFillers: boolean;
  naturalRhythm: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  speakingStyle: 'warm',
  voiceStyle: 'natural',
  pauseAfterFillers: true,
  naturalRhythm: true,
};

export type PersonalityMode = 'projectmanager';

export const PERSONALITY_MODES: { code: PersonalityMode; name: string; emoji: string; description: string }[] = [
  { code: 'projectmanager', name: 'Project Manager', emoji: '🚀', description: 'Smart project control & navigation' },
];

interface CommandResult {
  action: string;
  params?: any;
  response: string;
  requiresConfirmation?: boolean;
}

type JimiCallback = (text: string, isUser: boolean) => void;
type JimiActionCallback = (action: string, params?: any) => void;

// Safety: NEVER allowed actions
const RESTRICTED_ACTIONS = [
  'drop_table', 'drop_database', 'format_db', 'factory_reset',
  'delete_account', 'delete_business', 'nuke', 'destroy_all',
];

// Safety: Destructive actions that need confirmation
const DESTRUCTIVE_ACTIONS = [
  'delete', 'remove', 'clear', 'destroy', 'wipe', 'reset', 'purge',
  'delete_lead', 'delete_review', 'delete_post', 'delete_template',
  'delete_campaign', 'delete_contact', 'unsubscribe', 'ban',
];

class JimiVoiceAgent {
  private recognition: any | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSpeaking = false;
  private config: JimiConfig;
  private onMessage: JimiCallback | null = null;
  private onListeningChange: ((listening: boolean) => void) | null = null;
  private onAction: JimiActionCallback | null = null;
  private conversationHistory: { role: string; content: string }[] = [];
  private availableVoices: SpeechSynthesisVoice[] = [];
  private personalityMode: PersonalityMode = 'projectmanager';
  private pendingConfirmation: { command: string; timestamp: number } | null = null;
  private voiceSettings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };
  private recognitionRecreating = false; // Guard against double recreation

  constructor(config: JimiConfig = {}) {
    this.config = {
      language: 'hi-IN',
      rate: 1.0,
      pitch: 1.0,
      ...config,
    };
    // Load saved voice settings for settings dashboard
    try {
      const saved = localStorage.getItem('jimi_voice_settings');
      if (saved) {
        this.voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(saved) };
        this.config.rate = this.voiceSettings.rate;
        this.config.pitch = this.voiceSettings.pitch;
      }
    } catch {}
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  // ==================== VOICE SETTINGS (for settings dashboard UI) ====================

  getVoiceSettings(): VoiceSettings {
    return { ...this.voiceSettings };
  }

  updateVoiceSettings(settings: Partial<VoiceSettings>) {
    this.voiceSettings = { ...this.voiceSettings, ...settings };
    this.config.rate = this.voiceSettings.rate;
    this.config.pitch = this.voiceSettings.pitch;
    localStorage.setItem('jimi_voice_settings', JSON.stringify(this.voiceSettings));
  }

  resetVoiceSettings() {
    this.voiceSettings = { ...DEFAULT_VOICE_SETTINGS };
    this.config.rate = DEFAULT_VOICE_SETTINGS.rate;
    this.config.pitch = DEFAULT_VOICE_SETTINGS.pitch;
    localStorage.removeItem('jimi_voice_settings');
  }

  // ==================== SPEECH RECOGNITION (ORIGINAL - WORKS) ====================

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Jimi: Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.processUserInput(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Jimi recognition error:', event.error);
      if (event.error !== 'no-speech') {
        this.isListening = false;
        this.onListeningChange?.(false);
      }
      // 🔑 Recreate recognition on error - guard prevents double recreation with onend
      if (!this.recognitionRecreating) {
        this.recognitionRecreating = true;
        this.recognition = null;
        setTimeout(() => {
          this.initSpeechRecognition();
          this.recognitionRecreating = false;
        }, 100);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningChange?.(false);
      // 🔑 Recreate recognition after each use - guard prevents double recreation
      if (!this.recognitionRecreating) {
        this.recognitionRecreating = true;
        this.recognition = null;
        setTimeout(() => {
          this.initSpeechRecognition();
          this.recognitionRecreating = false;
        }, 100);
      }
    };
  }

  private initSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.synthesis?.addEventListener('voiceschanged', () => {
      this.loadVoices();
    });
  }

  private loadVoices() {
    if (this.synthesis) {
      this.availableVoices = this.synthesis.getVoices();
    }
  }

  private findBestVoiceForLang(lang: string): SpeechSynthesisVoice | null {
    const langCode = lang.split('-')[0];
    const allVoices = this.synthesis?.getVoices() || [];

    // Female keywords
    const femaleKeywords = ['female', 'woman', 'priya', 'neha', 'zira', 'susan', 'sarah', 'google'];
    
    const isFemaleVoice = (v: SpeechSynthesisVoice): boolean => {
      const name = v.name.toLowerCase();
      return femaleKeywords.some(k => name.includes(k));
    };

    // Priority 1: Language female voice
    const langFemale = allVoices.find(v => v.lang.startsWith(langCode) && isFemaleVoice(v));
    if (langFemale) return langFemale;

    // Priority 2: Any language voice
    const langVoice = allVoices.find(v => v.lang.startsWith(langCode));
    if (langVoice) return langVoice;

    // Priority 3: Hindi voice
    const hindiVoice = allVoices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) return hindiVoice;

    // Priority 4: English female
    const englishFemale = allVoices.find(v => v.lang.startsWith('en') && isFemaleVoice(v));
    if (englishFemale) return englishFemale;

    // Priority 5: Any English voice
    const englishVoice = allVoices.find(v => v.lang.startsWith('en'));
    if (englishVoice) return englishVoice;

    return allVoices[0] || null;
  }

  // ==================== PUBLIC API ====================

  setMessageCallback(callback: JimiCallback) {
    this.onMessage = callback;
  }

  setListeningCallback(callback: (listening: boolean) => void) {
    this.onListeningChange = callback;
  }

  setActionCallback(callback: JimiActionCallback) {
    this.onAction = callback;
  }

  setLanguage(lang: Language) {
    this.config.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  getLanguage(): Language {
    return (this.config.language || 'hi-IN') as Language;
  }

  setPersonalityMode(mode: PersonalityMode) {
    this.personalityMode = mode;
    localStorage.setItem('jimi_personality_mode', mode);
    this.onMessage?.(`Mode: ${PERSONALITY_MODES.find(m => m.code === mode)?.emoji} ${PERSONALITY_MODES.find(m => m.code === mode)?.name}`, false);
  }

  getPersonalityMode(): PersonalityMode {
    return this.personalityMode;
  }

  getPersonalityModes() {
    return PERSONALITY_MODES;
  }

  private detectLanguage(text: string): Language {
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
    return 'en-US';
  }

  startListening() {
    // 🔑 Recreate if recognition was disposed (after previous use/error)
    if (!this.recognition) {
      this.initSpeechRecognition();
      // If still null after recreate, browser doesn't support it
      if (!this.recognition) {
        this.onMessage?.('🎤 Speech recognition support nahi karta. Chrome ya Edge use karo.', false);
        return;
      }
    }

    if (this.isSpeaking) {
      this.synthesis?.cancel();
      this.isSpeaking = false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.onListeningChange?.(true);
      this.onMessage?.('🎤 Sun rahi hoon... Bolo!', false);
    } catch (err: any) {
      console.error('Jimi start error:', err);
      this.isListening = false;
      this.onListeningChange?.(false);
      const errMsg = (err?.message || err?.name || '').toLowerCase();
      if (errMsg.includes('not-allowed') || errMsg.includes('permission')) {
        this.onMessage?.('🎤 Mic block hai! Browser ke address bar mein 🔒 par click karo → Microphone → Allow karo.', false);
      } else if (errMsg.includes('invalid') || errMsg.includes('already')) {
        // Recognition in bad state - recreate and try once more
        this.recognition = null;
        this.initSpeechRecognition();
        if (this.recognition) {
          try {
            this.recognition.start();
            this.isListening = true;
            this.onListeningChange?.(true);
            this.onMessage?.('🎤 Sun rahi hoon... Bolo!', false);
          } catch {}
        }
      } else if (!errMsg.includes('aborted')) {
        this.onMessage?.('🎤 Mic start nahi ho raha. Chrome use karo aur HTTPS check karo.', false);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.onListeningChange?.(false);
    }
  }

  private audioElement: HTMLAudioElement | null = null;

  async speak(text: string) {
    // Remove emojis for cleaner speech
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // STEP 1: Play browser TTS immediately (no delay, always works)
    this.speakBrowserTTS(cleanText);

    // STEP 2: Try Edge TTS (NeerajaNeural V4 voice - Indian female)
    // This is the voice user wants - en-IN-NeerjaNeural with natural tuning
    try {
      const response = await fetch('/api/jimi/tts/edge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          lang: 'en-IN',
          voiceStyle: this.voiceSettings.voiceStyle || 'natural',
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (data.audio) {
        const played = await this.playBase64Audio(data.audio);
        if (played) {
          // Edge audio started - cancel browser TTS
          this.synthesis?.cancel();
          return;
        }
      }
    } catch {
      // Edge TTS unavailable - browser TTS continues naturally
    }
  }

  /** Play base64 audio, returns true if played successfully */
  private playBase64Audio(base64: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement = null;
        }
        const audio = new Audio(`data:audio/mp3;base64,${base64}`);
        audio.volume = this.voiceSettings.volume || 1.0;
        audio.onplaying = () => {
          this.audioElement = audio;
          this.isSpeaking = true;
          resolve(true);
        };
        audio.onerror = () => resolve(false);
        audio.onended = () => {
          this.isSpeaking = false;
          if (this.audioElement === audio) this.audioElement = null;
        };
        audio.play().then(() => {
          setTimeout(() => {
            if (!this.audioElement) {
              this.audioElement = audio;
              this.isSpeaking = true;
              resolve(true);
            }
          }, 300);
        }).catch(() => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  private speakBrowserTTS(text: string) {
    if (!this.synthesis) return;
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const detectedLang = this.detectLanguage(text);
    utterance.lang = detectedLang;
    utterance.rate = this.voiceSettings.rate;
    utterance.pitch = this.voiceSettings.pitch;
    utterance.volume = this.voiceSettings.volume;

    const voice = this.findBestVoiceForLang(detectedLang);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    this.synthesis.speak(utterance);
  }

  async processUserInput(text: string) {
    this.onMessage?.(text, true);

    // Safety check
    const safetyCheck = this.isCommandAllowed(text);
    if (!safetyCheck.allowed) {
      this.onMessage?.(safetyCheck.reason || 'Command blocked.', false);
      this.speak(safetyCheck.reason || 'Command blocked.');
      return { action: 'blocked', response: safetyCheck.reason || 'Command blocked.' };
    }

    const command = await this.processCommand(text);
    this.onMessage?.(command.response, false);
    this.speak(command.response);

    // Execute navigation, calls, etc.
    if (command.action && this.onAction) {
      this.onAction(command.action, command.params);
    }

    this.conversationHistory.push({ role: 'user', content: text });
    this.conversationHistory.push({ role: 'assistant', content: command.response });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return command;
  }

  // ==================== COMMAND PROCESSING ====================

  private async processCommand(text: string): Promise<CommandResult> {
    const lower = text.toLowerCase();

    const getNavResponse = (key: string) => {
      const lang = this.config.language?.startsWith('mr') ? 'mr' : this.config.language?.startsWith('en') ? 'en' : 'hi';
      const navResponses: Record<string, Record<string, string>> = {
        dashboard: { hi: 'Dashboard pe le chalti hun!', en: 'Opening Dashboard!', mr: 'डॅशबोर्डवर नेऊन देते!' },
        whatsapp: { hi: 'WhatsApp khol rahi hun!', en: 'Opening WhatsApp!', mr: 'WhatsApp उघडते आहे!' },
        leads: { hi: 'Leads dikha rahi hun!', en: 'Showing Leads!', mr: 'Leads दाखवते आहे!' },
        appointments: { hi: 'Appointments khol rahi hun!', en: 'Opening Appointments!', mr: 'Appointments उघडते आहे!' },
        reviews: { hi: 'Reviews dikha rahi hun!', en: 'Showing Reviews!', mr: 'Reviews दाखवते आहे!' },
        'google-business': { hi: 'Google Business khol rahi hun!', en: 'Opening Google Business!', mr: 'Google Business उघडते आहे!' },
        creative: { hi: 'Creative khol rahi hun!', en: 'Opening Creative!', mr: 'Creative उघडते आहे!' },
        campaigns: { hi: 'Campaigns dikha rahi hun!', en: 'Showing Campaigns!', mr: 'Campaigns दाखवते आहे!' },
        analytics: { hi: 'Analytics dikha rahi hun!', en: 'Showing Analytics!', mr: 'Analytics दाखवते आहे!' },
        social: { hi: 'Social media khol rahi hun!', en: 'Opening Social Media!', mr: 'Social Media उघडते आहे!' },
        settings: { hi: 'Settings khol rahi hun!', en: 'Opening Settings!', mr: 'Settings उघडते आहे!' },
        'email-marketing': { hi: 'Email Marketing khol rahi hun!', en: 'Opening Email Marketing!', mr: 'Email Marketing उघडते आहे!' },
        ecommerce: { hi: 'E-Commerce khol rahi hun!', en: 'Opening E-Commerce!', mr: 'E-Commerce उघडते आहे!' },
        automation: { hi: 'Automation khol rahi hun!', en: 'Opening Automation!', mr: 'Automation उघडते आहे!' },
        reports: { hi: 'Reports khol rahi hun!', en: 'Opening Reports!', mr: 'Reports उघडते आहे!' },
        conversations: { hi: 'Conversations khol rahi hun!', en: 'Opening Conversations!', mr: 'Conversations उघडते आहे!' },
        billing: { hi: 'Billing khol rahi hun!', en: 'Opening Billing!', mr: 'Billing उघडते आहे!' },
        team: { hi: 'Team page khol rahi hun!', en: 'Opening Team!', mr: 'Team उघडते आहे!' },
        documents: { hi: 'Documents khol rahi hun!', en: 'Opening Documents!', mr: 'Documents उघडते आहे!' },
        profile: { hi: 'Profile khol rahi hun!', en: 'Opening Profile!', mr: 'Profile उघडते आहे!' },
      };
      return navResponses[key]?.[lang] || navResponses[key]?.['hi'] || 'Chalo!';
    };

    // ==================== NAVIGATION ====================
    // Multi-word patterns FIRST
    if (lower.includes('email marketing') || lower.includes('ईमेल मार्केटिंग')) {
      return { action: 'navigate', params: '/email-marketing', response: getNavResponse('email-marketing') };
    }
    if (lower.includes('google business') || lower.includes('गूगल बिजनेस') || lower.includes('google my business')) {
      return { action: 'navigate', params: '/google-business', response: getNavResponse('google-business') };
    }
    if (lower.includes('review request') || lower.includes('रिव्यू रिक्वेस्ट')) {
      return { action: 'navigate', params: '/review-requests', response: 'Review Requests khol rahi hun!' };
    }
    if (lower.includes('import lead') || lower.includes('bulk import') || lower.includes('इम्पोर्ट लीड')) {
      return { action: 'navigate', params: '/import-leads', response: 'Import Leads khol rahi hun!' };
    }
    if (lower.includes('client portal') || lower.includes('क्लाइंट पोर्टल')) {
      return { action: 'navigate', params: '/client-portal', response: 'Client Portal khol rahi hun!' };
    }
    if (lower.includes('custom field') || lower.includes('कस्टम फील्ड')) {
      return { action: 'navigate', params: '/custom-fields', response: 'Custom Fields khol rahi hun!' };
    }
    if (lower.includes('payment link') || lower.includes('पेमेंट लिंक')) {
      return { action: 'navigate', params: '/payment-links', response: 'Payment Links khol rahi hun!' };
    }
    if (lower.includes('trigger link') || lower.includes('ट्रिगर लिंक')) {
      return { action: 'navigate', params: '/trigger-links', response: 'Trigger Links khol rahi hun!' };
    }
    if (lower.includes('store share') || lower.includes('शेयर स्टोर')) {
      return { action: 'navigate', params: '/store-share', response: 'Store Share khol rahi hun!' };
    }
    if (lower.includes('missed call') || lower.includes('dograh')) {
      return { action: 'navigate', params: '/dograh-settings', response: 'Dograh Settings khol rahi hun!' };
    }
    if (lower.includes('voice call') || lower.includes('phone call') || lower.includes('फ़ोन कॉल')) {
      return { action: 'navigate', params: '/voice-call', response: 'Voice Call page khol rahi hun!' };
    }
    if (lower.includes('ai chatbot') || lower.includes('chatbot') || lower.includes('चैटबॉट')) {
      return { action: 'navigate', params: '/ai-chatbot', response: 'AI Chatbot khol rahi hun!' };
    }
    if (lower.includes('api key') || lower.includes('एपीआई की')) {
      return { action: 'navigate', params: '/api-keys', response: 'API Keys khol rahi hun!' };
    }
    if (lower.includes('blog') || lower.includes('ब्लॉग')) {
      return { action: 'navigate', params: '/blog', response: 'Blog khol rahi hun!' };
    }
    if (lower.includes('funnel') || lower.includes('फनल') || lower.includes('landing page')) {
      return { action: 'navigate', params: '/funnels', response: 'Funnels khol rahi hun!' };
    }
    if (lower.includes('survey') || lower.includes('सर्वे')) {
      return { action: 'navigate', params: '/surveys', response: 'Surveys khol rahi hun!' };
    }
    if (lower.includes('course') || lower.includes('कोर्स') || lower.includes('training')) {
      return { action: 'navigate', params: '/courses', response: 'Courses khol rahi hun!' };
    }
    if (lower.includes('workflow') || lower.includes('वर्कफ़्लो')) {
      return { action: 'navigate', params: '/workflows', response: 'Workflows khol rahi hun!' };
    }
    if (lower.includes('team manage')) {
      return { action: 'navigate', params: '/team', response: getNavResponse('team') };
    }

    // Single-word patterns
    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('डैशबोर्ड') || lower.includes('डॅशबोर्ड') || lower.includes('होम')) {
      return { action: 'navigate', params: '/dashboard', response: getNavResponse('dashboard') };
    }
    if (lower.includes('whatsapp') || lower.includes('message') || lower.includes('व्हाट्सएप') || lower.includes('व्हाट्स') || lower.includes('मैसेज')) {
      return { action: 'navigate', params: '/whatsapp', response: getNavResponse('whatsapp') };
    }
    if (lower.includes('lead') || lower.includes('customer') || lower.includes('ग्राहक') || lower.includes('लीड') || lower.includes('लिड')) {
      return { action: 'navigate', params: '/leads', response: getNavResponse('leads') };
    }
    if (lower.includes('appointment') || lower.includes('book') || lower.includes('बुकिंग') || lower.includes('schedule') || lower.includes('कैलेंडर') || lower.includes('अपॉइंटमेंट') || lower.includes('बुक')) {
      return { action: 'navigate', params: '/appointments', response: getNavResponse('appointments') };
    }
    if (lower.includes('review') || lower.includes('rating') || lower.includes('रेटिंग') || lower.includes('star') || lower.includes('समीक्षा') || lower.includes('रिव्यू')) {
      return { action: 'navigate', params: '/reviews', response: getNavResponse('reviews') };
    }
    if (lower.includes('creative') || lower.includes('poster') || lower.includes('design') || lower.includes('डिजाइन')) {
      return { action: 'navigate', params: '/creative', response: getNavResponse('creative') };
    }
    if (lower.includes('campaign') || lower.includes('कैंपेन') || lower.includes('promotion') || lower.includes('कैम्पेन') || lower.includes('प्रमोशन')) {
      return { action: 'navigate', params: '/campaigns', response: getNavResponse('campaigns') };
    }
    if (lower.includes('analytics') || lower.includes('एनालिटिक्स') || lower.includes('data') || lower.includes('एनालिसिस') || lower.includes('डेटा')) {
      return { action: 'navigate', params: '/analytics', response: getNavResponse('analytics') };
    }
    if (lower.includes('social') || lower.includes('सोशल') || lower.includes('facebook') || lower.includes('instagram')) {
      return { action: 'navigate', params: '/social', response: getNavResponse('social') };
    }
    if (lower.includes('setting') || lower.includes('सेटिंग्स')) {
      return { action: 'navigate', params: '/settings', response: getNavResponse('settings') };
    }
    if (lower.includes('profile') || lower.includes('प्रोफाइल')) {
      return { action: 'navigate', params: '/profile', response: getNavResponse('profile') };
    }
    if (lower.includes('billing') || lower.includes('bill') || lower.includes('बिलिंग') || lower.includes('subscription')) {
      return { action: 'navigate', params: '/billing', response: getNavResponse('billing') };
    }
    if (lower.includes('team') || lower.includes('टीम') || lower.includes('member')) {
      return { action: 'navigate', params: '/team', response: getNavResponse('team') };
    }
    if (lower.includes('document') || lower.includes('file') || lower.includes('दस्तावेज़') || lower.includes('invoice')) {
      return { action: 'navigate', params: '/documents', response: getNavResponse('documents') };
    }
    if (lower.includes('report') || lower.includes('रिपोर्ट')) {
      return { action: 'navigate', params: '/reports', response: getNavResponse('reports') };
    }
    if (lower.includes('conversation') || lower.includes('chat history') || lower.includes('बातचीत')) {
      return { action: 'navigate', params: '/conversations', response: getNavResponse('conversations') };
    }
    if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('shop') || lower.includes('दुकान') || lower.includes('storefront') || lower.includes('store')) {
      return { action: 'navigate', params: '/ecommerce', response: getNavResponse('ecommerce') };
    }
    if (lower.includes('automation') || lower.includes('automate') || lower.includes('ऑटोमेशन') || lower.includes('auto')) {
      return { action: 'navigate', params: '/automation', response: getNavResponse('automation') };
    }
    if (lower.includes('crm') || lower.includes('ग्राहक प्रबंधन')) {
      return { action: 'navigate', params: '/crm', response: 'CRM khol rahi hun!' };
    }
    if (lower.includes('import') || lower.includes('upload') || lower.includes('इम्पोर्ट') || lower.includes('bulk')) {
      return { action: 'navigate', params: '/import-leads', response: 'Import Leads khol rahi hun!' };
    }
    if (lower.includes('email') || lower.includes('mail') || lower.includes('ईमेल')) {
      return { action: 'navigate', params: '/email-marketing', response: getNavResponse('email-marketing') };
    }
    if (lower.includes('post') || lower.includes('पोस्ट')) {
      return { action: 'navigate', params: '/google-business', response: getNavResponse('google-business') };
    }
    if (lower.includes('api') || lower.includes('एपीआई')) {
      return { action: 'navigate', params: '/api-keys', response: 'API Keys khol rahi hun!' };
    }

    // ==================== WHATSAPP SEND ====================
    if ((lower.includes('send') && lower.includes('whatsapp')) || lower.includes('भेज')) {
      const contact = this.extractContact(text);
      return {
        action: 'whatsapp_send',
        params: { contact },
        response: contact ? `${contact} ko WhatsApp khol rahi hun! 📱` : 'WhatsApp khol rahi hun. Contact batao kisko bhejna hai!',
      };
    }

    // ==================== REVENUE ====================
    if (lower.includes('revenue') || lower.includes('income') || lower.includes('paise') || lower.includes('kamai') || lower.includes('paisa') || lower.includes('earning') || lower.includes('kitna hua') || lower.includes('कमाई')) {
      return { action: 'navigate', params: '/analytics', response: 'Revenue ke liye Analytics page khol rahi hun! Wahan sab details hain 📊' };
    }

    // ==================== DAILY BRIEFING ====================
    if (lower.includes('daily briefing') || lower.includes('aaj ka report') || lower.includes('daily report') || lower.includes('summary') || lower.includes('mera haal') || lower.includes('mera update') || lower.includes('सारांश')) {
      return { action: 'info', response: 'Dashboard pe jaake overview dekh lo! Analytics mein saari details hain 📊' };
    }

    // ==================== DELETE COMMANDS ====================
    if (lower.includes('delete') || lower.includes('remove') || lower.includes('हटाओ') || lower.includes('डिलीट')) {
      this.pendingConfirmation = { command: lower, timestamp: Date.now() };
      return {
        action: 'confirm_delete',
        response: '⚠️ Delete karna confirm karo: "Haan delete karo" bolo.\nYeh 30 sec mein expire ho jayega.',
        requiresConfirmation: true,
      };
    }

    if ((lower.includes('haan') && lower.includes('delete')) || lower.includes('confirm') || lower.includes('पक्का')) {
      if (this.pendingConfirmation && (Date.now() - this.pendingConfirmation.timestamp) < 30000) {
        this.pendingConfirmation = null;
        return { action: 'delete_confirmed', response: 'Delete confirm! Batao kya delete karna hai - lead, review, ya post? Main page khol deti hun ⚠️' };
      }
      this.pendingConfirmation = null;
      return { action: 'delete_expired', response: '⏰ Time khatam! Phir se command do.' };
    }

    if (lower.includes('cancel') || lower.includes('रद्द') || lower.includes('nahi')) {
      this.pendingConfirmation = null;
      return { action: 'delete_cancelled', response: '✅ Theek hai! Kuch delete nahi hoga. Safe hai!' };
    }

    // ==================== HELP ====================
    if (lower.includes('help') || lower.includes('madad') || lower.includes('मदद') || lower.includes('kya kar sakti') || lower.includes('features') || lower === 'jimi' || lower === 'jimmy' || lower === 'जिमी') {
      return {
        action: 'help',
        response: 'Main Project Manager Jimi! Batao kya karna hai:\n📊 Dashboard | 💬 WhatsApp\n👥 Leads | ⭐ Reviews\n📧 Email | 📈 Campaigns\n📅 Appointments | 🎨 Creative\n📄 Documents | ⚙️ Settings\nAur bhi bahut kuch! Bolo!',
      };
    }

    // ==================== GREETING ====================
    if (lower.includes('namaste') || lower.includes('hello') || lower.includes('hi') || lower.includes('नमस्ते') || lower.includes('hey')) {
      return { action: 'greet', response: 'Namaste! Main Jimi hun, aapki Project Manager! Bolo kya karna hai?' };
    }

    // ==================== THANK YOU ====================
    if (lower.includes('thank') || lower.includes('shukriya') || lower.includes('धन्यवाद') || lower.includes('thanks')) {
      return { action: 'thanks', response: 'Aapka swagat hai! Aur kuch help chahiye toh bolo!' };
    }

    // ==================== TIME ====================
    if (lower.includes('time') || lower.includes('samay') || lower.includes('समय') || lower.includes('baje') || lower.includes('kitne')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
      return { action: 'time', response: `Abhi ${timeStr} baj rahe hain! ⏰` };
    }

    // ==================== LANGUAGE CHANGE ====================
    if (lower.includes('language') || lower.includes('भाषा') || lower.includes('hindi') || lower.includes('english') || lower.includes('marathi')) {
      if (lower.includes('hindi') || lower.includes('हिंदी')) {
        this.setLanguage('hi-IN');
        return { action: 'language', response: 'Hindi mein baat karenge!' };
      }
      if (lower.includes('english') || lower.includes('इंग्लिश')) {
        this.setLanguage('en-US');
        return { action: 'language', response: 'Switching to English!' };
      }
      if (lower.includes('marathi') || lower.includes('मराठी')) {
        this.setLanguage('mr-IN');
        return { action: 'language', response: 'मराठीत बोलूया!' };
      }
      return { action: 'language', response: 'Kaunsi language? Hindi, English, ya Marathi?' };
    }

    // ==================== AI PROCESSING ====================
    try {
      const aiResponse = await this.queryAI(text);
      return { action: 'ai', response: aiResponse };
    } catch (err) {
      return {
        action: 'unknown',
        response: 'Samajh nahi aaya. Phir se bolo ya "help" bolo!',
      };
    }
  }

  private extractContact(text: string): string | null {
    const patterns = [
      /to\s+([A-Za-z]+)/i,
      /ko\s+([A-Za-z]+)/i,
      /bhej\s+([A-Za-z]+)/i,
      /send\s+to\s+([A-Za-z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // ==================== AI QUERY (BACKEND PROXY + FALLBACK) ====================

  private async queryAI(text: string): Promise<string> {
    // PRIMARY: Backend proxy
    try {
      const response = await fetch('/api/jimi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: this.config.language,
          personalityMode: this.personalityMode,
          history: this.conversationHistory.slice(-6),
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) return data.reply;
      }
    } catch (err) {
      console.log('Jimi: Backend AI unavailable');
    }

    // FALLBACK: Direct NVIDIA API
    const apiKey = import.meta.env.VITE_NVIDIA_NIM_API_KEY || '';
    if (!apiKey) {
      return 'AI service configured nahi hai. "Help" bolo commands sunne ke liye.';
    }

    const projectManagerPrompt = `Tu BizzAuto CRM ka Project Manager hai. Naam: PM. Language: Hinglish.

JAWAB SIRF 1 LINE MEIN. SHORT AUR ACTIONABLE:
- leads/लीड्स/prospects/customers → "Leads page khol raha hun, wahan sab contacts hain"
- reviews/समीक्षा/ratings → "Reviews page khol raha hun, sab reviews dikhenge"
- dashboard/home/डैशबोर्ड → "Dashboard khol raha hun, full overview milega"
- whatsapp/messages/chat/व्हाट्सएप → "WhatsApp page khol raha hun, sab chats hain"
- campaigns/promotions/कैंपेन → "Campaigns page khol raha hun, campaigns dikhenge"
- appointments/bookings/schedule → "Appointments page khol raha hun, bookings dikhenge"
- email/ईमेल/marketing → "Email Marketing page khol raha hun"
- social/facebook/instagram/linkedin → "Social Media page khol raha hun"
- analytics/insights/data → "Analytics page khol raha hun, reports dikhenge"
- revenue/income/paise/kamai → "Revenue update - Analytics mein dekho ji"
- settings/सेटिंग्स → "Settings page khol raha hun"
- documents/files/invoices → "Documents page khol raha hun"
- creatives/posters/design → "Creative page khol raha hun"
- ecommerce/store/shop/dukaan → "E-Commerce page khol raha hun"
- automation/workflows → "Automation page khol raha hun"
- billing/subscription → "Billing page khol raha hun"
- courses/training → "Courses page khol raha hun"
- surveys/polls → "Surveys page khol raha hun"
- reports → "Reports page khol raha hun"
- funnels/landing → "Funnels page khol raha hun"
- team/members → "Team page khol raha hun"
- profile → "Profile page khol raha hun"
- conversations/chat history → "Conversations page khol raha hun"
- google business/posts → "Google Business page khol raha hun"
- voice call/phone call → "Voice Call page khol raha hun"
- api keys → "API Keys page khol raha hun"
- client portal → "Client Portal page khol raha hun"
- custom fields → "Custom Fields page khol raha hun"
- blog/articles → "Blog page khol raha hun"
- trigger links → "Trigger Links page khol raha hun"
- payment links → "Payment Links page khol raha hun"
- import leads/bulk import → "Import Leads page khol raha hun"

AGAR NAHI PATA: "Sir, aap Dashboard dekhenge? Ya mujhe batao kya karna hai"
GALAT MAT BOLO. Feature exist nahi karta toh bolo "Yeh feature abhi available nahi hai".`;

    const systemPrompt = `Tum Project Manager ho - BizzAuto CRM ka smart assistant. ${projectManagerPrompt}
STYLE: Sirf 1 line. Plain text NO emojis.`;

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-6),
            { role: 'user', content: text },
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data?.choices?.[0]?.message?.content?.trim();
        if (responseText) return responseText;
      }
    } catch (err) {
      console.error('Jimi: Direct API failed');
    }

    return 'AI service se response nahi aaya. Phir se try karo.';
  }

  // ==================== SAFETY ====================

  private isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
    const lower = command.toLowerCase();

    // Restricted actions - NEVER allowed
    for (const restricted of RESTRICTED_ACTIONS) {
      if (lower.includes(restricted)) {
        return { allowed: false, reason: '❌ Ye command allowed nahi hai. Data safe hai!' };
      }
    }

    // Destructive actions - need confirmation
    for (const destructive of DESTRUCTIVE_ACTIONS) {
      if (lower.includes(destructive)) {
        if (this.pendingConfirmation?.command === lower) {
          this.pendingConfirmation = null;
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: '⚠️ Delete confirm karo: "Haan delete karo" bolo.',
        };
      }
    }

    return { allowed: true };
  }

  // ==================== GETTERS ====================

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  // Continuous listening (stub for JimiAssistant.tsx compatibility)
  setContinuousListening(enabled: boolean) {
    localStorage.setItem('jimi_continuous_listening', enabled.toString());
  }

  getContinuousListening(): boolean {
    return localStorage.getItem('jimi_continuous_listening') === 'true';
  }

  destroy() {
    this.stopListening();
    this.synthesis?.cancel();
    this.recognition = null;
    this.synthesis = null;
  }
}

export const jimi = new JimiVoiceAgent();
export default JimiVoiceAgent;
