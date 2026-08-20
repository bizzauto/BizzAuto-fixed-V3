import { z } from 'zod';

// ==================== SURVEY VALIDATION ====================

export const createSurveySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['form', 'survey', 'nps', 'poll', 'quiz']).optional(),
  settings: z.record(z.any()).optional(),
  thankYouMessage: z.string().max(500).optional(),
}).strict();

export const updateSurveySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
  thankYouMessage: z.string().max(500).optional().nullable(),
}).strict();

// ==================== CUSTOM FIELDS VALIDATION ====================

export const createCustomFieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1).max(100),
  type: z.enum(['text', 'number', 'email', 'phone', 'date', 'datetime', 'select', 'multi_select', 'radio', 'checkbox', 'textarea', 'url', 'currency', 'file']),
  entityType: z.enum(['contact', 'lead', 'deal', 'appointment', 'order']),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  isRequired: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
}).strict();

export const updateCustomFieldSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
}).strict();

// ==================== TRIGGER LINKS VALIDATION ====================

export const createTriggerLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  originalUrl: z.string().url('Must be a valid URL'),
  campaignId: z.string().optional(),
  workflowId: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).strict();

export const updateTriggerLinkSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  originalUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
}).strict();

// ==================== SUPPORT TICKETS VALIDATION ====================

export const createTicketSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  subject: z.string().min(1, 'Subject is required').max(500),
  description: z.string().min(1, 'Description is required').max(5000),
  category: z.enum(['general', 'billing', 'technical', 'feature_request', 'bug']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
}).strict();

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
}).strict();

export const replyTicketSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  isInternal: z.boolean().optional(),
}).strict();

// ==================== BLOG VALIDATION ====================

export const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().max(200).optional(),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
}).strict();

export const updateBlogPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
}).strict();

// ==================== PAYMENT LINKS VALIDATION ====================

export const createPaymentLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
  amount: z.number().min(0.01, 'Amount must be positive').max(100000000),
  currency: z.string().max(5).optional(),
  type: z.enum(['fixed', 'flexible', 'subscription']).optional(),
  minAmount: z.number().min(0).optional(),
  expiresAt: z.string().optional(),
  maxPayments: z.number().int().min(1).optional(),
  contactId: z.string().optional(),
}).strict();

// ==================== COURSES VALIDATION ====================

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).max(1000000).optional(),
  currency: z.string().max(5).optional(),
  accessType: z.enum(['free', 'paid', 'subscription']).optional(),
  isPublished: z.boolean().optional(),
}).strict();

// ==================== FUNNEL VALIDATION ====================

export const createFunnelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  domain: z.string().max(200).optional(),
}).strict();

// ==================== WALLET VALIDATION ====================

export const rechargeWalletSchema = z.object({
  amount: z.number().min(10, 'Minimum recharge is ₹10').max(100000),
}).strict();

// ==================== REFERRAL VALIDATION ====================

export const updateReferralProgramSchema = z.object({
  referrerReward: z.number().min(0).max(100000),
  refereeReward: z.number().min(0).max(100000),
  rewardType: z.enum(['credits', 'discount', 'cash']).optional(),
  maxReferrals: z.number().int().min(1).optional().nullable(),
}).strict();
