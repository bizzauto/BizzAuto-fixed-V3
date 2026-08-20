import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { LeadFinderService } from '../services/lead-finder.service.js';
import { AiLeadScoringService } from '../services/ai-lead-scoring.service.js';
import { GoogleSheetsService } from '../services/google-sheets.service.js';

const router = Router();

// ==================== SEARCH ====================

/**
 * POST /api/lead-finder/search
 * Search businesses on Google Maps
 */
router.post('/search', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { category, city, radius } = req.body;
    if (!category || !city) {
      return res.status(400).json({ success: false, error: 'category and city are required' });
    }

    const result = await LeadFinderService.searchBusinesses({
      category,
      city,
      radius: radius || 10,
      businessId,
    });

    // Analyze digital presence
    const analyzed = await LeadFinderService.analyzeDigitalPresence(result.results);

    res.json({
      success: true,
      data: {
        searchId: result.searchId,
        results: analyzed,
        total: analyzed.length,
      },
    });
  } catch (error: any) {
    console.error('Lead finder search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lead-finder/analyze
 * AI analyze digital presence of searched businesses
 */
router.post('/analyze', authenticate, async (req: any, res: Response) => {
  try {
    const { places } = req.body;
    if (!places?.length) {
      return res.status(400).json({ success: false, error: 'places array is required' });
    }

    const analyzed = await LeadFinderService.analyzeDigitalPresence(places);

    res.json({
      success: true,
      data: analyzed,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lead-finder/import
 * Import selected leads to contacts
 */
router.post('/import', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { places, searchId } = req.body;
    if (!places?.length || !searchId) {
      return res.status(400).json({ success: false, error: 'places and searchId are required' });
    }

    const result = await LeadFinderService.importLeads({
      businessId,
      places,
      searchId,
    });

    res.json({
      success: true,
      message: `Imported ${result.imported} leads, skipped ${result.skipped}`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lead-finder/history
 * Get search history
 */
router.get('/history', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const limit = parseInt(req.query.limit as string) || 20;
    const history = await LeadFinderService.getSearchHistory(businessId, limit);

    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SCORING ====================

/**
 * POST /api/lead-finder/score/:contactId
 * Score a single contact with AI
 */
router.post('/score/:contactId', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { contactId } = req.params;
    const result = await AiLeadScoringService.scoreContact(contactId, businessId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/lead-finder/bulk-score
 * Bulk score all lead finder contacts
 */
router.post('/bulk-score', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { contactIds } = req.body;
    const result = await AiLeadScoringService.bulkScore(businessId, contactIds);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/lead-finder/leads
 * Get all lead finder contacts with scores
 */
router.get('/leads', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { category, source, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { businessId, source: 'lead_finder' };
    if (source) where.leadFinderSource = source;

    const [leads, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { leadScores: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.contact.count({ where }),
    ]);

    // Filter by score category if specified
    let filtered = leads;
    if (category) {
      filtered = leads.filter((l) => l.leadScores?.[0]?.category === category);
    }

    res.json({
      success: true,
      data: filtered,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GOOGLE SHEETS EXPORT ====================

/**
 * POST /api/lead-finder/export-sheets
 * Export lead finder leads to Google Sheets
 */
router.post('/export-sheets', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ success: false, error: 'Business ID required' });

    const { spreadsheetId, sheetName, category } = req.body;

    const result = await GoogleSheetsService.exportLeadFinderLeads(businessId, {
      spreadsheetId,
      sheetName,
      category,
    });

    res.json({
      success: true,
      message: `Exported ${result.exported} leads to Google Sheets`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
