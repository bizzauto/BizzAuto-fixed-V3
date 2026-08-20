import { z } from 'zod';

// ==================== CONTACT VALIDATION ====================

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.any()).optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
}).strict();

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  dealValue: z.number().min(0).optional(),
  dealStage: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  assignedTo: z.string().optional().nullable(),
}).strict();

export const importContactsSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().optional(),
    phone: z.string().min(1, 'Phone is required for each contact'),
    email: z.string().email().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    company: z.string().optional(),
  })).min(1, 'At least one contact required').max(1000, 'Maximum 1000 contacts per import'),
}).strict();

// ==================== AUTH VALIDATION ====================

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100).optional(),
  businessName: z.string().min(1, 'Business name is required').max(200),
  businessType: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  twoFactorToken: z.string().length(6, '2FA token must be 6 digits').optional(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
}).strict();

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: passwordSchema,
}).strict();
