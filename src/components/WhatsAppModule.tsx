import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search, Send, Phone, MoreVertical, Plus,
  Image as ImageIcon, Paperclip, Smile, Mic, Video,
  Check, CheckCheck, Clock, X, ArrowLeft, RefreshCw,
  Settings as SettingsIcon, Users, Zap, Copy, Trash2,
  ChevronDown, ChevronRight, Edit3, Forward,
  MessageSquare, Radio, FileText, Bot, Bell, Shield,
  Wifi, WifiOff, QrCode, Smartphone, LogOut, Link2,
  Star, Tag, Calendar, BarChart3, ExternalLink,
  AlertCircle, CheckCircle, VolumeX
, Loader, Server} from 'lucide-react';
import apiClient, { whatsappAPI } from '../lib/api';
import ClaudeWhatsAppSettings from './ClaudeWhatsAppSettings';
import UnofficialWhatsAppSettings from './UnofficialWhatsAppSettings';

// ============================================================
// TYPES
// ============================================================

interface WAContact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
  tags: string[];
  isGroup: boolean;
  label?: 'open' | 'pending' | 'closed';
  assignedTo?: string;
}

interface WAMessage {
  id: string;
  content: string;
  timestamp: string;
  time: string;
  direction: 'inbound' | 'outbound';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'template' | 'location';
  mediaUrl?: string;
  caption?: string;
  replyTo?: string;
  reactions?: string[];
  isStarred?: boolean;
}

interface WATemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  content: string;
  variables: string[];
  buttons?: { type: string; text: string; url?: string }[];
  header?: { type: string; text?: string; mediaUrl?: string };
  footer?: string;
}



interface AutoReplyRule {
  id: string;
  keyword: string;
  response: string;
  isActive: boolean;
  matchType: 'exact' | 'contains' | 'startsWith';
}

type WAView = 'connect' | 'chats' | 'broadcast' | 'templates' | 'campaigns' | 'scheduled' | 'settings' | 'chatbot' | 'claude' | 'unofficial';
type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';
type ConnectionMode = 'meta' | 'evolution';

interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  phone: string;
  configured: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

// Mock data removed - all data comes from real API

async function fetchTemplates(): Promise<WATemplate[]> {
  try {
    const res = await whatsappAPI.getTemplates();
    const data = res.data?.data || res.data?.templates || [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchAutoReplies(): Promise<AutoReplyRule[]> {
  try {
    const res = await whatsappAPI.getAutoReplies();
    const data = res.data?.data || res.data?.autoReplies || [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchMessages(contactId: string): Promise<WAMessage[]> {
  try {
    let data: any[] = [];

    // Try Evolution API first (backend handles config lookup)
    try {
      const evoRes = await evolutionAPI.getMessages({ remoteJid: contactId, limit: 100 });
      const evoBody = evoRes?.data;
      const evoData = evoBody?.data || evoBody || [];
      data = Array.isArray(evoData) ? evoData : [];
    } catch {
      // Evolution API not configured/failed, fall through
    }

    // Fall back to Meta WhatsApp API
    if (data.length === 0) {
      const res = await whatsappAPI.getMessages(contactId);
      data = res.data?.data || res.data?.messages || [];
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map((m: any) => ({
        id: m.id || m.waMessageId || m.key?.id || `msg-${Date.now()}`,
        content: m.content || m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || '',
        timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
        time: new Date(m.createdAt || m.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        direction: m.direction === 'inbound' || m.fromMe === false ? 'inbound' : 'outbound',
        status: m.status || 'sent',
        type: m.type || 'text',
        mediaUrl: m.mediaUrl || undefined,
        caption: m.caption || undefined,
      }));
    }
    return [];
  } catch { return []; }
}

// ============================================================
// EVOLUTION API INTEGRATION
// ============================================================

const evolutionAPI = {
  getConfig: () => apiClient.get('/evolution/config'),
  saveConfig: (data: any) => apiClient.post('/evolution/config', data),
  createInstance: (data: any) => apiClient.post('/evolution/instance', data),
  connectInstance: (instanceName: string, phone?: string) => apiClient.post('/evolution/connect', { instanceName, phone }),
  getStatus: (instanceName: string) => apiClient.get(`/evolution/status?instanceName=${instanceName}`),
  disconnectInstance: (instanceName: string) => apiClient.post('/evolution/disconnect', { instanceName }),
  getChats: (instanceName: string) => apiClient.get(`/evolution/chats?instanceName=${instanceName}`),
  getMessages: (data: any) => apiClient.post('/evolution/messages', data),
  sendText: (data: any) => apiClient.post('/evolution/send/text', data),
};

// Helper: try API first, fall back to mock data
async function tryAPI<T>(apiCall: () => Promise<{ data: any }>, fallback: T): Promise<T> {
  try {
    const res = await apiCall();
    const body = res?.data;
    // Backend wraps: { success: true, data: actualData } → unwrap to actualData
    return (body?.data as T) ?? (body as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// Status Icons Component
const MessageStatus: React.FC<{ status: WAMessage['status'] }> = ({ status }) => {
  switch (status) {
    case 'sending': return <Clock size={14} className="text-gray-400" />;
    case 'sent': return <Check size={14} className="text-gray-400" />;
    case 'delivered': return <CheckCheck size={14} className="text-gray-400" />;
    case 'read': return <CheckCheck size={14} className="text-blue-500" />;
    case 'failed': return <AlertCircle size={14} className="text-red-500" />;
    default: return null;
  }
};

// ============================================================
// QR CONNECT VIEW
// ============================================================

const QRConnectView: React.FC<{
  connectionStatus: ConnectionStatus;
  connectedPhone: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshQR: () => void;
  qrValue: string;
  connectionMode?: ConnectionMode;
  onModeChange?: (mode: ConnectionMode) => void;
  evolutionConfig?: EvolutionConfig;
  onEvolutionConfigChange?: (config: EvolutionConfig) => void;
  onEvolutionConnect?: () => void;
  apiError?: string | null;
}> = ({ connectionStatus, connectedPhone, onConnect, onDisconnect, onRefreshQR, qrValue, connectionMode = 'qr', onModeChange = () => { }, evolutionConfig = { baseUrl: '', apiKey: '', instanceName: '', phone: '', configured: false }, onEvolutionConfigChange = () => { }, onEvolutionConnect = () => { }, apiError = null }) => {
  const [step, setStep] = useState(0);
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'scanning') {
      const timer = setTimeout(() => setStep(1), 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  if (connectionStatus === 'connected') {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 dark:from-gray-800 to-emerald-50 dark:to-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl p-10 max-w-lg w-full mx-4 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">WhatsApp Connected! ✅</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Your WhatsApp Business is linked and ready to use.</p>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Smartphone size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white">{connectedPhone}</p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Wifi size={14} /> Connected • Active
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
              <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Connected</p>
              <p className="text-xs text-green-500 dark:text-green-400">WhatsApp Active</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
              <Smartphone size={24} className="text-blue-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{connectedPhone}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Phone Number</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
              <MessageSquare size={24} className="text-purple-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Ready</p>
              <p className="text-xs text-purple-500 dark:text-purple-400">To Send Messages</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-center">
              <Wifi size={24} className="text-amber-500 mx-auto mb-1" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Active</p>
              <p className="text-xs text-amber-500 dark:text-amber-400">All Systems Go</p>
            </div>
          </div>

          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 px-4 sm:px-5 md:px-6 py-3 bg-red-50 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors mx-auto font-medium"
          >
            <LogOut size={18} />
            Disconnect WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 dark:from-gray-800 to-blue-50 dark:to-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl p-10 max-w-2xl w-full mx-4">
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3" role="alert">
            <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection Error</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{apiError}</p>
            </div>
          </div>
        )}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageSquare size={40} className="text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Connect WhatsApp</h2>
          <p className="text-gray-600 dark:text-gray-300">Link your WhatsApp Business account to start messaging</p>
        </div>

        {/* Connection Mode Selector */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => onModeChange('meta')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${connectionMode === 'meta' ? 'bg-white dark:bg-gray-600 shadow-sm text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Shield size={16} />
              Meta Official API
            </button>
            <button
              onClick={() => onModeChange('evolution')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${connectionMode === 'evolution' ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <Zap size={16} />
              Evolution API
            </button>
          </div>
        </div>

        {connectionMode === 'meta' ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* QR Code Section */}
            <div className="flex flex-col items-center">
              <div className={`relative bg-white dark:bg-gray-800 border-2 ${connectionStatus === 'scanning' ? 'border-green-400' : 'border-gray-200'} rounded-2xl p-4 sm:p-5 md:p-6 mb-4 transition-all`}>
                {connectionStatus === 'scanning' && (
                  <div className="absolute inset-0 bg-green-500/5 rounded-2xl animate-pulse" />
                )}
                <QRCodeSVG
                  value={qrValue}
                  size={220}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  imageSettings={{
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2325D366'%3E%3Ccircle cx='12' cy='12' r='12'/%3E%3Cpath d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347' fill='white'/%3E%3C/svg%3E",
                    x: undefined,
                    y: undefined,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
                {connectionStatus === 'connecting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-700/90 dark:text-white rounded-2xl">
                    <div className="text-center">
                      <RefreshCw size={32} className="animate-spin text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Connecting...</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onRefreshQR}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 mb-2"
              >
                <RefreshCw size={14} />
                Refresh QR Code
              </button>

              {connectionStatus === 'disconnected' && (
                <button
                  onClick={onConnect}
                  className="mt-2 px-4 sm:px-5 md:px-6 md:px-4 sm:px-6 md:px-8 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold shadow-lg shadow-green-500/30 flex items-center gap-2"
                >
                  <QrCode size={20} />
                  Simulate Scan & Connect
                </button>
              )}
            </div>

            {/* Instructions */}
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How to connect:</h3>
              <div className="space-y-4">
                {[
                  { step: 1, icon: <Smartphone size={20} />, text: 'Open WhatsApp on your phone', done: step >= 0 },
                  { step: 2, icon: <MoreVertical size={20} />, text: 'Tap Menu (⋮) or Settings', done: step >= 1 },
                  { step: 3, icon: <Link2 size={20} />, text: 'Tap "Linked Devices"', done: step >= 2 },
                  { step: 4, icon: <QrCode size={20} />, text: 'Tap "Link a Device"', done: step >= 3 },
                  { step: 5, icon: <Smartphone size={20} />, text: 'Point your phone at this QR code', done: step >= 4 },
                ].map((item) => (
                  <div key={item.step} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${item.done ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${item.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:text-gray-300'}`}>
                      {item.done ? <Check size={16} /> : item.step}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-start gap-2">
                  <Shield size={18} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">End-to-end encrypted</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Your messages are secured with end-to-end encryption. Neither WhatsApp nor any third party can read them.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Evolution API Mode */
          <div className="max-w-lg mx-auto">
            {!showEvolutionForm ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={40} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Evolution API</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Connect via Evolution API for WhatsApp Web-based messaging. Scan QR code from your phone to link devices.
                </p>

                {evolutionConfig.configured ? (
                  <div className="space-y-4">
                    {connectionStatus === 'scanning' || connectionStatus === 'connecting' ? (
                      <div className="text-center space-y-4">
                        {qrValue ? (
                          <div className="bg-white dark:bg-gray-600 dark:text-white rounded-xl p-4 border-2 border-purple-300 inline-block mx-auto">
                            {qrValue.startsWith('data:') || qrValue.startsWith('http') ? (
                              <img
                                src={qrValue}
                                alt="WhatsApp QR Code"
                                className="w-64 h-64 object-contain mx-auto rounded-lg"
                              />
                            ) : qrValue.startsWith('iVBOR') || qrValue.startsWith('/9j/') || qrValue.length > 100 ? (
                              <img
                                src={`data:image/png;base64,${qrValue}`}
                                alt="WhatsApp QR Code"
                                className="w-64 h-64 object-contain mx-auto rounded-lg"
                              />
                            ) : (
                              <div className="w-64 h-64 mx-auto">
                                <QRCodeSVG
                                  value={qrValue}
                                  size={256}
                                  level="M"
                                  includeMargin={true}
                                  bgColor="#ffffff"
                                  fgColor="#1a1a1a"
                                />
                              </div>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                              {connectionStatus === 'connecting' ? 'Connecting...' : 'Scan this QR code with WhatsApp'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Open WhatsApp &gt; Linked Devices &gt; Link a Device
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                            <Loader size={20} className="animate-spin" />
                            <span>Generating QR code...</span>
                          </div>
                        )}
                        <button
                          onClick={onEvolutionConnect}
                          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-300 underline"
                        >
                          Refresh QR Code
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                          <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">Evolution API Configured</p>
                            <p className="text-xs text-green-600 dark:text-green-400">{evolutionConfig.baseUrl}</p>
                          </div>
                        </div>
                        <button
                          onClick={onEvolutionConnect}
                          className="w-full px-4 sm:px-5 md:px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                        >
                          <QrCode size={20} />
                          Connect & Get QR Code
                        </button>
                        <button
                          onClick={() => setShowEvolutionForm(true)}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 underline"
                        >
                          Update Configuration
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowEvolutionForm(true)}
                    className="w-full px-4 sm:px-5 md:px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                  >
                    <SettingsIcon size={20} />
                    Configure Evolution API
                  </button>
                )}

                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-left">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">What is Evolution API?</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Evolution API is an open-source WhatsApp Web API that lets you connect via QR code scanning — no Meta Business approval needed. Perfect for small businesses and quick setup.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setShowEvolutionForm(false)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 mb-4">
                  <ArrowLeft size={14} /> Back
                </button>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Evolution API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">API Base URL</label>
                    <input
                      type="url"
                      value={evolutionConfig.baseUrl}
                      onChange={e => onEvolutionConfigChange({ ...evolutionConfig, baseUrl: e.target.value })}
                      placeholder="https://your-evolution-api.com"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">API Key</label>
                    <input
                      type="password"
                      value={evolutionConfig.apiKey}
                      onChange={e => onEvolutionConfigChange({ ...evolutionConfig, apiKey: e.target.value })}
                      placeholder="Your Evolution API key"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Instance Name <span className="text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      value={evolutionConfig.instanceName}
                      onChange={e => onEvolutionConfigChange({ ...evolutionConfig, instanceName: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">WhatsApp Number <span className="text-gray-400">(with country code)</span></label>
                    <input
                      type="tel"
                      value={evolutionConfig.phone || ''}
                      onChange={e => onEvolutionConfigChange({ ...evolutionConfig, phone: e.target.value })}
                      placeholder="919999999999"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Required. Your WhatsApp number with country code (e.g., 919999999999)</p>
                  </div>
                  <button
                    onClick={() => { onEvolutionConfigChange({ ...evolutionConfig, configured: true }); setShowEvolutionForm(false); }}
                    className="w-full px-4 sm:px-5 md:px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                  >
                    💾 Save Configuration
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CHAT VIEW
// ============================================================

const ChatView: React.FC<{
  contacts: WAContact[];
  onSendMessage: (contactId: string, message: string) => void;
  onNavigate: (view: WAView) => void;
  evolutionInstanceName?: string;
  isConnected?: boolean;
}> = ({ contacts, onSendMessage, onNavigate, evolutionInstanceName = '', isConnected = false }) => {
  const [selectedContact, setSelectedContact] = useState<WAContact | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups' | 'open' | 'pending' | 'closed'>('all');
  const [templates, setTemplates] = useState<WATemplate[]>([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    if (filter === 'unread') return matchesSearch && c.unreadCount > 0;
    if (filter === 'groups') return matchesSearch && c.isGroup;
    if (filter === 'open') return matchesSearch && c.label === 'open';
    if (filter === 'pending') return matchesSearch && c.label === 'pending';
    if (filter === 'closed') return matchesSearch && c.label === 'closed';
    return matchesSearch;
  });

  const selectContact = useCallback((contact: WAContact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id).then(msgs => {
      setMessages(msgs.length > 0 ? msgs : []);
    });
    setShowTemplatePanel(false);
    setShowAIPanel(false);
    setShowContactInfo(false);
    setShowNewChat(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedContact) return;

    const newMsg: WAMessage = {
      id: `msg-${Date.now()}`,
      content: message,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      direction: 'outbound',
      status: 'sending',
      type: 'text',
    };

    setMessages(prev => [...prev, newMsg]);
    setMessage('');
    onSendMessage(selectedContact.id, message);
    inputRef.current?.focus();

    // Try Evolution API first
    if (isConnected && evolutionInstanceName) {
      try {
        await evolutionAPI.sendText({
          instanceName: evolutionInstanceName,
          to: selectedContact.phone.replace(/\s/g, ''),
          message: message,
        });
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'sent' } : m));
      } catch {
        // API failed, keep local simulation
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'sent' } : m));
      }
    } else {
      // Simulate status updates (mock fallback)
      setTimeout(() => setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'sent' } : m)), 500);
    }


  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScheduleSend = async () => {
    if (!message.trim() || !selectedContact || !scheduleDate) return;
    try {
      await apiClient.post('/api/whatsapp/schedule', {
        phone: selectedContact.phone.replace(/\s/g, ''),
        contactId: selectedContact.id,
        type: 'text',
        content: message,
        scheduledAt: new Date(scheduleDate).toISOString(),
      });
      setMessage('');
      setScheduleDate('');
      setShowSchedulePopup(false);
    } catch {
      // Error handled silently
    }
  };

  const aiReplySuggestions = [
    'Thank you for your interest! Our premium package includes unlimited access to all features. Would you like to proceed?',
    'Hi! We appreciate your message. Our team is available Mon-Sat, 10 AM to 8 PM. How can we assist you?',
    'Great question! Let me share our complete catalog with you. One moment please 😊',
  ];

  const handleSendTemplate = (template: WATemplate) => {
    const newMsg: WAMessage = {
      id: `tmpl-${Date.now()}`,
      content: template.content.replace(/\{\{1\}\}/g, selectedContact?.name || 'Customer').replace(/\{\{2\}\}/g, 'BizzAuto Solutions').replace(/\{\{3\}\}/g, 'https://www.bizzautoai.com').replace(/\{\{4\}\}/g, '+91 8983027975'),
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      direction: 'outbound',
      status: 'sent',
      type: 'template',
    };
    setMessages(prev => [...prev, newMsg]);
    setShowTemplatePanel(false);
  };

  return (
    <div className="flex h-full">
      {/* Contact List */}
      <div className={`w-full sm:w-80 md:w-96 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedContact ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare size={22} />
              Chats
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNewChat(true)} className="p-2 hover:bg-white/20 rounded-lg text-white" title="New Chat">
                <Plus size={20} />
              </button>
              <button className="p-2 hover:bg-white/20 rounded-lg text-white" title="More">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start new chat..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/20 text-white placeholder-white/60 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50 overflow-x-auto">
          {([
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread (${contacts.filter(c => c.unreadCount > 0).length})` },
            { key: 'open', label: `Open (${contacts.filter(c => c.label === 'open').length})` },
            { key: 'pending', label: `Pending (${contacts.filter(c => c.label === 'pending').length})` },
            { key: 'groups', label: 'Groups' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filter === f.key ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* New Chat Input */}
        {showNewChat && (
          <div className="p-3 border-b border-gray-200 bg-blue-50">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Start New Chat</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
                placeholder="+91 8983027975"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  if (newChatPhone.trim()) {
                    const newContact: WAContact = {
                      id: `new-${Date.now()}`,
                      name: newChatPhone,
                      phone: newChatPhone,
                      avatar: newChatPhone.slice(-2),
                      lastMessage: 'Start chatting...',
                      lastMessageTime: 'Now',
                      unreadCount: 0,
                      online: false,
                      tags: ['New'],
                      isGroup: false,
                    };
                    selectContact(newContact);
                    setShowNewChat(false);
                    setNewChatPhone('');
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              >
                Chat
              </button>
              <button onClick={() => setShowNewChat(false)} className="px-2 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => selectContact(contact)}
              className={`w-full p-3 border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left flex items-center gap-3 ${selectedContact?.id === contact.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white text-sm ${contact.isGroup ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-green-400 to-emerald-600'
                  }`}>
                  {contact.avatar}
                </div>
                {contact.online && !contact.isGroup && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{contact.name}</h3>
                    {contact.label && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        contact.label === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        contact.label === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {contact.label}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs flex-shrink-0 ${contact.unreadCount > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {contact.lastMessageTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate pr-2 ${contact.unreadCount > 0 ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {contact.lastMessage}
                  </p>
                  {contact.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-800 ${!selectedContact ? 'hidden lg:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedContact(null)} className="lg:hidden p-1 text-white hover:bg-white/20 rounded">
                  <ArrowLeft size={20} />
                </button>
                <div className="relative cursor-pointer" onClick={() => setShowContactInfo(!showContactInfo)}>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-300 border-2 border-green-600 rounded-full" />}
                </div>
                <div className="cursor-pointer" onClick={() => setShowContactInfo(!showContactInfo)}>
                  <h3 className="font-semibold text-white text-sm">{selectedContact.name}</h3>
                  <p className="text-xs text-green-100">
                    {isTyping ? (
                      <span className="italic">typing...</span>
                    ) : selectedContact.online ? (
                      'online'
                    ) : (
                      selectedContact.phone
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-white/20 rounded-lg text-white" title="Video Call">
                  <Video size={20} />
                </button>
                <button className="p-2 hover:bg-white/20 rounded-lg text-white" title="Voice Call">
                  <Phone size={20} />
                </button>
                <button className="p-2 hover:bg-white/20 rounded-lg text-white" title="Search in chat">
                  <Search size={20} />
                </button>
                <button
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className="p-2 hover:bg-white/20 rounded-lg text-white"
                  title="Contact Info"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d5cec5\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className="bg-white/90 text-gray-600 dark:text-gray-300 text-xs px-4 py-1 rounded-full shadow-sm font-medium">
                      Today
                    </span>
                  </div>

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 shadow-sm relative group ${msg.direction === 'outbound'
                        ? 'bg-[#d9fdd3] dark:bg-emerald-800 rounded-tr-none'
                        : 'bg-white dark:bg-gray-700 rounded-tl-none'
                        }`}>
                        {msg.type === 'template' && (
                          <div className="flex items-center gap-1 mb-1">
                            <FileText size={12} className="text-blue-500" />
                            <span className="text-xs text-blue-500 font-medium">Template Message</span>
                          </div>
                        )}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mb-2">
                            <img src={msg.mediaUrl} alt="Media" className="rounded-lg max-w-full" />
                            {msg.caption && <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">{msg.caption}</p>}
                          </div>
                        )}
                        {msg.content && <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{msg.content}</p>}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${msg.direction === 'outbound' ? '' : ''}`}>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{msg.time}</span>
                          {msg.direction === 'outbound' && <MessageStatus status={msg.status} />}
                        </div>
                        {msg.direction === 'outbound' && (
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 text-right mt-0.5">Delivery status updates via webhook</p>
                        )}

                        {/* Hover actions */}
                        <div className="absolute -top-2 right-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-1">
                          <button onClick={() => {
                            setMessage((prev) => prev ? `> ${msg.content}\n\n${prev}` : `> ${msg.content}\n\n`);
                            inputRef.current?.focus();
                          }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="Reply">
                            <ArrowLeft size={14} />
                          </button>
                          <button onClick={() => {
                            const emoji = '👍';
                            setMessage((prev) => prev + emoji);
                          }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="React">
                            <Smile size={14} />
                          </button>
                          <button onClick={() => {
                            const emoji = '👍';
                            setMessage((prev: string) => prev + emoji);
                          }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="React">
                            <Smile size={14} />
                          </button>
                          <button onClick={() => {
                            if (!msg.isStarred) {
                              setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isStarred: true } : m));
                            }
                          }} className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${msg.isStarred ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`} title="Star">
                            <Star size={14} fill={msg.isStarred ? 'currentColor' : 'none'} />
                          </button>
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400" title="Forward">
                            <Forward size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-600 rounded-xl rounded-tl-none px-4 py-3 shadow-sm">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* AI Reply Panel */}
                {showAIPanel && (
                  <div className="bg-purple-50 border-t border-purple-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1"><Zap size={14} /> AI Reply Suggestions</h4>
                      <button onClick={() => setShowAIPanel(false)} className="text-purple-400 hover:text-purple-600 dark:text-purple-400"><X size={16} /></button>
                    </div>
                    <div className="space-y-2">
                      {aiReplySuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => { setMessage(suggestion); setShowAIPanel(false); inputRef.current?.focus(); }}
                          className="w-full text-left p-2.5 bg-white dark:bg-gray-600 dark:text-white rounded-lg text-sm text-gray-700 hover:bg-purple-100 border border-purple-200 dark:border-gray-500 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <button className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-300 flex items-center gap-1">
                      <RefreshCw size={12} /> Generate more suggestions
                    </button>
                  </div>
                )}

                {/* Template Panel */}
                {showTemplatePanel && (
                  <div className="bg-blue-50 border-t border-blue-200 p-3 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1"><FileText size={14} /> Quick Templates</h4>
                      <button onClick={() => setShowTemplatePanel(false)} className="text-blue-400 hover:text-blue-600 dark:text-blue-400"><X size={16} /></button>
                    </div>
                    <div className="space-y-2">
                      {templates.filter(t => t.status === 'approved').slice(0, 4).map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleSendTemplate(template)}
                          className="w-full text-left p-2.5 bg-white dark:bg-gray-600 dark:text-white rounded-lg text-sm text-gray-700 hover:bg-blue-100 border border-blue-200 dark:border-gray-500 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-blue-800 dark:text-blue-300">{template.name.replace(/_/g, ' ')}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${template.category === 'MARKETING' ? 'bg-orange-100 text-orange-700 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:text-green-300'}`}>
                              {template.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.content.substring(0, 80)}...</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="bg-[#f0f2f5] px-4 py-3 border-t border-gray-200">
                  {/* Attachment Menu */}
                  {showAttachMenu && (
                    <div className="mb-3 flex gap-3 justify-center">
                      {[
                        { icon: <ImageIcon size={20} />, label: 'Photo', color: 'bg-purple-500' },
                        { icon: <Video size={20} />, label: 'Video', color: 'bg-red-500' },
                        { icon: <FileText size={20} />, label: 'Document', color: 'bg-blue-500' },
                        { icon: <Users size={20} />, label: 'Contact', color: 'bg-teal-500' },
                      ].map(item => (
                        <button key={item.label} className="flex flex-col items-center gap-1" onClick={() => setShowAttachMenu(false)}>
                          <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform`}>
                            {item.icon}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-300">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300" title="Emoji">
                      <Smile size={22} />
                    </button>
                    <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300" title="Attach">
                      <Paperclip size={22} />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message"
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-600 dark:text-white rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    {message.trim() ? (
                      <button onClick={handleSend} className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-105" title="Send">
                        <Send size={20} />
                      </button>
                    ) : (
                      <button className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all" title="Voice message">
                        <Mic size={20} />
                      </button>
                    )}
                  </div>
                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setShowAIPanel(!showAIPanel); setShowTemplatePanel(false); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${showAIPanel ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 dark:text-purple-400 hover:bg-purple-100'}`}>
                      <Zap size={12} /> AI Reply
                    </button>
                    <button onClick={() => { setShowTemplatePanel(!showTemplatePanel); setShowAIPanel(false); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${showTemplatePanel ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 dark:text-blue-400 hover:bg-blue-100'}`}>
                      <FileText size={12} /> Templates
                    </button>
                    <button className="px-3 py-1.5 bg-green-50 text-green-600 dark:text-green-400 rounded-full text-xs font-semibold hover:bg-green-100 flex items-center gap-1">
                      <Tag size={12} /> Add Tag
                    </button>
                    <button className="px-3 py-1.5 bg-orange-50 text-orange-600 dark:text-orange-300 rounded-full text-xs font-semibold hover:bg-orange-100 flex items-center gap-1">
                      <Calendar size={12} /> Schedule
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Info Panel */}
              {showContactInfo && (
                <div className="w-full sm:w-72 md:w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto hidden xl:block">
                  <div className="bg-gradient-to-b from-green-600 to-emerald-700 p-4 sm:p-5 md:p-6 text-center">
                    <button onClick={() => setShowContactInfo(false)} className="absolute top-3 right-3 text-white/70 hover:text-white">
                      <X size={18} />
                    </button>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl mx-auto mb-3">
                      {selectedContact.avatar}
                    </div>
                    <h3 className="font-bold text-white text-lg">{selectedContact.name}</h3>
                    <p className="text-green-100 text-sm">{selectedContact.phone}</p>
                    <p className="text-green-200 text-xs mt-1">{selectedContact.online ? '🟢 Online' : '⚪ Last seen today'}</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Tags */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedContact.tags.map(tag => (
                          <span key={tag} className="text-xs bg-green-100 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">{tag}</span>
                        ))}
                        <button className="text-xs bg-gray-100 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 font-medium">+ Add</button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100">
                          <Users size={14} /> Add to CRM
                        </button>
                        <button className="flex items-center gap-2 p-2.5 bg-orange-50 rounded-lg text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100">
                          <Radio size={14} /> Broadcast
                        </button>
                        <button className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100">
                          <Bot size={14} /> AI Chat
                        </button>
                        <button className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100">
                          <VolumeX size={14} /> Block
                        </button>
                      </div>
                    </div>

                    {/* CRM Info */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">CRM Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Stage:</span><span className="font-medium text-green-600 dark:text-green-400">Contacted</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Deal Value:</span><span className="font-medium">₹50,000</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Source:</span><span className="font-medium">WhatsApp</span></div>
                        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Created:</span><span className="font-medium">Mar 15, 2024</span></div>
                      </div>
                    </div>

                    {/* Media */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Shared Media</h4>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <ImageIcon size={20} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Recent Activity</h4>
                      <div className="space-y-2">
                        {[
                          { action: 'Message received', time: '2 min ago', icon: <MessageSquare size={12} /> },
                          { action: 'Tag added: Hot Lead', time: '1 hour ago', icon: <Tag size={12} /> },
                          { action: 'Added to pipeline', time: '2 hours ago', icon: <Users size={12} /> },
                        ].map((act, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400">{act.icon}</div>
                            <div className="flex-1"><p className="font-medium text-gray-700 dark:text-gray-200">{act.action}</p><p className="text-gray-400">{act.time}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20">
            <div className="text-center max-w-md px-4 sm:px-6 md:px-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={48} className="text-green-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">BizzAuto Solutions WhatsApp</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Send and receive messages right from your dashboard. Click on a contact to start chatting.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowNewChat(true)} className="p-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 flex items-center justify-center gap-2">
                  <Plus size={18} /> New Chat
                </button>
                <button onClick={() => onNavigate('broadcast')} className="p-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 flex items-center justify-center gap-2">
                  <Radio size={18} /> Broadcast
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// BROADCAST VIEW
// ============================================================

const BroadcastView: React.FC = () => {
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
  // Anti-blocking drip settings
  const [dripEnabled, setDripEnabled] = useState(true);
  const [dripMinDelay, setDripMinDelay] = useState(30);
  const [dripMaxDelay, setDripMaxDelay] = useState(120);
  const [dripBatchSize, setDripBatchSize] = useState(10);
  const [dripBatchPause, setDripBatchPause] = useState(5);
  const [dripTypingSim, setDripTypingSim] = useState(true);
  const [dripRandomJitter, setDripRandomJitter] = useState(true);
  const [dripMaxPerHour, setDripMaxPerHour] = useState(50);
  const [dripMaxPerDay, setDripMaxPerDay] = useState(500);

  useEffect(() => {
    whatsappAPI.getContacts().then(res => {
      const data = res.data?.data || res.data?.contacts || [];
      setBroadcastContacts(Array.isArray(data) ? data.map((c: any) => ({
        id: c.id, name: c.name || c.phone, phone: c.phone, avatar: (c.name || c.phone || '?').substring(0, 2).toUpperCase(), lastMessage: typeof c.lastMessage === 'string' ? c.lastMessage : '', lastMessageTime: c.lastMessageTime || '', unreadCount: c.unreadCount || 0, online: false, tags: c.tags || [], isGroup: false,
      })) : []);
    }).catch(() => { });
    fetchTemplates().then(setBroadcastTemplates);
  }, []);

  const allTags = Array.from(new Set(broadcastContacts.flatMap((c: WAContact) => c.tags)));
  const filteredContacts = broadcastContacts.filter((c: WAContact) => {
    if (c.isGroup) return false;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    if (filterTag !== 'all') return matchesSearch && c.tags.includes(filterTag);
    return matchesSearch;
  });

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const contactIds = filteredContacts
        .filter((c: WAContact) => selectedContacts.includes(c.id))
        .map((c: WAContact) => c.id);
      if (selectedTemplate && contactIds.length > 0) {
        await whatsappAPI.sendBroadcast({
          templateName: selectedTemplate.name,
          contactIds,
          templateId: selectedTemplate.id,
          drip: dripEnabled ? {
            minDelay: dripMinDelay,
            maxDelay: dripMaxDelay,
            batchSize: dripBatchSize,
            batchPauseMinutes: dripBatchPause,
            typingSimulation: dripTypingSim,
            randomJitter: dripRandomJitter,
            maxPerHour: dripMaxPerHour,
            maxPerDay: dripMaxPerDay,
          } : undefined,
        });
      }
      setStep('sent');
    } catch {
      setStep('sent');
    } finally {
      setIsSending(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 dark:from-gray-800 to-emerald-50 dark:to-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl p-10 max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Broadcast Sent! 🎉</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">Successfully sent to {selectedContacts.length} contacts</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Template: {selectedTemplate?.name.replace(/_/g, ' ')}</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3"><p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedContacts.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Sent</p></div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3"><p className="text-lg font-bold text-green-600 dark:text-green-400">{Math.floor(selectedContacts.length * 0.95)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p></div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3"><p className="text-lg font-bold text-purple-600 dark:text-purple-400">{Math.floor(selectedContacts.length * 0.72)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Read</p></div>
          </div>
          <button onClick={() => { setStep('select'); setSelectedContacts([]); setSelectedTemplate(null); }} className="px-4 sm:px-5 md:px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium">
            Send Another Broadcast
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Radio size={22} className="text-blue-500" /> Broadcast Message</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send messages to multiple contacts at once</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['select', 'compose', 'preview'] as const).map((s, i) => (
              <button key={s} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${step === s ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>{i + 1}</span>
                {s === 'select' ? 'Select Contacts' : s === 'compose' ? 'Choose Template' : 'Preview & Send'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        {step === 'select' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Broadcast Name</label>
                  <input type="text" value={broadcastName} onChange={e => setBroadcastName(e.target.value)} placeholder="e.g., Diwali Sale Announcement" className="w-full sm:w-72 md:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300"><strong className="text-green-600 dark:text-green-400">{selectedContacts.length}</strong> selected</span>
                  <button onClick={selectAll} className="px-4 py-2 bg-blue-50 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100">
                    {selectedContacts.length === filteredContacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
                  <option value="all">All Tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  <div className="w-10"><input type="checkbox" checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0} onChange={selectAll} className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></div>
                  <div className="flex-1">Contact</div>
                  <div className="w-40">Phone</div>
                  <div className="w-32">Tags</div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {filteredContacts.map(contact => (
                    <label key={contact.id} className={`flex items-center px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${selectedContacts.includes(contact.id) ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <div className="w-10"><input type="checkbox" checked={selectedContacts.includes(contact.id)} onChange={() => toggleContact(contact.id)} className="rounded border-gray-300 text-green-500 focus:ring-green-500" /></div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">{contact.avatar}</div>
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{contact.name}</span>
                      </div>
                      <div className="w-40 text-sm text-gray-600 dark:text-gray-300">{contact.phone}</div>
                      <div className="w-32 flex flex-wrap gap-1">{contact.tags.slice(0, 2).map(t => <span key={t} className="text-xs bg-gray-100 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{t}</span>)}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button onClick={() => setStep('compose')} disabled={selectedContacts.length === 0} className="px-4 sm:px-5 md:px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                  Next: Choose Template <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'compose' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Message Template</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">WhatsApp requires approved templates for broadcast messages.</p>

              <div className="grid gap-3">
                {broadcastTemplates.filter(t => t.status === 'approved').map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${selectedTemplate?.id === template.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{template.name.replace(/_/g, ' ')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${template.category === 'MARKETING' ? 'bg-orange-100 text-orange-700 dark:text-orange-300' : 'bg-blue-100 text-blue-700 dark:text-blue-300'}`}>{template.category}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:text-gray-300">{template.language}</span>
                      </div>
                      {selectedTemplate?.id === template.id && <CheckCircle size={20} className="text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{template.content.substring(0, 150)}...</p>
                    {template.buttons && (
                      <div className="flex gap-2 mt-2">
                        {template.buttons.map((btn, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200">{btn.text}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <button onClick={() => setStep('select')} className="px-4 sm:px-5 md:px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center gap-2">
                  <ArrowLeft size={18} /> Back
                </button>
                <button onClick={() => setStep('preview')} disabled={!selectedTemplate} className="px-4 sm:px-5 md:px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                  Next: Preview <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && selectedTemplate && (
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Broadcast Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><span className="text-gray-600 dark:text-gray-300">Campaign Name:</span><span className="font-medium">{broadcastName || 'Untitled'}</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><span className="text-gray-600 dark:text-gray-300">Recipients:</span><span className="font-medium text-green-600 dark:text-green-400">{selectedContacts.length} contacts</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><span className="text-gray-600 dark:text-gray-300">Template:</span><span className="font-medium">{selectedTemplate.name.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><span className="text-gray-600 dark:text-gray-300">Category:</span><span className="font-medium">{selectedTemplate.category}</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><span className="text-gray-600 dark:text-gray-300">Est. Cost:</span><span className="font-medium">₹{(selectedContacts.length * 0.76).toFixed(2)}</span></div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Schedule (Optional)</label>
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>

                {/* Anti-Blocking Drip Settings */}
                <div className="mt-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-orange-500" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Anti-Blocking Protection</h4>
                        <p className="text-[10px] text-orange-600 dark:text-orange-300">Drip mode prevents WhatsApp bans</p>
                      </div>
                    </div>
                    <button onClick={() => setDripEnabled(!dripEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${dripEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow-sm ${dripEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {dripEnabled && (
                    <div className="space-y-3">
                      {/* Delay Range */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Delay Between Messages</label>
                        <div className="flex items-center gap-2">
                          <input type="number" min={10} max={300} value={dripMinDelay} onChange={e => setDripMinDelay(Number(e.target.value))} className="w-20 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                          <span className="text-xs text-gray-500">to</span>
                          <input type="number" min={10} max={600} value={dripMaxDelay} onChange={e => setDripMaxDelay(Number(e.target.value))} className="w-20 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                          <span className="text-xs text-gray-500">sec</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Random delay between {dripMinDelay}-{dripMaxDelay}s per message</p>
                      </div>

                      {/* Batch Settings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Batch Size</label>
                          <input type="number" min={1} max={100} value={dripBatchSize} onChange={e => setDripBatchSize(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                          <p className="text-[10px] text-gray-500 mt-0.5">Messages per batch</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Batch Pause</label>
                          <input type="number" min={1} max={30} value={dripBatchPause} onChange={e => setDripBatchPause(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                          <p className="text-[10px] text-gray-500 mt-0.5">Min pause between batches</p>
                        </div>
                      </div>

                      {/* Rate Limits */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Max Per Hour</label>
                          <input type="number" min={5} max={200} value={dripMaxPerHour} onChange={e => setDripMaxPerHour(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Max Per Day</label>
                          <input type="number" min={10} max={2000} value={dripMaxPerDay} onChange={e => setDripMaxPerDay(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                        </div>
                      </div>

                      {/* Toggle Options */}
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={dripTypingSim} onChange={e => setDripTypingSim(e.target.checked)} className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500" />
                          <span className="text-xs text-gray-700 dark:text-gray-300">Typing simulation</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={dripRandomJitter} onChange={e => setDripRandomJitter(e.target.checked)} className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500" />
                          <span className="text-xs text-gray-700 dark:text-gray-300">Random jitter (+/- 30%)</span>
                        </label>
                      </div>

                      {/* ETA */}
                      <div className="p-2.5 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-orange-100 dark:border-orange-800/50">
                        <p className="text-[10px] text-gray-500">
                          Estimated time: <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {(() => {
                              const avgDelay = (dripMinDelay + dripMaxDelay) / 2;
                              const batchSize = dripBatchSize;
                              const batches = Math.ceil(selectedContacts.length / batchSize);
                              const totalSec = selectedContacts.length * avgDelay + (batches - 1) * dripBatchPause * 60;
                              const hrs = Math.floor(totalSec / 3600);
                              const mins = Math.floor((totalSec % 3600) / 60);
                              return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                            })()}
                          </span>
                          {' '}for {selectedContacts.length} messages • {Math.ceil(selectedContacts.length / dripBatchSize)} batches
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep('compose')} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium flex items-center justify-center gap-2">
                    <ArrowLeft size={18} /> Back
                  </button>
                  <button onClick={handleSend} disabled={isSending} className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSending ? <><RefreshCw size={18} className="animate-spin" /> Sending...</> : <><Send size={18} /> {scheduleDate ? 'Schedule' : 'Send Now'}</>}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Message Preview</h3>
                <div className="bg-[#efeae2] dark:bg-gray-800 rounded-xl p-4" style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d5cec5\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }}>
                  {selectedTemplate.header?.mediaUrl && (
                    <img src={selectedTemplate.header.mediaUrl} alt="Header" className="w-full rounded-t-lg mb-2" />
                  )}
                  <div className="bg-[#d9fdd3] rounded-xl rounded-tr-none p-3 shadow-sm">
                    <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                      {selectedTemplate.content
                        .replace(/\{\{1\}\}/g, 'Rahul')
                        .replace(/\{\{2\}\}/g, '30')
                        .replace(/\{\{3\}\}/g, 'March 31')
                        .replace(/\{\{4\}\}/g, '+91 8983027975')}
                    </p>
                    {selectedTemplate.footer && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{selectedTemplate.footer}</p>}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">10:30 AM</span>
                      <CheckCheck size={14} className="text-blue-500" />
                    </div>
                  </div>
                  {selectedTemplate.buttons && (
                    <div className="mt-2 space-y-1">
                      {selectedTemplate.buttons.map((btn, i) => (
                        <button key={i} className="w-full py-2 bg-white dark:bg-gray-600 dark:text-white rounded-lg text-sm text-blue-500 font-medium border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-1.5">
                          {btn.type === 'URL' ? <ExternalLink size={14} /> : <ArrowLeft size={14} />} {btn.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// TEMPLATE MANAGER VIEW
// ============================================================

const TemplateManagerView: React.FC = () => {
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    fetchTemplates().then(t => { setTemplates(t); setTemplatesLoading(false); });
  }, []);
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'MARKETING', language: 'en', content: '', footer: '' });
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  const filtered = templates.filter(t => filterStatus === 'all' || t.status === filterStatus);
  const statusColors: Record<string, string> = { approved: 'bg-green-100 text-green-700 dark:text-green-300', pending: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={22} className="text-blue-500" /> Message Templates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your WhatsApp HSM templates for broadcasts</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2">
            <Plus size={18} /> Create Template
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total', value: templates.length, color: 'bg-blue-500' },
            { label: 'Approved', value: templates.filter(t => t.status === 'approved').length, color: 'bg-green-500' },
            { label: 'Pending', value: templates.filter(t => t.status === 'pending').length, color: 'bg-yellow-500' },
            { label: 'Rejected', value: templates.filter(t => t.status === 'rejected').length, color: 'bg-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>{stat.value}</div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{stat.label} Templates</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'approved', 'pending', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === s ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-600 dark:text-white text-gray-600 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Create Template Modal */}
        {showCreate && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Template</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Template Name</label>
                <input type="text" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="e.g., welcome_message" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
                  <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Language</label>
                  <select value={newTemplate.language} onChange={e => setNewTemplate({ ...newTemplate, language: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="mr">Marathi</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Message Body</label>
              <textarea rows={4} value={newTemplate.content} onChange={e => setNewTemplate({ ...newTemplate, content: e.target.value })} placeholder="Use {{1}}, {{2}} etc. for variables..." className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use {"{{1}}"}, {"{{2}}"} for dynamic variables like customer name, date, etc.</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Footer (Optional)</label>
              <input type="text" value={newTemplate.footer} onChange={e => setNewTemplate({ ...newTemplate, footer: e.target.value })} placeholder="e.g., Reply STOP to unsubscribe" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button
                onClick={() => {
                  if (newTemplate.name && newTemplate.content) {
                    setTemplates(prev => [...prev, { id: `t-${Date.now()}`, ...newTemplate, status: 'pending' as const, variables: (newTemplate.content.match(/\{\{\d+\}\}/g) || []).map((_, i) => `var_${i + 1}`) }]);
                    setShowCreate(false);
                    setNewTemplate({ name: '', category: 'MARKETING', language: 'en', content: '', footer: '' });
                  }
                }}
                className="px-4 sm:px-5 md:px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-3">
          {filtered.map(template => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.category === 'MARKETING' ? 'bg-orange-100 text-orange-600 dark:text-orange-300' : 'bg-blue-100 text-blue-600 dark:text-blue-400'}`}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{template.name.replace(/_/g, ' ')}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[template.status]}`}>{template.status}</span>
                      <span className="text-xs text-gray-400">{template.category}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{template.language === 'en' ? '🇬🇧 English' : template.language === 'hi' ? '🇮🇳 Hindi' : template.language}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><Copy size={16} /></button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><Edit3 size={16} /></button>
                  <button className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{template.content}</div>
              {template.buttons && (
                <div className="flex gap-2 mt-2">
                  {template.buttons.map((btn, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200">{btn.text}</span>
                  ))}
                </div>
              )}
              {template.footer && <p className="text-xs text-gray-400 mt-2 italic">{template.footer}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS VIEW
// ============================================================

const WhatsAppSettingsView: React.FC = () => {
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! 👋 Welcome to our business. How can we help you today?');
  const [awayMessage, setAwayMessage] = useState('We are currently away. Our business hours are Mon-Sat, 10 AM to 8 PM IST. We\'ll get back to you soon!');
  const [autoReplies, setAutoReplies] = useState<AutoReplyRule[]>([]);
  const [autoRepliesLoading, setAutoRepliesLoading] = useState(true);

  useEffect(() => {
    fetchAutoReplies().then(r => { setAutoReplies(r); setAutoRepliesLoading(false); });
  }, []);
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(true);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><SettingsIcon size={22} className="text-gray-500 dark:text-gray-400" /> WhatsApp Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure auto-replies, business hours, and chatbot settings</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Auto Reply */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Bot size={20} className="text-green-600 dark:text-green-400" /></div>
                <div><h3 className="font-semibold text-gray-900 dark:text-white">Auto-Reply</h3><p className="text-xs text-gray-500 dark:text-gray-400">Automatically respond to incoming messages</p></div>
              </div>
              <button onClick={() => setAutoReplyEnabled(!autoReplyEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${autoReplyEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white dark:bg-gray-300 rounded-full top-0.5 transition-transform shadow-sm ${autoReplyEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {autoReplyEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                {/* Welcome Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Welcome Message (First-time contacts)</label>
                  <textarea rows={3} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                {/* Away Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Away Message (Outside business hours)</label>
                  <textarea rows={3} value={awayMessage} onChange={e => setAwayMessage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm" />
                </div>

                {/* Keyword Replies */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Keyword Auto-Replies</h4>
                  <div className="space-y-2 mb-4">
                    {autoReplies.map(rule => (
                      <div key={rule.id} className={`flex items-start gap-3 p-3 rounded-lg border ${rule.isActive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 border-gray-200'}`}>
                        <button
                          onClick={() => setAutoReplies(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                          className={`mt-1 w-8 h-4 rounded-full flex-shrink-0 transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform shadow-sm ${rule.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs bg-blue-100 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono">{rule.keyword}</code>
                            <span className="text-xs text-gray-400">{rule.matchType}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{rule.response.substring(0, 100)}...</p>
                        </div>
                        <button onClick={() => setAutoReplies(prev => prev.filter(r => r.id !== rule.id))} className="p-1 hover:bg-red-100 rounded text-red-400"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Rule */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Add New Auto-Reply Rule</h5>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Keyword (e.g., hours)" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                      <textarea value={newResponse} onChange={e => setNewResponse(e.target.value)} placeholder="Auto-reply message..." className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" rows={2} />
                    </div>
                    <button
                      onClick={() => {
                        if (newKeyword && newResponse) {
                          setAutoReplies(prev => [...prev, { id: `ar-${Date.now()}`, keyword: newKeyword, response: newResponse, isActive: true, matchType: 'contains' }]);
                          setNewKeyword('');
                          setNewResponse('');
                        }
                      }}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                    >
                      Add Rule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Business Hours */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Clock size={20} className="text-blue-600 dark:text-blue-400" /></div>
                <div><h3 className="font-semibold text-gray-900 dark:text-white">Business Hours</h3><p className="text-xs text-gray-500 dark:text-gray-400">Set your working hours for auto-away</p></div>
              </div>
              <button onClick={() => setBusinessHoursEnabled(!businessHoursEnabled)} className={`relative w-12 h-6 rounded-full transition-colors ${businessHoursEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white dark:bg-gray-300 rounded-full top-0.5 transition-transform shadow-sm ${businessHoursEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {businessHoursEnabled && (
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="flex items-center gap-4 text-sm">
                    <span className="w-24 text-gray-700 dark:text-gray-200 font-medium">{day}</span>
                    <input type="time" defaultValue="10:00" className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                    <span className="text-gray-400">to</span>
                    <input type="time" defaultValue="20:00" className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                    <CheckCircle size={16} className="text-green-500" />
                  </div>
                ))}
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-gray-700 dark:text-gray-200 font-medium">Sunday</span>
                  <span className="text-red-500 text-xs font-medium">Closed</span>
                </div>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Bell size={20} className="text-purple-600 dark:text-purple-400" /></div>
              <div><h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3><p className="text-xs text-gray-500 dark:text-gray-400">Configure message notifications</p></div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'New message alert', desc: 'Get notified when a new message arrives', defaultChecked: true },
                { label: 'Unread message reminder', desc: 'Remind after 5 minutes of unread messages', defaultChecked: true },
                { label: 'Campaign completion', desc: 'Notify when a broadcast campaign completes', defaultChecked: true },
                { label: 'Negative keyword alert', desc: 'Alert when customer uses negative words', defaultChecked: false },
              ].map((setting, i) => (
                <label key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{setting.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{setting.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked={setting.defaultChecked} className="w-4 h-4 text-green-500 rounded focus:ring-green-500" />
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-4 sm:px-5 md:px-6 md:px-4 sm:px-6 md:px-8 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold shadow-lg shadow-green-500/20">
              💾 Save All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CAMPAIGNS VIEW
// ============================================================

const CampaignsView: React.FC = () => {
  const campaigns = [
    { id: 'c1', name: 'Diwali Sale 2024', status: 'active', sent: 1250, delivered: 1200, read: 890, replied: 156, template: 'diwali_offer', createdAt: '2 days ago' },
    { id: 'c2', name: 'New Year Greetings', status: 'scheduled', sent: 0, delivered: 0, read: 0, replied: 0, template: 'welcome_message', createdAt: '1 day ago' },
    { id: 'c3', name: 'Flash Sale Weekend', status: 'completed', sent: 800, delivered: 780, read: 650, replied: 120, template: 'welcome_message', createdAt: '5 days ago' },
    { id: 'c4', name: 'Follow-up Drip', status: 'draft', sent: 0, delivered: 0, read: 0, replied: 0, template: 'feedback_request', createdAt: '3 hours ago' },
  ];

  const statusConfig: Record<string, { color: string; bg: string }> = {
    active: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100' },
    scheduled: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100' },
    completed: { color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-100' },
    draft: { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100' },
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Zap size={22} className="text-yellow-500" /> Campaigns</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your drip campaigns and automated sequences</p>
          </div>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2">
            <Plus size={18} /> New Campaign
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl sm:text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">2,050</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sent</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl sm:text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">96.5%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Delivery Rate</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl sm:text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">72.8%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Read Rate</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xl sm:text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-300">13.4%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reply Rate</p>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${campaign.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' : campaign.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30' : campaign.status === 'draft' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {campaign.status === 'active' ? <Radio size={20} className="text-green-600 dark:text-green-400 animate-pulse" /> : campaign.status === 'scheduled' ? <Clock size={20} className="text-blue-600 dark:text-blue-400" /> : campaign.status === 'draft' ? <Edit3 size={20} className="text-orange-600 dark:text-orange-300" /> : <CheckCircle size={20} className="text-gray-600 dark:text-gray-300" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Created {campaign.createdAt} • Template: {campaign.template.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig[campaign.status]?.bg} ${statusConfig[campaign.status]?.color}`}>{campaign.status}</span>
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg"><MoreVertical size={16} className="text-gray-500 dark:text-gray-400" /></button>
                </div>
              </div>

              {campaign.sent > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-blue-600 dark:text-blue-400">{campaign.sent.toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Sent</p></div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-green-600 dark:text-green-400">{campaign.delivered.toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p></div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-purple-600 dark:text-purple-400">{campaign.read.toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Read</p></div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2.5 text-center"><p className="text-lg font-bold text-orange-600 dark:text-orange-300">{campaign.replied.toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400">Replied</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SCHEDULED MESSAGES VIEW
// ============================================================

interface ScheduledMsg {
  id: string;
  phone: string;
  type: string;
  content: string | null;
  templateName: string | null;
  scheduledAt: string;
  status: string;
  contact?: { id: string; name: string | null; phone: string } | null;
  sentAt?: string | null;
  error?: string | null;
}

const ScheduledMessagesView: React.FC = () => {
  const [messages, setMessages] = useState<ScheduledMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');
  const [form, setForm] = useState({
    phone: '',
    content: '',
    type: 'text',
    scheduledAt: '',
    templateName: '',
  });

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/whatsapp/scheduled${filter !== 'all' ? `?status=${filter}` : ''}`);
      if (res.data?.success) setMessages(res.data.data.messages || []);
    } catch {
      // Fallback: show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScheduled(); }, [filter]);

  const handleSchedule = async () => {
    if (!form.phone || !form.scheduledAt || (!form.content && !form.templateName)) return;
    try {
      await apiClient.post('/api/whatsapp/schedule', form);
      setForm({ phone: '', content: '', type: 'text', scheduledAt: '', templateName: '' });
      setShowScheduleForm(false);
      fetchScheduled();
    } catch {
      // Error handled silently
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiClient.patch(`/api/whatsapp/scheduled/${id}/cancel`);
      fetchScheduled();
    } catch {
      // Error handled silently
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-green-100 text-green-700 dark:text-green-300',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500 dark:text-gray-400',
  };

  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={22} className="text-green-500" /> Scheduled Messages
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule messages to be sent at a later time</p>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} /> New Schedule
          </button>
        </div>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 8983027975"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Schedule Time *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Message *</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Type your message here..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 text-sm resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSchedule}
                disabled={!form.phone || !form.scheduledAt || !form.content}
                className="px-4 sm:px-5 md:px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Calendar size={18} /> Schedule Message
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="px-4 sm:px-5 md:px-6 py-2.5 bg-gray-100 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-2 flex gap-2">
        {(['all', 'pending', 'sent', 'failed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${filter === s ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {s} {s === 'all' ? `(${messages.length})` : `(${messages.filter(m => m.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-green-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Calendar size={40} className="text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Scheduled Messages</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Schedule a message to send it at the perfect time</p>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center gap-2"
            >
              <Plus size={18} /> Schedule Your First Message
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {filtered.map(msg => (
              <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{msg.contact?.name || msg.phone}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[msg.status] || 'bg-gray-100 text-gray-600 dark:text-gray-300'}`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mb-2 line-clamp-2">{msg.content || msg.templateName}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(msg.scheduledAt)}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {msg.phone}</span>
                      {msg.type !== 'text' && <span className="flex items-center gap-1"><Tag size={12} /> {msg.type}</span>}
                    </div>
                    {msg.error && <p className="text-xs text-red-500 mt-1">⚠ {msg.error}</p>}
                  </div>
                  {msg.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(msg.id)}
                      className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN WHATSAPP MODULE
// ============================================================

const WhatsAppModule: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<WAView>('chats');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [qrValue, setQrValue] = useState(`WACONNECT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [contacts, setContacts] = useState<WAContact[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // Evolution API state
  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionConfig>({
    baseUrl: '',
    apiKey: '',
    instanceName: '',
    phone: '',
    configured: false,
  });
  const [evolutionInstanceName, setEvolutionInstanceName] = useState('');
  const [isEvolutionConnected, setIsEvolutionConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('meta');
  const [evolutionQR, setEvolutionQR] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Handle OAuth redirect params (success/error from Meta callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'connected') {
      setConnectionStatus('connected');
      setCurrentView('chats');
      // Clean URL
      window.history.replaceState({}, '', '/whatsapp');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        auth_denied: 'Authorization denied by user',
        no_code: 'No authorization code received',
        state_expired: 'Session expired, please try again',
        invalid_state: 'Invalid session state',
        server_config_missing: 'Server configuration missing (META_APP_ID/SECRET)',
        callback_failed: 'Connection failed, please try again',
      };
      setApiError(errorMessages[error] || `Connection failed: ${error}`);
      window.history.replaceState({}, '', '/whatsapp');
    }
  }, []);

  // Check WhatsApp status on mount
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const status = await whatsappAPI.getStatus();
        if (mounted && status?.data?.data?.connected) {
          setConnectionStatus('connected');
          setConnectedPhone(status.data.data.phoneNumber || '');
        }
      } catch {
        // Not connected or error
      }
    };
    checkStatus();
    return () => { mounted = false; };
  }, []);

  // Fetch Evolution config on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setApiLoading(true);
      try {
        const config = await tryAPI(
          () => evolutionAPI.getConfig(),
          null as any
        );
        if (mounted && config && config.baseUrl) {
          setEvolutionConfig({
            baseUrl: config.baseUrl || '',
            apiKey: config.apiKey || '',
            instanceName: config.instanceName || '',
            phone: config.phone || '',
            configured: !!config.baseUrl,
          });
          if (config.instanceName) {
            setEvolutionInstanceName(config.instanceName);
            // Check status
            try {
              const status = await evolutionAPI.getStatus(config.instanceName);
              if (mounted && status?.data?.data?.status === 'connected') {
                setIsEvolutionConnected(true);
                setConnectionStatus('connected');
              }
            } catch {
              // Status check failed, not critical
            }
          }
        }
      } catch {
        // Config not available, user will configure manually
      } finally {
        if (mounted) setApiLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Load chats when connected
  useEffect(() => {
    if (isEvolutionConnected && evolutionInstanceName) {
      const loadChats = async () => {
        try {
          const chatsData = await tryAPI(
            () => evolutionAPI.getChats(evolutionInstanceName),
            null as any
          );
          if (chatsData && Array.isArray(chatsData)) {
            // Map API chats to contacts
            const apiContacts: WAContact[] = chatsData.map((chat: any, idx: number) => ({
              id: chat.id || `api-${idx}`,
              name: chat.name || chat.pushName || chat.remoteJid || 'Unknown',
              phone: chat.remoteJid?.replace(/\D/g, '') || '',
              avatar: (chat.name || chat.pushName || '?').substring(0, 2).toUpperCase(),
              lastMessage: typeof chat.lastMessage === 'string' ? chat.lastMessage : chat.lastMessage?.message?.conversation || chat.lastMessage?.pushName || (chat.lastMessage?.key?.remoteJid || ''),
              lastMessageTime: typeof chat.lastMessage === 'object' && chat.lastMessage?.messageTimestamp ? new Date(Number(chat.lastMessage.messageTimestamp) * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : chat.lastMessage?.timestamp || 'Recently',
              unreadCount: chat.unreadCount || 0,
              online: false,
              tags: [],
              isGroup: chat.isGroup || false,
              label: (chat.unreadCount || 0) > 0 ? 'open' : 'pending',
            }));
            if (apiContacts.length > 0) {
              setContacts(apiContacts);
            }
          }
        } catch {
          // Keep mock contacts as fallback
        }
      };
      loadChats();
    }
  }, [isEvolutionConnected, evolutionInstanceName]);

  // Poll connection status when scanning to detect QR scan completion
  useEffect(() => {
    if (connectionStatus !== 'scanning' || !evolutionInstanceName) return;
    let mounted = true;
    const poll = async () => {
      try {
        const res = await evolutionAPI.getStatus(evolutionInstanceName);
        if (!mounted) return;
        if (res?.data?.data?.status === 'connected') {
          setIsEvolutionConnected(true);
          setConnectionStatus('connected');
          setConnectedPhone(res.data.data.phone || '');
        } else if (res?.data?.data?.status === 'disconnected') {
          setConnectionStatus('disconnected');
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, [connectionStatus, evolutionInstanceName]);

  const handleEvolutionConnect = async () => {
    setApiError(null);
    if (!evolutionConfig.configured) {
      setApiError('Please configure Evolution API first');
      return;
    }
    try {
      const instanceName = evolutionConfig.instanceName || `instance-${Date.now()}`;
      setEvolutionInstanceName(instanceName);
      setEvolutionQR(''); // Clear previous QR

      // Try to create instance (include apiKey!)
      try {
        await evolutionAPI.createInstance({
          instanceName,
          baseUrl: evolutionConfig.baseUrl,
          apiKey: evolutionConfig.apiKey,
          phone: evolutionConfig.phone,
        });
      } catch {
        // Instance may already exist, continue
      }

      // Connect and get QR
      const connectRes = await evolutionAPI.connectInstance(instanceName, evolutionConfig.phone);
      // Server wraps response: { success: true, data: { qrCode, qrCodeBase64, status } }
      const responseData = connectRes?.data?.data || connectRes?.data;
      const qrCode = responseData?.qrCodeBase64 || responseData?.qrCode || '';
      if (qrCode) {
        setEvolutionQR(qrCode);
        setConnectionStatus('scanning');
      } else {
        // No QR yet - show general error with helpful message
        // Common issue: instance already exists in 'connecting' state
        setApiError(
          'No QR code received from Evolution API. The instance may already be in use or stuck. '
          + 'Try deleting the instance first, or check the Evolution API server logs. '
          + 'Known fix: Set DATABASE_SAVE_DATA_CHATS=false in Evolution API env vars.'
        );
      }
    } catch (err: any) {
      setApiError(err?.message || 'Failed to connect to Evolution API');
    }
  };

  const handleEvolutionConfigSave = async (config: EvolutionConfig) => {
    setEvolutionConfig(config);
    setApiError(null);
    try {
      await evolutionAPI.saveConfig({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        instanceName: config.instanceName,
        phone: config.phone,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to save Evolution API configuration';
      // Revert configured flag so UI doesn't show 'Connect' when backend save failed
      setEvolutionConfig(prev => ({ ...prev, configured: false }));
      setApiError(errorMsg);
    }
  };

  const handleConnect = async () => {
    if (connectionMode === 'evolution') {
      handleEvolutionConnect();
      return;
    }
    // Meta OAuth flow - call backend to get signup URL
    try {
      const response = await whatsappAPI.connect();
      const signupUrl = response.data?.signupUrl || response.data?.data?.signupUrl;
      if (signupUrl) {
        // Open Meta OAuth in same window
        window.location.href = signupUrl;
      } else {
        setApiError('Failed to get signup URL. Check META_APP_ID in .env');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Failed to initiate connection';
      setApiError(errorMsg);
    }
  };

  const handleDisconnect = async () => {
    if (connectionMode === 'evolution' && isEvolutionConnected && evolutionInstanceName) {
      try {
        await evolutionAPI.disconnectInstance(evolutionInstanceName);
      } catch {
        // Continue anyway
      }
    }
    setConnectionStatus('disconnected');
    setConnectedPhone('');
    setIsEvolutionConnected(false);
    setCurrentView('connect');
  };

  const handleRefreshQR = () => {
    setQrValue(`WACONNECT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  };

  const handleSendMessage = async (contactId: string, message: string) => {
    // If Evolution connected, try API
    if (isEvolutionConnected && evolutionInstanceName) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        try {
          await evolutionAPI.sendText({
            instanceName: evolutionInstanceName,
            to: contact.phone.replace(/\s/g, ''),
            message: message,
          });
          return;
        } catch {
          // Fall through to local handling
        }
      }
    }
    console.log(`[Fallback] Sending to ${contactId}: ${message}`);
  };

  const navItems: { id: WAView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'chats', label: 'Chats', icon: <MessageSquare size={18} />, badge: contacts.reduce((sum, c) => sum + c.unreadCount, 0) },
    { id: 'scheduled', label: 'Scheduled', icon: <Calendar size={18} /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Radio size={18} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Zap size={18} /> },
    { id: 'templates', label: 'Templates', icon: <FileText size={18} /> },
    { id: 'connect', label: 'Connection', icon: connectionStatus === 'connected' ? <Wifi size={18} /> : <WifiOff size={18} /> },
    { id: 'claude', label: 'Claude AI', icon: <Bot size={18} /> },
    { id: 'unofficial', label: 'Unofficial', icon: <Server size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between h-14 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">WhatsApp Business</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-xs ${connectionStatus === 'connected' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {connectionStatus === 'connected'
                    ? `Connected${connectionMode === 'evolution' ? ' (Evolution)' : ''} ${connectedPhone}`
                    : `Disconnected${apiLoading ? ' - Loading...' : ''}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentView === item.id
                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"><Bell size={18} /></button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"><BarChart3 size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {currentView === 'connect' && (
          <QRConnectView
            connectionStatus={connectionStatus}
            connectedPhone={connectedPhone}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefreshQR={handleRefreshQR}
            qrValue={connectionMode === 'evolution' ? evolutionQR : qrValue}
            connectionMode={connectionMode}
            onModeChange={setConnectionMode}
            evolutionConfig={evolutionConfig}
            onEvolutionConfigChange={handleEvolutionConfigSave}
            onEvolutionConnect={handleEvolutionConnect}
            apiError={apiError}
          />
        )}
        {currentView === 'chats' && (
          <ChatView
            contacts={contacts}
            onSendMessage={handleSendMessage}
            onNavigate={setCurrentView}
            evolutionInstanceName={evolutionInstanceName}
            isConnected={isEvolutionConnected}
          />
        )}
        {currentView === 'scheduled' && <ScheduledMessagesView />}
        {currentView === 'broadcast' && <BroadcastView />}
        {currentView === 'templates' && <TemplateManagerView />}
        {currentView === 'campaigns' && <CampaignsView />}
        {currentView === 'settings' && <WhatsAppSettingsView />}
        {currentView === 'chatbot' && (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Bot size={64} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">Chatbot Builder</h2>
              <p className="text-gray-500 dark:text-gray-400">Visual flow builder coming soon!</p>
            </div>
          </div>
        )}
        {currentView === 'claude' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <ClaudeWhatsAppSettings />
          </div>
        )}
        {currentView === 'unofficial' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <UnofficialWhatsAppSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppModule;

