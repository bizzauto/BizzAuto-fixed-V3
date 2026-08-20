import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  MessageSquare, Send, Sparkles, Copy, Check,
  ThumbsUp, ThumbsDown, Loader2, Clock, Wand2
} from 'lucide-react';

interface SmartReply {
  id: string;
  text: string;
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  confidence: number;
}

export default function SmartReplyPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReplies = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setReplies([]);
    try {
      const res = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, context }),
      });
      const data = await res.json();
      if (data.success && data.data?.replies) {
        setReplies(data.data.replies);
      } else {
        setError('Unable to generate replies. Please check your AI configuration and try again.');
      }
    } catch {
      setError('Unable to generate replies. Please check your AI configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyReply = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toneColors: Record<string, string> = {
    professional: 'bg-blue-100 text-blue-700',
    friendly: 'bg-green-100 text-green-700',
    formal: 'bg-purple-100 text-purple-700',
    casual: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Wand2 className="text-purple-600" /> Smart Reply Suggestions
        </h1>
        <p className="text-gray-600 mt-1">AI-powered reply suggestions for your conversations</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Incoming Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Paste the customer message here..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Context (Optional)</label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
            placeholder="e.g., Customer asking about pricing, technical issue, etc."
          />
        </div>
        <button
          onClick={generateReplies}
          disabled={!message.trim() || loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          {loading ? 'Generating...' : 'Generate Smart Replies'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 mb-3">{error}</p>
          <button
            onClick={generateReplies}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} /> Suggested Replies
          </h3>
          {replies.map((reply) => (
            <div key={reply.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-800">{reply.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${toneColors[reply.tone]}`}>
                      {reply.tone}
                    </span>
                    <span className="text-xs text-gray-400">{reply.confidence}% confidence</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyReply(reply.id, reply.text)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {copiedId === reply.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <ThumbsUp size={16} className="text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <ThumbsDown size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}