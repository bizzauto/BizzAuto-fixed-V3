import { z } from 'zod';

// ==================== DEAL VALIDATION ====================

export const updateDealStageSchema = z.object({
  stage: z.string().min(1).max(100).optional(),
  stageId: z.string().optional(),
  pipelineId: z.string().optional(),
}).strict();

export const updateDealSchema = z.object({
  dealValue: z.number().min(0).max(100000000).optional(),
  dealStage: z.string().max(100).optional(),
  stage: z.string().max(100).optional(),
  stageId: z.string().optional().nullable(),
  pipelineId: z.string().optional().nullable(),
}).strict();

// ==================== INVOICE VALIDATION ====================

const invoiceItemSchema = z.object({
  description: z.string().max(500).optional().default(''),
  quantity: z.number().int().min(1).max(10000).default(1),
  rate: z.number().min(0).max(100000000).default(0),
  amount: z.number().min(0).max(100000000).optional(),
});

export const createInvoiceSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(200),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().max(20).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required').max(100),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  contactId: z.string().optional(),
}).strict();

export const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export const markInvoicePaidSchema = z.object({
  paymentMethod: z.string().max(50).optional(),
}).strict();

// ==================== APPOINTMENT VALIDATION ====================

export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
  description: z.string().max(1000).optional(),
  service: z.string().max(200).optional(),
  location: z.string().max(500).optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
}).strict();

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  service: z.string().max(200).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  location: z.string().max(500).optional(),
  meetingUrl: z.string().optional(),
}).strict();

// ==================== LEDGER VALIDATION ====================

export const createLedgerEntrySchema = z.object({
  type: z.enum(['income', 'expense', 'INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().min(0.01, 'Amount must be positive').max(100000000),
  paymentMethod: z.enum(['cash', 'bank', 'upi', 'card', 'CASH', 'BANK', 'UPI', 'CARD']).optional(),
  referenceNo: z.string().max(100).optional(),
  contactId: z.string().optional(),
  invoiceId: z.string().optional(),
  date: z.string().optional(),
}).strict();

export const updateLedgerEntrySchema = z.object({
  type: z.enum(['income', 'expense', 'INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().min(0.01).max(100000000).optional(),
  paymentMethod: z.enum(['cash', 'bank', 'upi', 'card', 'CASH', 'BANK', 'UPI', 'CARD']).optional(),
  referenceNo: z.string().max(100).optional().nullable(),
  contactId: z.string().optional().nullable(),
  date: z.string().optional(),
}).strict();

// ==================== CAMPAIGN VALIDATION ====================

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['whatsapp_broadcast', 'email', 'sms', 'social_media', 'drip']),
  templateName: z.string().max(200).optional(),
  templateVars: z.record(z.any()).optional(),
  targetTags: z.array(z.string()).optional(),
  targetFilters: z.record(z.any()).optional(),
  scheduledAt: z.string().optional(),
  content: z.record(z.any()).optional(),
  dripSteps: z.any().optional(),
}).strict();

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  templateName: z.string().max(200).optional(),
  templateVars: z.record(z.any()).optional(),
  targetTags: z.array(z.string()).optional(),
  targetFilters: z.record(z.any()).optional(),
  contactIds: z.array(z.string()).optional(),
  content: z.record(z.any()).optional(),
  scheduledAt: z.string().optional(),
}).strict();

export const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().min(1, 'Scheduled time is required'),
}).strict();

// ==================== WORKFLOW VALIDATION ====================

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  triggerType: z.enum([
    'message_received', 'lead_created', 'appointment_booked',
    'form_subscribed', 'tag_added', 'deal_stage_changed', 'manual',
  ]),
  triggerConfig: z.record(z.any()).optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
}).strict();

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  triggerType: z.enum([
    'message_received', 'lead_created', 'appointment_booked',
    'form_subscribed', 'tag_added', 'deal_stage_changed', 'manual',
  ]).optional(),
  triggerConfig: z.record(z.any()).optional(),
}).strict();
