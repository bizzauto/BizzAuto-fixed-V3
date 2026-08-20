import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSurveySchema, updateSurveySchema } from '../validations/remaining-schemas.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// GET /api/surveys - List all surveys
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const surveys = await prisma.survey.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { surveys } });
  } catch (err) {
    console.error('Get surveys error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch surveys' });
  }
});

// POST /api/surveys - Create new survey
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { name, description, questions } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one question is required' });
    }

    const survey = await prisma.survey.create({
      data: {
        businessId,
        name,
        description: description || '',
        isPublished: true,
        questions: {
          create: (questions || []).map((q: any) => ({
            type: q.type || 'text',
            label: q.label || q.question || '',
            placeholder: q.placeholder || '',
            required: q.required || false,
            options: q.options || undefined,
          })),
        },
      },
      include: { questions: true },
    });
    res.status(201).json({ success: true, data: { survey } });
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to create survey' });
  }
});

// PUT /api/surveys/:id - Update survey
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { name, description, questions, status } = req.body;

    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Survey not found' });

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(questions !== undefined && { questions }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ success: true, data: { survey } });
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to update survey' });
  }
});

// DELETE /api/surveys/:id - Delete survey
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const existing = await prisma.survey.findFirst({ where: { id: req.params.id, businessId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Survey not found' });

    await prisma.surveyResponse.deleteMany({ where: { surveyId: req.params.id } });
    await prisma.survey.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Survey deleted' });
  } catch (err) {
    console.error('Delete survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete survey' });
  }
});

// POST /api/surveys/:id/submit - Submit survey response (public)
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { answers, respondent } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, error: 'Answers are required' });
    }

    const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { questions: true } });
    if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });
    if (!survey.isActive) return res.status(400).json({ success: false, error: 'Survey is not accepting responses' });

    const submission = await prisma.surveyResponse.create({
      data: {
        surveyId: req.params.id,
        businessId: survey.businessId,
        answers: answers,
        metadata: respondent ? { respondent } : undefined,
      },
    });

    // Update submission count
    const totalSubmissions = await prisma.surveyResponse.count({ where: { surveyId: req.params.id } });
    await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        submissionCount: totalSubmissions,
      },
    });

    res.status(201).json({ success: true, data: { submission } });
  } catch (err) {
    console.error('Submit survey error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit survey' });
  }
});

// GET /api/surveys/:id/results - Get survey results
router.get('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const survey = await prisma.survey.findFirst({ where: { id: req.params.id, businessId }, include: { questions: true } });
    if (!survey) return res.status(404).json({ success: false, error: 'Survey not found' });

    const submissions = await prisma.surveyResponse.findMany({
      where: { surveyId: req.params.id },
      orderBy: { submittedAt: 'desc' },
    });

    // Aggregate results per question
    const results: Record<string, Record<string, number>> = {};
    const questions = survey.questions as any[];
    for (const q of questions) {
      results[q.id] = {};
    }
    for (const sub of submissions) {
      const answers = sub.answers as Record<string, any>;
      for (const [qId, answer] of Object.entries(answers)) {
        if (!results[qId]) results[qId] = {};
        const key = String(answer);
        results[qId][key] = (results[qId][key] || 0) + 1;
      }
    }

    res.json({ success: true, data: { survey, submissions, results } });
  } catch (err) {
    console.error('Get survey results error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch survey results' });
  }
});

// GET /api/surveys/public/:id - Public survey view
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const survey = await prisma.survey.findUnique({ where: { id: req.params.id }, include: { questions: true } });
    if (!survey || !survey.isActive) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }
    res.json({ success: true, data: { survey } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch survey' });
  }
});

// GET /api/surveys/stats - Survey statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const surveys = await prisma.survey.findMany({ where: { businessId } });
    const totalSubmissions = surveys.reduce((a: number, b: any) => a + (b.submissionCount || 0), 0);

    res.json({
      success: true,
      data: {
        total: surveys.length,
        active: surveys.filter((s: any) => s.isActive).length,
        totalSubmissions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
