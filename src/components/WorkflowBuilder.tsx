import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Zap, MessageSquare, Mail, Phone, Tag, UserPlus, FileText,
  Clock, Bot, ArrowRight, Settings, Save, Play, Pause, Trash2,
  Plus, ChevronDown, ChevronRight, Search, CheckCircle, XCircle,
  Loader2, GripVertical, X, GitBranch, Timer, Brain, Sparkles,
  MessageCircle, Hash, Globe, Webhook, Workflow, Power, PowerOff,
  TestTube, Edit3, Eye, Copy, AlertCircle, Info, ChevronLeft,
  Wand2, BarChart3, TrendingUp, Calendar,
  ShoppingCart, CreditCard, Users, Activity, Target,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from './Toast';
import { workflowsAPI } from '../lib/api';
import WorkflowListView from './WorkflowListView';
import AIGenerationModal from './AIGenerationModal';

// ============================================================
// TYPES
// ============================================================

type NodeCategory = 'trigger' | 'action' | 'condition' | 'ai';
type TriggerType =
  | 'message_received'
  | 'lead_created'
  | 'form_submitted'
  | 'tag_added'
  | 'deal_stage_changed'
  | 'appointment_booked'
  | 'order_placed'
  | 'payment_received';
type ActionType =
  | 'send_whatsapp'
  | 'send_email'
  | 'send_sms'
  | 'add_tag'
  | 'remove_tag'
  | 'update_contact'
  | 'webhook'
  | 'notify_team'
  | 'add_activity'
  | 'create_deal';
type ConditionType = 'if_else' | 'wait_delay';
type AINodeType =
  | 'ai_reply'
  | 'ai_score_lead'
  | 'ai_content'
  | 'ai_sentiment'
  | 'ai_analyze';
type WorkflowNodeType = TriggerType | ActionType | ConditionType | AINodeType;

interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: WorkflowNodeType;
  category: NodeCategory;
  config: Record<string, unknown>;
}

type WorkflowNode = Node<WorkflowNodeData>;
type WorkflowEdge = Edge;

interface NodeTemplate {
  type: WorkflowNodeType;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

// ============================================================
// NODE TEMPLATES
// ============================================================

const NODE_TEMPLATES: NodeTemplate[] = [
  // Triggers
  { type: 'message_received', label: 'Message Received', category: 'trigger', icon: MessageSquare, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a message is received' },
  { type: 'lead_created', label: 'Lead Created', category: 'trigger', icon: UserPlus, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a new lead is created' },
  { type: 'form_submitted', label: 'Form Submitted', category: 'trigger', icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a form is submitted' },
  { type: 'tag_added', label: 'Tag Added', category: 'trigger', icon: Tag, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a tag is added to a contact' },
  { type: 'deal_stage_changed', label: 'Deal Stage Changed', category: 'trigger', icon: ArrowRight, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a deal stage changes' },
  { type: 'appointment_booked', label: 'Appointment Booked', category: 'trigger', icon: Calendar, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When an appointment is booked' },
  { type: 'order_placed', label: 'Order Placed', category: 'trigger', icon: ShoppingCart, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a new order is placed' },
  { type: 'payment_received', label: 'Payment Received', category: 'trigger', icon: CreditCard, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', description: 'When a payment is received' },

  // Actions
  { type: 'send_whatsapp', label: 'Send WhatsApp', category: 'action', icon: MessageCircle, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Send a WhatsApp message' },
  { type: 'send_email', label: 'Send Email', category: 'action', icon: Mail, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Send an email' },
  { type: 'send_sms', label: 'Send SMS', category: 'action', icon: Phone, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Send an SMS' },
  { type: 'add_tag', label: 'Add Tag', category: 'action', icon: Tag, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Add a tag to contact' },
  { type: 'remove_tag', label: 'Remove Tag', category: 'action', icon: Tag, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Remove a tag from contact' },
  { type: 'update_contact', label: 'Update Contact', category: 'action', icon: Edit3, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Update contact fields' },
  { type: 'webhook', label: 'Webhook', category: 'action', icon: Webhook, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Call an external webhook' },
  { type: 'notify_team', label: 'Notify Team', category: 'action', icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Send team notification' },
  { type: 'add_activity', label: 'Add Activity', category: 'action', icon: Activity, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Log contact activity' },
  { type: 'create_deal', label: 'Create Deal', category: 'action', icon: Target, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', description: 'Create a new deal' },

  // Conditions
  { type: 'if_else', label: 'If / Else', category: 'condition', icon: GitBranch, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', description: 'Branch based on conditions' },
  { type: 'wait_delay', label: 'Wait / Delay', category: 'condition', icon: Timer, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', description: 'Wait before continuing' },

  // AI
  { type: 'ai_reply', label: 'AI Reply', category: 'ai', icon: Brain, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Generate AI response' },
  { type: 'ai_score_lead', label: 'AI Score Lead', category: 'ai', icon: Sparkles, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Score lead with AI' },
  { type: 'ai_content', label: 'AI Content', category: 'ai', icon: Wand2, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Generate content with AI' },
  { type: 'ai_sentiment', label: 'AI Sentiment', category: 'ai', icon: BarChart3, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Analyze message sentiment' },
  { type: 'ai_analyze', label: 'AI Analyze', category: 'ai', icon: TrendingUp, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', description: 'Analyze data with AI' },
];

const CATEGORY_META: Record<NodeCategory, { label: string; color: string; icon: LucideIcon }> = {
  trigger: { label: 'Triggers', color: 'text-emerald-400', icon: Zap },
  action: { label: 'Actions', color: 'text-blue-400', icon: ArrowRight },
  condition: { label: 'Conditions', color: 'text-amber-400', icon: GitBranch },
  ai: { label: 'AI', color: 'text-purple-400', icon: Brain },
};

const CONNECTION_RULES: Record<string, string[]> = {
  trigger: ['action', 'condition'],
  action: ['action', 'condition', 'ai'],
  condition: ['action', 'condition', 'ai'],
  ai: ['action', 'condition'],
};

// ============================================================
// CUSTOM NODE COMPONENT
// ============================================================

function WorkflowNodeComponent({ data, selected }: NodeProps<WorkflowNode>) {
  const template = NODE_TEMPLATES.find((t) => t.type === data.nodeType);
  if (!template) return null;
  const Icon = template.icon;

  return (
    <div
      className={`
        relative rounded-lg border-2 px-4 py-3 min-w-[180px] transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : ''}
        ${template.bgColor} ${template.borderColor}
        bg-gray-800/90 backdrop-blur-sm
        hover:shadow-lg hover:shadow-blue-500/10
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-blue-500 !-top-1.5"
      />

      <div className="flex items-center gap-2">
        <div className={`flex-shrink-0 ${template.color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{data.label}</div>
          <div className="text-xs text-gray-400 truncate mt-0.5">{template.description}</div>
        </div>
      </div>

      {data.category === 'trigger' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      )}

      {/* Condition node: true/false branch handles */}
      {data.nodeType === 'if_else' ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-400 hover:!bg-emerald-400 !-bottom-1.5 !left-[30%]"
            title="True branch"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-400 hover:!bg-red-400 !-bottom-1.5 !left-[70%]"
            title="False branch"
          />
          <div className="flex justify-between mt-1.5 text-[10px]">
            <span className="text-emerald-400 font-medium">✓ True</span>
            <span className="text-red-400 font-medium">✗ False</span>
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-blue-500 !-bottom-1.5"
        />
      )}
    </div>
  );
}

// ============================================================
// DRAGGABLE SIDEBAR NODE
// ============================================================

function DraggableNode({ template }: { template: NodeTemplate }) {
  const Icon = template.icon;

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: template.type,
      category: template.category,
      label: template.label,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing
        border ${template.borderColor} ${template.bgColor}
        bg-gray-800/50 hover:bg-gray-700/50 transition-colors
        hover:shadow-md group
      `}
    >
      <GripVertical size={14} className="text-gray-500 group-hover:text-gray-400 flex-shrink-0" />
      <Icon size={16} className={`${template.color} flex-shrink-0`} />
      <span className="text-xs font-medium text-gray-300 truncate">{template.label}</span>
    </div>
  );
}

// ============================================================
// NODE PROPERTIES PANEL
// ============================================================

interface NodePropertiesProps {
  node: WorkflowNode;
  onUpdate: (id: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (id: string) => void;
}

function NodeProperties({ node, onUpdate, onDelete }: NodePropertiesProps) {
  const template = NODE_TEMPLATES.find((t) => t.type === node.data.nodeType);
  if (!template) return null;
  const Icon = template.icon;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, {
      config: { ...node.data.config, [key]: value },
    });
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={template.color}>
            <Icon size={18} />
          </div>
          <h3 className="text-sm font-semibold text-white">{node.data.label}</h3>
        </div>
        <button
          onClick={() => onDelete(node.id)}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${template.borderColor} ${template.bgColor}`}>
            <Icon size={14} className={template.color} />
            <span className="text-sm text-gray-300">{template.label}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configuration</h4>
        <div className="space-y-3">
          {renderConfigFields(node, updateConfig)}
        </div>
      </div>
    </div>
  );
}

function renderConfigFields(
  node: WorkflowNode,
  updateConfig: (key: string, value: unknown) => void
): React.ReactNode {
  const cfg = node.data.config;

  switch (node.data.nodeType) {
    case 'send_whatsapp':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message Template</label>
            <select
              value={(cfg.templateId as string) || ''}
              onChange={(e) => updateConfig('templateId', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select template...</option>
              <option value="welcome">Welcome Message</option>
              <option value="follow_up">Follow Up</option>
              <option value="order_confirmation">Order Confirmation</option>
              <option value="appointment_reminder">Appointment Reminder</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="feedback_request">Feedback Request</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>
          {(cfg.templateId === 'custom' || !cfg.templateId) && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
              <textarea
                value={(cfg.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Type your message... Use {{contact.name}} for personalization"
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.includeMedia as boolean) || false}
              onChange={(e) => updateConfig('includeMedia', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Include media attachment</label>
          </div>
          {cfg.includeMedia && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Media URL</label>
              <input
                type="url"
                value={(cfg.mediaUrl as string) || ''}
                onChange={(e) => updateConfig('mediaUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </>
      );

    case 'send_email':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
            <input
              type="text"
              value={(cfg.subject as string) || ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Body</label>
            <textarea
              value={(cfg.body as string) || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
              placeholder="Email body content"
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">From Name</label>
            <input
              type="text"
              value={(cfg.fromName as string) || ''}
              onChange={(e) => updateConfig('fromName', e.target.value)}
              placeholder="Business Name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'send_sms':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
            <textarea
              value={(cfg.message as string) || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              placeholder="SMS message (160 char recommended)"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="text-xs text-gray-500">
            {((cfg.message as string) || '').length}/160 characters
          </div>
        </>
      );

    case 'add_tag':
    case 'remove_tag':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Tag Name</label>
          <input
            type="text"
            value={(cfg.tagName as string) || ''}
            onChange={(e) => updateConfig('tagName', e.target.value)}
            placeholder="e.g. vip, hot-lead, contacted"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case 'update_contact':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Field</label>
            <select
              value={(cfg.field as string) || ''}
              onChange={(e) => updateConfig('field', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select field...</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="company">Company</option>
              <option value="stage">Stage</option>
              <option value="leadScore">Lead Score</option>
              <option value="source">Source</option>
              <option value="customField">Custom Field</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Value</label>
            <input
              type="text"
              value={(cfg.value as string) || ''}
              onChange={(e) => updateConfig('value', e.target.value)}
              placeholder="New value"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {cfg.field === 'customField' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Custom Field Name</label>
              <input
                type="text"
                value={(cfg.customFieldName as string) || ''}
                onChange={(e) => updateConfig('customFieldName', e.target.value)}
                placeholder="Field name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </>
      );

    case 'webhook':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">URL</label>
            <input
              type="url"
              value={(cfg.url as string) || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://api.example.com/webhook"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Method</label>
            <select
              value={(cfg.method as string) || 'POST'}
              onChange={(e) => updateConfig('method', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Headers (JSON)</label>
            <textarea
              value={(cfg.headers as string) || ''}
              onChange={(e) => updateConfig('headers', e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Body Template</label>
            <textarea
              value={(cfg.bodyTemplate as string) || ''}
              onChange={(e) => updateConfig('bodyTemplate', e.target.value)}
              placeholder='{"contact": "{{contact.id}}", "event": "{{trigger.type}}"}'
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
          </div>
        </>
      );

    case 'if_else':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Field</label>
            <select
              value={(cfg.field as string) || ''}
              onChange={(e) => updateConfig('field', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select field...</option>
              <option value="contact.name">Contact Name</option>
              <option value="contact.email">Contact Email</option>
              <option value="contact.phone">Contact Phone</option>
              <option value="contact.company">Contact Company</option>
              <option value="contact.stage">Contact Stage</option>
              <option value="contact.tags">Contact Tags</option>
              <option value="contact.leadScore">Lead Score</option>
              <option value="contact.source">Contact Source</option>
              <option value="contact.customField">Custom Field</option>
              <option value="trigger.data">Trigger Data</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Operator</label>
            <select
              value={(cfg.operator as string) || ''}
              onChange={(e) => updateConfig('operator', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select operator...</option>
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="not_contains">Does Not Contain</option>
              <option value="starts_with">Starts With</option>
              <option value="ends_with">Ends With</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
              <option value="is_empty">Is Empty</option>
              <option value="is_not_empty">Is Not Empty</option>
            </select>
          </div>
          {!['is_empty', 'is_not_empty'].includes(cfg.operator as string) && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Value</label>
              <input
                type="text"
                value={(cfg.value as string) || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                placeholder="Comparison value"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <CheckCircle size={12} className="text-emerald-400" />
              <span>True branch</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle size={12} className="text-red-400" />
              <span>False branch</span>
            </div>
          </div>
        </>
      );

    case 'wait_delay':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Delay Type</label>
            <select
              value={(cfg.delayType as string) || 'fixed'}
              onChange={(e) => updateConfig('delayType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fixed">Fixed Duration</option>
              <option value="until_time">Until Specific Time</option>
              <option value="until_date">Until Specific Date</option>
            </select>
          </div>
          {cfg.delayType === 'fixed' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                <input
                  type="number"
                  value={(cfg.duration as number) || 1}
                  onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Unit</label>
                <select
                  value={(cfg.unit as string) || 'minutes'}
                  onChange={(e) => updateConfig('unit', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
          )}
          {cfg.delayType === 'until_time' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Time</label>
              <input
                type="time"
                value={(cfg.untilTime as string) || '09:00'}
                onChange={(e) => updateConfig('untilTime', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {cfg.delayType === 'until_date' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={(cfg.untilDate as string) || ''}
                onChange={(e) => updateConfig('untilDate', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.skipWeekends as boolean) || false}
              onChange={(e) => updateConfig('skipWeekends', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Skip weekends</label>
          </div>
        </>
      );

    case 'ai_reply':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Prompt Template</label>
            <select
              value={(cfg.promptTemplate as string) || ''}
              onChange={(e) => updateConfig('promptTemplate', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select template...</option>
              <option value="customer_support">Customer Support</option>
              <option value="sales_qualification">Sales Qualification</option>
              <option value="appointment_booking">Appointment Booking</option>
              <option value="product_recommendation">Product Recommendation</option>
              <option value="custom">Custom Prompt</option>
            </select>
          </div>
          {cfg.promptTemplate === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Custom Prompt</label>
              <textarea
                value={(cfg.customPrompt as string) || ''}
                onChange={(e) => updateConfig('customPrompt', e.target.value)}
                placeholder="You are a helpful assistant. Reply to the customer based on their message."
                rows={5}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
            <select
              value={(cfg.model as string) || 'gpt-4o-mini'}
              onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Max Tokens</label>
            <input
              type="number"
              value={(cfg.maxTokens as number) || 500}
              onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value) || 500)}
              min={50}
              max={4000}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.sendAsWhatsApp as boolean) || false}
              onChange={(e) => updateConfig('sendAsWhatsApp', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Send reply via WhatsApp</label>
          </div>
        </>
      );

    case 'ai_score_lead':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Scoring Criteria</label>
            <select
              value={(cfg.criteria as string) || 'engagement'}
              onChange={(e) => updateConfig('criteria', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="engagement">Engagement Level</option>
              <option value="purchase_intent">Purchase Intent</option>
              <option value="budget">Budget Fit</option>
              <option value="timeline">Timeline Urgency</option>
              <option value="comprehensive">Comprehensive Score</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Output Field</label>
            <select
              value={(cfg.outputField as string) || 'leadScore'}
              onChange={(e) => updateConfig('outputField', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="leadScore">Lead Score (hot/warm/cold)</option>
              <option value="numericScore">Numeric Score (0-100)</option>
              <option value="customTag">Custom Tag</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.updateContact as boolean) || false}
              onChange={(e) => updateConfig('updateContact', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Auto-update contact field</label>
          </div>
        </>
      );

    case 'message_received':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Channel</label>
            <select
              value={(cfg.channel as string) || 'all'}
              onChange={(e) => updateConfig('channel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Filter (Optional)</label>
            <input
              type="text"
              value={(cfg.filter as string) || ''}
              onChange={(e) => updateConfig('filter', e.target.value)}
              placeholder="e.g. contains 'pricing'"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'lead_created':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Source Filter</label>
          <select
            value={(cfg.source as string) || 'all'}
            onChange={(e) => updateConfig('source', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="indiamart">IndiaMART</option>
            <option value="justdial">JustDial</option>
            <option value="facebook">Facebook</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      );

    case 'form_submitted':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Form ID</label>
          <input
            type="text"
            value={(cfg.formId as string) || ''}
            onChange={(e) => updateConfig('formId', e.target.value)}
            placeholder="Enter form ID"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case 'tag_added':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Tag Name</label>
          <input
            type="text"
            value={(cfg.tagName as string) || ''}
            onChange={(e) => updateConfig('tagName', e.target.value)}
            placeholder="e.g. vip, hot-lead"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case 'deal_stage_changed':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">From Stage</label>
            <input
              type="text"
              value={(cfg.fromStage as string) || ''}
              onChange={(e) => updateConfig('fromStage', e.target.value)}
              placeholder="e.g. lead, proposal"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">To Stage</label>
            <input
              type="text"
              value={(cfg.toStage as string) || ''}
              onChange={(e) => updateConfig('toStage', e.target.value)}
              placeholder="e.g. negotiation, closed-won"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'notify_team':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Channel</label>
            <select
              value={(cfg.channel as string) || 'in_app'}
              onChange={(e) => updateConfig('channel', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="in_app">In-App Notification</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="slack">Slack Webhook</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
            <textarea
              value={(cfg.message as string) || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              placeholder="Team notification message"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </>
      );

    case 'add_activity':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Activity Type</label>
            <select
              value={(cfg.activityType as string) || 'note'}
              onChange={(e) => updateConfig('activityType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="note">Note</option>
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={(cfg.description as string) || ''}
              onChange={(e) => updateConfig('description', e.target.value)}
              placeholder="Activity details"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </>
      );

    case 'create_deal':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Deal Name</label>
            <input
              type="text"
              value={(cfg.dealName as string) || ''}
              onChange={(e) => updateConfig('dealName', e.target.value)}
              placeholder="e.g. New Business Opportunity"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Pipeline Stage</label>
            <select
              value={(cfg.stage as string) || 'lead'}
              onChange={(e) => updateConfig('stage', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lead">Lead</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Value (₹)</label>
            <input
              type="number"
              value={(cfg.value as number) || 0}
              onChange={(e) => updateConfig('value', parseFloat(e.target.value) || 0)}
              min={0}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'ai_content':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Content Type</label>
            <select
              value={(cfg.contentType as string) || 'email'}
              onChange={(e) => updateConfig('contentType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="email">Email Body</option>
              <option value="whatsapp">WhatsApp Message</option>
              <option value="sms">SMS Text</option>
              <option value="social_post">Social Media Post</option>
              <option value="offer">Offer/Promotion</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Topic / Context</label>
            <textarea
              value={(cfg.topic as string) || ''}
              onChange={(e) => updateConfig('topic', e.target.value)}
              placeholder="Describe what content to generate... e.g. Festive season offer for Diwali"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Tone</label>
            <select
              value={(cfg.tone as string) || 'professional'}
              onChange={(e) => updateConfig('tone', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="casual">Casual</option>
              <option value="urgent">Urgent</option>
              <option value="promotional">Promotional</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.saveAsTemplate as boolean) || false}
              onChange={(e) => updateConfig('saveAsTemplate', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Save as reusable template</label>
          </div>
        </>
      );

    case 'ai_sentiment':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Input Source</label>
            <select
              value={(cfg.inputSource as string) || 'last_message'}
              onChange={(e) => updateConfig('inputSource', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="last_message">Last Message</option>
              <option value="conversation">Full Conversation</option>
              <option value="custom_field">Custom Field</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">On Detection of Negative Sentiment</label>
            <select
              value={(cfg.onNegative as string) || 'notify'}
              onChange={(e) => updateConfig('onNegative', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="notify">Notify Team</option>
              <option value="escalate">Escalate to Manager</option>
              <option value="offer_discount">Offer Discount</option>
              <option value="apologize">Send Apology</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(cfg.tagContact as boolean) || false}
              onChange={(e) => updateConfig('tagContact', e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            <label className="text-xs text-gray-400">Auto-tag contact with sentiment</label>
          </div>
        </>
      );

    case 'ai_analyze':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Analysis Type</label>
            <select
              value={(cfg.analysisType as string) || 'lead_quality'}
              onChange={(e) => updateConfig('analysisType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lead_quality">Lead Quality Assessment</option>
              <option value="objection">Objection Detection</option>
              <option value="intent">Purchase Intent Analysis</option>
              <option value="summary">Conversation Summary</option>
              <option value="extract">Data Extraction</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Data to Analyze</label>
            <textarea
              value={(cfg.dataToAnalyze as string) || ''}
              onChange={(e) => updateConfig('dataToAnalyze', e.target.value)}
              placeholder="What data should be analyzed? e.g. {{conversation.transcript}}"
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Output Action</label>
            <select
              value={(cfg.outputAction as string) || 'store'}
              onChange={(e) => updateConfig('outputAction', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="store">Store in custom field</option>
              <option value="tag">Add tag to contact</option>
              <option value="note">Add as note/activity</option>
              <option value="notify">Notify team</option>
            </select>
          </div>
        </>
      );

    case 'appointment_booked':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Service Type</label>
          <select
            value={(cfg.serviceType as string) || 'all'}
            onChange={(e) => updateConfig('serviceType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Services</option>
            <option value="consultation">Consultation</option>
            <option value="service">Service Visit</option>
            <option value="meeting">Meeting</option>
          </select>
        </div>
      );

    case 'order_placed':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Product Type</label>
            <select
              value={(cfg.productType as string) || 'all'}
              onChange={(e) => updateConfig('productType', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              <option value="digital">Digital Products</option>
              <option value="physical">Physical Products</option>
              <option value="service">Services</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Min Order Value (₹)</label>
            <input
              type="number"
              value={(cfg.minValue as number) || 0}
              onChange={(e) => updateConfig('minValue', parseFloat(e.target.value) || 0)}
              min={0}
              placeholder="0 = any value"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    case 'payment_received':
      return (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Payment Method</label>
            <select
              value={(cfg.paymentMethod as string) || 'all'}
              onChange={(e) => updateConfig('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="razorpay">Razorpay</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Min Amount (₹)</label>
            <input
              type="number"
              value={(cfg.minAmount as number) || 0}
              onChange={(e) => updateConfig('minAmount', parseFloat(e.target.value) || 0)}
              min={0}
              placeholder="0 = any amount"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );

    default:
      return (
        <div className="text-xs text-gray-500 italic">
          No additional configuration for this node type.
        </div>
      );
  }
}

// ============================================================
// MAIN WORKFLOW BUILDER (needs ReactFlowProvider)
// ============================================================

function WorkflowBuilderInner({ workflowId }: { workflowId?: string }) {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(!!workflowId);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes]
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return NODE_TEMPLATES;
    const q = searchQuery.toLowerCase();
    return NODE_TEMPLATES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<NodeCategory, NodeTemplate[]> = {
      trigger: [],
      action: [],
      condition: [],
      ai: [],
    };
    filteredTemplates.forEach((t) => groups[t.category].push(t));
    return groups;
  }, [filteredTemplates]);

  // Load workflow
  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    workflowsAPI
      .get(workflowId)
      .then((res) => {
        const data = res.data?.data || res.data;
        setWorkflowName(data.name || 'Untitled Workflow');
        setIsActive(data.isActive ?? false);
        if (data.nodes?.length) {
          setNodes(data.nodes.map((n: WorkflowNode) => ({
            ...n,
            data: { ...n.data, config: n.data.config || {} },
          })));
        }
        if (data.edges?.length) {
          setEdges(data.edges);
        }
      })
      .catch(() => {
        toastError('Failed to load workflow');
      })
      .finally(() => setLoading(false));
  }, [workflowId]);

  // Connect validation
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const sourceCategory = sourceNode.data.category;
      const targetCategory = targetNode.data.category;

      const allowed = CONNECTION_RULES[sourceCategory];
      if (!allowed?.includes(targetCategory)) {
        toastError(`Cannot connect ${sourceCategory} to ${targetCategory}`);
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6B7280', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280', width: 16, height: 16 },
            label: sourceNode.data.nodeType === 'if_else'
              ? (connection.sourceHandle === 'true' ? 'True' : 'False')
              : undefined,
          },
          eds
        )
      );
    },
    [nodes, setEdges, toastError]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;

      try {
        const parsed = JSON.parse(rawData) as { type: WorkflowNodeType; category: NodeCategory; label: string };
        const template = NODE_TEMPLATES.find((t) => t.type === parsed.type);
        if (!template) return;

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: WorkflowNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'workflowNode',
          position,
          data: {
            label: parsed.label,
            nodeType: parsed.type,
            category: parsed.category,
            config: {},
          },
        };

        setNodes((nds) => [...nds, newNode]);
      } catch {
        // silently fail
      }
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setPropertiesCollapsed(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const triggerNode = nodes.find(n => n.data.category === 'trigger');
      const payload = {
        name: workflowName,
        triggerType: triggerNode?.data?.nodeType || 'message_received',
        triggerConfig: triggerNode?.data?.config || {},
        nodes: nodes.map((n) => ({ ...n })),
        edges: edges.map((e) => ({ ...e })),
      };
      if (workflowId) {
        await workflowsAPI.update(workflowId, payload);
        toastSuccess('Workflow saved');
      } else {
        const res = await workflowsAPI.create(payload);
        toastSuccess('Workflow created');
        const newId = res.data?.data?.id || res.data?.id;
        if (newId) {
          window.history.replaceState(null, '', `/automation/workflow/${newId}`);
        }
      }
    } catch {
      toastError('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, toastSuccess, toastError]);

  const handleToggleActive = useCallback(async () => {
    if (!workflowId) return;
    try {
      await workflowsAPI.toggle(workflowId);
      setIsActive(!isActive);
      toastSuccess(`Workflow ${!isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toastError('Failed to toggle workflow');
    }
  }, [workflowId, isActive, toastSuccess, toastError]);

  const handleRunTest = useCallback(async () => {
    if (!workflowId) {
      toastInfo('Save the workflow first before running a test');
      return;
    }
    setRunning(true);
    try {
      await workflowsAPI.run(workflowId, {
        testMode: true,
        testData: { contactId: 'test-001', message: 'Test trigger' },
      });
      toastSuccess('Test run started');
    } catch {
      toastError('Failed to run test');
    } finally {
      setRunning(false);
    }
  }, [workflowId, toastSuccess, toastError, toastInfo]);

  const handleOpenAIModal = useCallback(() => {
    setShowAIModal(true);
  }, []);

  const handleWorkflowGenerated = useCallback((newId?: string) => {
    setShowAIModal(false);
    if (!newId) return;
    window.location.href = `/automation/workflow/${newId}`;
  }, []);

  const nodeTypes: NodeTypes = useMemo(() => ({ workflowNode: WorkflowNodeComponent }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-900">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-900">
      {/* TOP BAR */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Workflow size={18} className="text-blue-400 flex-shrink-0 sm:w-5 sm:h-5" />
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-white font-semibold text-sm border-none focus:outline-none focus:ring-0 px-1 py-0.5 rounded hover:bg-gray-700 focus:bg-gray-700 transition-colors min-w-0 sm:min-w-[200px] flex-1 sm:flex-initial"
          />
          <span
            className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">            <button
              onClick={handleOpenAIModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-purple-300 hover:text-white bg-purple-700/30 hover:bg-purple-700/50 rounded-lg transition-colors border border-purple-500/30"
              title="Generate workflow with AI"
            >
              <Wand2 size={14} />
              <span className="hidden sm:inline">AI</span>
            </button>
          <button
            onClick={handleRunTest}
            disabled={running}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
            <span className="hidden sm:inline">{running ? 'Running...' : 'Test Run'}</span>
          </button>
          {workflowId && (
            <button
              onClick={handleToggleActive}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
                  : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              {isActive ? <PowerOff size={14} /> : <Power size={14} />}
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDEBAR - Node Palette */}
        <div
          className={`flex-shrink-0 border-r border-gray-700 bg-gray-800/50 transition-all duration-300 hidden md:block ${
            sidebarCollapsed ? 'w-12' : 'w-56 lg:w-64'
          } overflow-hidden`}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-3 gap-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              {Object.values(CATEGORY_META).map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.label} className={`p-1.5 ${cat.color}`} title={cat.label}>
                    <CatIcon size={16} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nodes</h3>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="px-3 py-2 border-b border-gray-700">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search nodes..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
                {Object.entries(groupedTemplates).map(([category, templates]) => {
                  if (templates.length === 0) return null;
                  const meta = CATEGORY_META[category as NodeCategory];
                  const CatIcon = meta.icon;
                  return (
                    <div key={category}>
                      <div className={`flex items-center gap-1.5 mb-2 ${meta.color}`}>
                        <CatIcon size={12} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
                      </div>
                      <div className="space-y-1.5">
                        {templates.map((template) => (
                          <DraggableNode key={template.type} template={template} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CENTER - Canvas */}
        <div className="flex-1 min-w-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange}
            onEdgesChange={onEdgesChange as OnEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6B7280', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280', width: 16, height: 16 },
            }}
            connectionLineStyle={{ stroke: '#6B7280', strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
            className="bg-gray-900"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#374151"
            />
            <Controls
              className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700"
              position="bottom-left"
            />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor="#1F2937"
              nodeBorderRadius={4}
              maskColor="rgba(0, 0, 0, 0.7)"
              className="!bg-gray-800 !border-gray-700"
              position="bottom-right"
            />
            {nodes.length === 0 && !loading && (
              <Panel position="top-center">
                <div className="flex flex-col items-center gap-4 text-gray-500 pointer-events-none">
                  <Workflow size={48} className="opacity-30" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-400">Drag nodes from the sidebar to start building</p>
                    <p className="text-xs text-gray-600 mt-1">Connect nodes to define your automation flow</p>
                  </div>
                  <div className="flex gap-2 pointer-events-auto">
                    <button
                      onClick={handleOpenAIModal}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors shadow-lg shadow-purple-500/20"
                    >
                      <Wand2 size={16} />
                      Generate with AI
                    </button>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* RIGHT SIDEBAR - Properties Panel */}
        <div
          className={`flex-shrink-0 border-l border-gray-700 bg-gray-800/50 transition-all duration-300 hidden lg:block ${
            propertiesCollapsed ? 'w-12' : 'w-72 xl:w-80'
          } overflow-hidden`}
        >
          {propertiesCollapsed ? (
            <div className="flex flex-col items-center py-3">
              <button
                onClick={() => setPropertiesCollapsed(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {selectedNode && (
                <div className="mt-3 p-1.5 text-blue-400" title="Node selected">
                  <Settings size={16} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Properties</h3>
                <button
                  onClick={() => setPropertiesCollapsed(true)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {selectedNode ? (
                  <NodeProperties
                    node={selectedNode}
                    onUpdate={updateNodeData}
                    onDelete={deleteNode}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
                    <Settings size={32} className="opacity-30 mb-3" />
                    <p className="text-xs text-center">Select a node on the canvas to edit its properties</p>
                  </div>
                )}
              </div>
              {selectedNode && (
                <div className="px-3 py-2 border-t border-gray-700">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Info size={12} />
                    <span>Changes are applied live to the canvas</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <AIGenerationModal
          onClose={() => setShowAIModal(false)}
          onWorkflowGenerated={handleWorkflowGenerated}
        />
      )}
    </div>
  );
}

// ============================================================
// WRAPPER WITH PROVIDER - Shows list view when no workflowId
// ============================================================

export default function WorkflowBuilder({ workflowId }: { workflowId?: string }) {
  if (!workflowId || workflowId === 'new') {
    return <WorkflowListView />;
  }

  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

