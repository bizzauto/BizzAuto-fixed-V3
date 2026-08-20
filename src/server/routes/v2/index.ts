import { Router } from 'express';
import contactsRouter from './contacts.js';
import dealsRouter from './deals.js';
import invoicesRouter from './invoices.js';

const router = Router();

/**
 * v2 API Routes — Breaking changes from v1
 * 
 * Changes:
 * - Cursor-based pagination instead of offset
 * - Consistent { ok, data, meta, error } envelope
 * - Amounts in paise (integers) instead of rupees
 * - Strict Zod validation on all inputs
 * - Consistent error format with error codes
 */
router.use('/contacts', contactsRouter);
router.use('/deals', dealsRouter);
router.use('/invoices', invoicesRouter);

export default router;
