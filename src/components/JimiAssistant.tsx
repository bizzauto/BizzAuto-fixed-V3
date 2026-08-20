import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageCircle, X, Send, Volume2, VolumeX, Bot, User, Globe, Shield, Phone, PhoneCall, Heart, Users, Briefcase, Settings, RotateCcw } from 'lucide-react';
import { jimi, LANGUAGES, Language, PERSONALITY_MODES, PersonalityMode, VoiceSettings } from '../services/jimi.service';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const JimiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Namaste! Main Jimi hoon, aapki AI assistant! 😊 Voice ya text se baat karo. "Help" bolo toh sab bataungi! 💕',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState<Language>(jimi.getLanguage());
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedMode, setSelectedMode] = useState<PersonalityMode>(jimi.getPersonalityMode());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(jimi.getVoiceSettings());
  const [continuousListening, setContinuousListening] = useState(jimi.getContinuousListening());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    jimi.setMessageCallback((text: string, isUser: boolean) => {
      if (!isUser && text !== '🎤 Sun rahi hoon...') {
        setIsTyping(false);
      }
      addMessage(text, isUser);
    });

    jimi.setListeningCallback((listening: boolean) => {
      setIsListening(listening);
      if (listening) setIsTyping(true);
    });

    // Handle actions from voice commands (navigation, calls, etc.)
    jimi.setActionCallback((action: string, params?: any) => {
      if (action === 'navigate' && params) {
        setTimeout(() => navigate(params as string), 500);
      } else if (action === 'whatsapp_send') {
        setTimeout(() => navigate('/whatsapp'), 500);
      } else if (action === 'call_dial' && params?.number) {
        setTimeout(() => {
          window.location.href = `tel:${params.number}`;
        }, 1000);
      }
    });

    return () => {
      jimi.destroy();
    };
  }, [navigate]);

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

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        isUser,
        timestamp: new Date(),
      },
    ]);
  };

  const handleToggleListening = () => {
    if (isListening) {
      jimi.stopListening();
    } else {
      setIsTyping(true);
      jimi.startListening();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsTyping(true);

    const command = await jimi.processUserInput(userMessage);

    // Execute actions based on command result
    if (command?.action === 'navigate' && command.params) {
      setTimeout(() => navigate(command.params as string), 500);
    } else if (command?.action === 'whatsapp_send') {
      setTimeout(() => navigate('/whatsapp'), 500);
    } else if (command?.action === 'call_dial' && command.params?.number) {
      setTimeout(() => {
        window.location.href = `tel:${command.params.number}`;
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      // Unmute - resume speaking
    } else {
      window.speechSynthesis?.cancel();
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setSelectedLang(lang);
    jimi.setLanguage(lang);
    setShowLangMenu(false);
    addMessage(`Ab hum ${LANGUAGES.find(l => l.code === lang)?.nativeName || lang} mein baat karenge! ✨`, false);
  };

  const handleModeChange = (mode: PersonalityMode) => {
    setSelectedMode(mode);
    jimi.setPersonalityMode(mode);
    setShowModeMenu(false);
    const modeName = PERSONALITY_MODES.find(m => m.code === mode)?.name;
    const modeEmoji = PERSONALITY_MODES.find(m => m.code === mode)?.emoji;
    addMessage(`Mode changed to ${modeEmoji} ${modeName}! Ab main ${modeName} ki tarah baat karungi! ✨`, false);
  };

  const previewVoice = () => {
    const previewTexts: Record<string, string> = {
      'hi-IN': 'Namaste! Main Jimi hun. Kaise ho aap? Voice settings try karo!',
      'en-US': 'Hello! I am Jimi. How are you? Try the voice settings!',
    };
    const text = previewTexts[selectedLang] || previewTexts['hi-IN'];
    jimi.speak(text);
    addMessage(`🎤 Preview: "${text}"`, false);
  };

  const handleVoiceSettingChange = (key: keyof VoiceSettings, value: any) => {
    const newSettings = { ...voiceSettings, [key]: value };
    setVoiceSettings(newSettings);
    jimi.updateVoiceSettings({ [key]: value });
  };

  const saveVoiceSettings = () => {
    jimi.updateVoiceSettings(voiceSettings);
    setShowVoiceSettings(false);
    addMessage('✅ Voice settings saved!', false);
  };

  const resetVoiceSettings = () => {
    jimi.resetVoiceSettings();
    setVoiceSettings(jimi.getVoiceSettings());
    addMessage('🔄 Voice settings reset to default!', false);
  };

  const speakingStyles = [
    { value: 'warm', label: 'Warm & Sweet', desc: 'Friendly, caring tone' },
    { value: 'professional', label: 'Professional', desc: 'Formal, business tone' },
    { value: 'casual', label: 'Casual', desc: 'Relaxed, chatty tone' },
    { value: 'cheerful', label: 'Cheerful', desc: 'Upbeat, energetic tone' },
  ] as const;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-pink-500 hover:bg-pink-600'
            : isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
        }`}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : isListening ? (
          <MicOff size={24} className="text-white" />
        ) : (
          <span className="text-2xl">👩</span>
        )}
      </button>

      {/* Listening Indicator */}
      {isListening && !isOpen && (
        <div className="fixed bottom-36 right-6 z-50 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
          🎤 Sun rahi hoon...
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-38 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 150px)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                👩
              </div>
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Jimi0 (Backup) {PERSONALITY_MODES.find(m => m.code === selectedMode)?.emoji}
                   <Shield size={14} className="text-green-300" />
                </h3>
                <p className="text-white/80 text-xs">
                  {isListening ? '🎤 Sun rahi hoon...' : isTyping ? '🧠 Soch rahi hoon...' : `${PERSONALITY_MODES.find(m => m.code === selectedMode)?.name} • Ready`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Personality Mode Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors flex items-center gap-1"
                  title="Change Personality Mode"
                >
                  {selectedMode === 'projectmanager' ? (
                    <Briefcase size={18} className="text-white" />
                  ) : (
                    <Briefcase size={18} className="text-white" />
                  )}
                  <span className="text-white text-xs hidden sm:inline">
                    {PERSONALITY_MODES.find(m => m.code === selectedMode)?.emoji}
                  </span>
                </button>
                {showModeMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    {PERSONALITY_MODES.map(mode => (
                      <button
                        key={mode.code}
                        onClick={() => handleModeChange(mode.code)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedMode === mode.code ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-lg">{mode.emoji}</span>
                        <div>
                          <div className="font-medium">{mode.name}</div>
                          <div className="text-xs text-gray-400">{mode.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-72 overflow-y-auto">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                      <button
                        onClick={previewVoice}
                        className="w-full px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-lg text-xs font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50 flex items-center justify-center gap-1"
                      >
                        🔊 Preview Voice
                      </button>
                    </div>
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedLang === lang.code ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-xs text-gray-400">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Quick Call Button */}
              <button
                onClick={() => {
                  addMessage('📞 Bola: "Call karo [name]" ya "Save karo [name] [number]"', false);
                }}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Help with calls"
              >
                <Phone size={18} className="text-white" />
              </button>
              {/* Voice Settings Button */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
                title="Voice Settings"
              >
                <Settings size={18} className="text-white" />
              </button>
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

          {/* Voice Settings Panel */}
          {showVoiceSettings && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 border-b border-purple-400 overflow-y-auto" style={{ maxHeight: '350px' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Settings size={14} /> Voice Settings
                </h4>
                <div className="flex gap-2">
                  <button onClick={previewVoice} className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg">
                    🔊 Test
                  </button>
                  <button onClick={resetVoiceSettings} className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg flex items-center gap-1">
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Speed (Rate) */}
                <div>
                  <div className="flex justify-between text-white text-xs mb-1">
                    <span>Speed</span>
                    <span>{voiceSettings.rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={voiceSettings.rate}
                    onChange={(e) => handleVoiceSettingChange('rate', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-white/60 mt-0.5">
                    <span>Slow</span>
                    <span>Normal</span>
                    <span>Fast</span>
                  </div>
                </div>

                {/* Pitch */}
                <div>
                  <div className="flex justify-between text-white text-xs mb-1">
                    <span>Pitch (Sweetness)</span>
                    <span>{voiceSettings.pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.pitch}
                    onChange={(e) => handleVoiceSettingChange('pitch', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-white/60 mt-0.5">
                    <span>Deep</span>
                    <span>Natural</span>
                    <span>Sweet</span>
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex justify-between text-white text-xs mb-1">
                    <span>Volume</span>
                    <span>{Math.round(voiceSettings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={voiceSettings.volume}
                    onChange={(e) => handleVoiceSettingChange('volume', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Speaking Style */}
                <div>
                  <div className="text-white text-xs mb-1.5">Speaking Style</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {speakingStyles.map(style => (
                      <button
                        key={style.value}
                        onClick={() => handleVoiceSettingChange('speakingStyle', style.value)}
                        className={`text-xs px-2 py-1.5 rounded-lg transition-all ${
                          voiceSettings.speakingStyle === style.value
                            ? 'bg-white text-purple-600 font-medium'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Style (MYRA) */}
                <div>
                  <div className="text-white text-xs mb-1.5">Voice Style (MYRA)</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'myra', label: 'MYRA', emoji: '🎯' },
                      { value: 'sweet', label: 'Sweet', emoji: '🍯' },
                      { value: 'natural', label: 'Natural', emoji: '🌿' },
                      { value: 'warm', label: 'Warm', emoji: '☀️' },
                      { value: 'energetic', label: 'Energetic', emoji: '⚡' },
                      { value: 'professional', label: 'Pro', emoji: '💼' },
                    ].map(style => (
                      <button
                        key={style.value}
                        onClick={() => handleVoiceSettingChange('voiceStyle', style.value)}
                        className={`text-xs px-2 py-1.5 rounded-lg transition-all ${
                          voiceSettings.voiceStyle === style.value
                            ? 'bg-white text-purple-600 font-medium'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        {style.emoji} {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="flex gap-3 text-white text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.pauseAfterFillers}
                      onChange={(e) => handleVoiceSettingChange('pauseAfterFillers', e.target.checked)}
                      className="rounded accent-white"
                    />
                    Natural Pauses
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.naturalRhythm}
                      onChange={(e) => handleVoiceSettingChange('naturalRhythm', e.target.checked)}
                      className="rounded accent-white"
                    />
                    Rhythm
                  </label>
                </div>

                {/* Save & Close Buttons */}
                <div className="flex gap-2 pt-2 border-t border-white/20">
                  <button
                    onClick={saveVoiceSettings}
                    className="flex-1 bg-white text-purple-600 font-semibold py-2 rounded-lg text-sm hover:bg-white/90 transition-colors"
                  >
                    Save & Close
                  </button>
                  <button
                    onClick={() => setShowVoiceSettings(false)}
                    className="px-3 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                  >
                    Cancel
                  </button>
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
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!msg.isUser && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
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
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Single click: toggle mic on/off (one-time talk)
                  if (continuousListening) {
                    // In continuous mode, stop/start listening
                    if (isListening) {
                      jimi.stopListening();
                    } else {
                      setIsTyping(true);
                      jimi.startListening();
                    }
                  } else {
                    handleToggleListening();
                  }
                }}
                onDoubleClick={() => {
                  // Double-click: toggle continuous listening mode
                  const newState = !continuousListening;
                  setContinuousListening(newState);
                  jimi.setContinuousListening(newState);
                  if (newState) {
                    addMessage('🎧 Continuous listening ON - bolte raho, main sunti rahungi!', false);
                    // Auto-start listening
                    setIsTyping(true);
                    jimi.startListening();
                  } else {
                    addMessage('🔇 Continuous listening OFF', false);
                    jimi.stopListening();
                  }
                }}
                className={`p-3 rounded-full transition-all relative ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : continuousListening
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                }`}
                title={continuousListening ? '🔴 Click to stop | Green = Continuous mode' : 'Click: talk once | Double-click: continuous listening'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                {continuousListening && !isListening && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping" />
                )}
                {continuousListening && (
                  <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[8px] px-1.5 rounded-full leading-none font-bold">∞</span>
                )}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or speak..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
              <Shield size={10} className="text-green-500" />
              <span>Protected Mode • Delete requires confirmation</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JimiAssistant;
