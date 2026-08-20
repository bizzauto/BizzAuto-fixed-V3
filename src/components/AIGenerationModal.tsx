import React, { useState } from 'react';
import {
  Sparkles, X, Loader2, Wand2, MessageSquare, Workflow,
  AlertCircle, ChevronRight, CheckCircle,
} from 'lucide-react';
import { workflowsAPI } from '../lib/api';
import { useToast } from './Toast';

// ============================================================
// AI GENERATION MODAL
// ============================================================

interface AIGenerationModalProps {
  onClose: () => void;
  onWorkflowGenerated?: (workflowId?: string) => void;
}

const EXAMPLE_PROMPTS = [
  'When a lead is created, send a welcome WhatsApp, wait 1 day, then send a follow-up email',
  'When a message is received on WhatsApp, use AI to reply, then score the lead and notify the sales team',
  'When an order is placed, send a confirmation WhatsApp, wait 3 days, then ask for a review',
  'When a deal moves to Closed Won, send a thank you email, create a follow-up task, and notify the team',
];

export default function AIGenerationModal({ onClose, onWorkflowGenerated }: AIGenerationModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<{ name?: string; nodes?: any[]; edges?: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toastError('Please describe the workflow you want to create');
      return;
    }
    setGenerating(true);
    setGeneratedData(null);
    try {
      const res = await workflowsAPI.generateWithAI({ prompt: prompt.trim() });
      const data = res.data?.data || res.data;
      setGeneratedData(data);
      toastSuccess('AI generated workflow! Review and save.');
    } catch {
      toastError('Failed to generate workflow. Check your AI API key configuration.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedData?.nodes?.length) return;
    setSaving(true);
    try {
      // Find the trigger node to determine triggerType
      const triggerNode = generatedData.nodes.find(n => n.data?.category === 'trigger');
      const triggerType = triggerNode?.data?.nodeType || 'message_received';
      const triggerConfig = triggerNode?.data?.config || {};

      const payload = {
        name: generatedData.name || prompt.slice(0, 50),
        description: `AI-generated: ${prompt}`,
        triggerType,
        triggerConfig,
        nodes: generatedData.nodes,
        edges: generatedData.edges || [],
      };

      const res = await workflowsAPI.create(payload);
      toastSuccess('Workflow saved!');
      const newId = res.data?.data?.id;
      onWorkflowGenerated?.(newId);
    } catch {
      toastError('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg mx-4 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Wand2 size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Generate Workflow with AI</h2>
              <p className="text-xs text-gray-400">Describe your automation in plain English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Describe your workflow
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. When a lead is created, send a welcome WhatsApp message, wait 1 day, then send a follow-up email and score the lead with AI..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={generating}
            />
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Try an example:</p>
            <div className="space-y-1.5">
              {EXAMPLE_PROMPTS.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left flex items-start gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-900/30 hover:bg-gray-700/30 rounded-lg transition-colors group"
                >
                  <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-gray-600 group-hover:text-purple-400" />
                  <span className="leading-relaxed">{example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generated Preview */}
          {generatedData && (
            <div className="bg-gray-900/50 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Workflow Generated</span>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Name: {generatedData.name || prompt.slice(0, 50)}</p>
                <p>Nodes: {generatedData.nodes?.length || 0}</p>
                <p>Connections: {generatedData.edges?.length || 0}</p>
              </div>
              {generatedData.nodes && generatedData.nodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {generatedData.nodes.map((n: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-gray-700/50 text-gray-300">
                      <Workflow size={10} />
                      {n.data?.label || n.data?.nodeType || 'Node'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error or empty state */}
          {!generating && !generatedData && prompt.length > 10 && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300/80">
                Click "Generate" to create your workflow. You'll be able to review and edit it on the canvas before saving.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-900/50 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {generatedData ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              <span>{saving ? 'Saving...' : 'Save & Open'}</span>
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>{generating ? 'Generating...' : 'Generate'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
