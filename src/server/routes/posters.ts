import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/ai.service.js';
import { qs } from '../utils/query.js';

const router = Router();

// Get all templates
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, isSystem } = req.query;
    const where: any = {
      OR: [{ businessId: req.user.businessId }],
    };
    if (isSystem === 'true') {
      where.OR.push({ isSystem: true });
    }
    if (category) where.category = category;

    const templates = await prisma.posterTemplate.findMany({ where, orderBy: { usageCount: 'desc' } });
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch templates', details: error.message });
  }
});

// List recently generated posters from WingsStore
router.get('/generated', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const category = req.query.category as string | undefined;
    const offset = (page - 1) * limit;

    const where: any = {
      businessId,
      type: 'image',
      isGenerated: true,
      tags: { has: 'poster' },
    };
    if (category) where.category = category;

    const [posters, total] = await Promise.all([
      prisma.wingsStore.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.wingsStore.count({ where }),
    ]);

    res.json({
      success: true,
      data: posters.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        thumbnail: p.thumbnail,
        category: p.category,
        tags: p.tags,
        prompt: p.prompt?.substring(0, 200),
        metadata: p.metadata,
        generatedAt: p.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('List generated posters error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to list generated posters', details: error.message });
  }
});

// Delete a generated poster from WingsStore
router.delete('/generated/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const id = qs(qs(req.params.id));

    const poster = await prisma.wingsStore.findFirst({
      where: { id, businessId, isGenerated: true },
    });
    if (!poster) {
      return res.status(404).json({ success: false, error: 'Generated poster not found' });
    }

    await prisma.wingsStore.delete({ where: { id } });
    res.json({ success: true, message: 'Poster deleted successfully' });
  } catch (error: any) {
    console.error('Delete generated poster error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete poster', details: error.message });
  }
});

// Get single template
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.posterTemplate.findFirst({
      where: { id: qs(req.params.id), OR: [{ businessId: req.user.businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch template', details: error.message });
  }
});

// Create custom template
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, content, thumbnailUrl } = req.body;
    const template = await prisma.posterTemplate.create({
      data: { businessId: req.user.businessId, name, category, content, thumbnailUrl, isSystem: false },
    });
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create template', details: error.message });
  }
});

// Update template usage count
router.post('/:id/usage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.posterTemplate.update({ where: { id: qs(req.params.id) }, data: { usageCount: { increment: 1 } } });
    res.json({ success: true, message: 'Usage counted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update usage', details: error.message });
  }
});

// ==================== AI IMAGE GENERATION ====================
// Generate an AI poster image — Pollinations.ai (free) → OpenRouter fallback
router.post('/generate-image', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, format, headline, subtitle, businessName, phone } = req.body;
    const businessId = req.user.businessId;

    if (!prompt && !headline) {
      return res.status(400).json({ success: false, error: 'Prompt or headline is required' });
    }

    // Build a rich prompt for the AI image generator
    const fullPrompt = [
      prompt || `Professional business poster with headline: ${headline || ''}`,
      subtitle ? `Subtitle: ${subtitle}` : '',
      businessName ? `Business: ${businessName}` : '',
      'Modern design, clean layout, vibrant colors, professional quality, high resolution',
    ].filter(Boolean).join('. ');

    const sizeMap: Record<string, { width: number; height: number }> = {
      square: { width: 1024, height: 1024 },
      story: { width: 768, height: 1344 },
      landscape: { width: 1344, height: 768 },
    };
    const size = sizeMap[format || 'square'] || sizeMap.square;

    let imageUrl = '';

    // 1) Try Pollinations.ai (free basic tier — no custom params)
    try {
      const encoded = encodeURIComponent(fullPrompt);
      imageUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux&seed=${Date.now()}`;
      // Verify the URL is reachable
      const checkRes = await fetch(imageUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (!checkRes.ok) throw new Error(`Pollinations returned ${checkRes.status}`);
    } catch (pollErr: any) {
      console.warn('Pollinations.ai failed, trying OpenRouter:', pollErr.message);
      imageUrl = '';
    }

    // 2) Fallback: OpenRouter image generation
    if (!imageUrl) {
      try {
        imageUrl = await AIService.generateImage(fullPrompt, {
          size: format === 'story' ? '1024x1792' : format === 'landscape' ? '1792x1024' : '1024x1024',
        });
      } catch (orErr: any) {
        console.warn('OpenRouter image gen failed:', orErr.message);
      }
    }

    // 3) Last resort: generate a deterministic gradient placeholder
    if (!imageUrl) {
      // Return a placeholder SVG that looks like a poster
      const sanitize = (s: string) => (s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
      const safeHeadline = sanitize(headline || 'AI Poster');
      const safeSubtitle = sanitize(subtitle || businessName || 'Generated by BizzAuto');
      const colors = ['#6366f1', '#8b5cf6', '#ec4899'];
      const svgStr = `<svg xmlns='http://www.w3.org/2000/svg' width='${size.width}' height='${size.height}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${colors[0]}'/><stop offset='50%' stop-color='${colors[1]}'/><stop offset='100%' stop-color='${colors[2]}'/></linearGradient></defs><rect fill='url(#g)' width='100%' height='100%'/><text x='50%' y='40%' text-anchor='middle' fill='white' font-size='48' font-family='sans-serif' font-weight='bold'>${safeHeadline}</text><text x='50%' y='55%' text-anchor='middle' fill='white' font-size='24' font-family='sans-serif' opacity='0.8'>${safeSubtitle}</text></svg>`;
      const svgUrl = `data:image/svg+xml,${encodeURIComponent(svgStr)}`;
      imageUrl = svgUrl;
    }

    // Store in WingsStore for persistence
    try {
      await prisma.wingsStore.create({
        data: {
          businessId,
          name: `AI Poster - ${new Date().toLocaleDateString()}`,
          type: 'image',
          category: 'poster',
          url: imageUrl,
          tags: ['poster', 'ai-generated'],
          isGenerated: true,
          prompt: fullPrompt.substring(0, 500),
          metadata: { format, headline, subtitle, businessName, generatedAt: new Date().toISOString() } as any,
        },
      });
    } catch (storeErr: any) {
      console.warn('Failed to store AI poster:', storeErr.message);
    }

    res.json({ success: true, data: { url: imageUrl } });
  } catch (error: any) {
    console.error('AI image generation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate AI image', details: error.message });
  }
});

// Generate poster from template using AI
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId, userData } = req.body;
    const businessId = req.user.businessId;

    const template = await prisma.posterTemplate.findFirst({
      where: { id: templateId, OR: [{ businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    // Check AI credit availability
    const hasCredits = await AIService.checkCredits(businessId);
    if (!hasCredits) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted. Upgrade your plan to generate more posters.' });
    }

    // Build prompt from template content and user data
    let prompt = `Poster: ${template.name}. ${template.description || ''}.`;

    // If template has content (HTML/JSON template), extract meaningful description
    if (template.content) {
      const contentStr = typeof template.content === 'string' ? template.content : JSON.stringify(template.content);
      // Strip HTML tags for the AI prompt
      const cleanContent = contentStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 50) {
        prompt += ` Template layout: ${cleanContent.substring(0, 500)}`;
      }
    }

    // Substitute user-provided data into the prompt
    if (userData && typeof userData === 'object') {
      const dataSummary = Object.entries(userData)
        .map(([key, val]) => `${key}: ${val}`)
        .join('. ');
      prompt += ` Content: ${dataSummary}`;

      // Check template variables and map userData to them
      if (template.variables && Array.isArray(template.variables)) {
        const varNames = template.variables
          .map((v: any) => v.name || v)
          .filter(Boolean)
          .join(', ');
        if (varNames) {
          prompt += ` Variables to include: ${varNames}.`;
        }
      }
    }

    // Determine format based on template category
    const format = template.category === 'social' ? 'square'
      : template.category === 'whatsapp' ? 'story'
      : 'landscape';

    // Generate the poster image via AI
    const { imageUrl } = await AIService.generatePoster(prompt, {
      format: format as any,
      businessId,
    });

    // Increment usage count
    await prisma.posterTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Deduct AI credit atomically
    const creditUsed = await AIService.useCredit(businessId);
    if (!creditUsed) {
      console.warn(`[Posters] Credit deduction failed for business ${businessId} after generation`);
    }

    // Store generated poster in WingsStore for persistence
    const stored = await prisma.wingsStore.create({
      data: {
        businessId,
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        type: 'image',
        category: template.category,
        url: imageUrl,
        tags: ['poster', template.category, template.name],
        isGenerated: true,
        prompt,
        metadata: {
          templateId,
          templateName: template.name,
          userData,
          generatedAt: new Date().toISOString(),
        } as any,
      },
    });

    res.json({
      success: true,
      data: {
        id: stored.id,
        url: imageUrl,
        templateId,
        generatedAt: stored.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Poster generation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate poster', details: error.message });
  }
});

// Download generated poster
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const template = await prisma.posterTemplate.findFirst({
      where: { id: qs(req.params.id), OR: [{ businessId }, { isSystem: true }] },
    });
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

    // Look for recently generated posters from WingsStore
    const recentPoster = await prisma.wingsStore.findFirst({
      where: {
        businessId,
        type: 'image',
        tags: { has: template.name },
        isGenerated: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentPoster) {
      return res.json({
        success: true,
        data: {
          downloadUrl: recentPoster.url,
          filename: `${template.name.replace(/\s+/g, '_')}.png`,
          generatedAt: recentPoster.createdAt.toISOString(),
        },
      });
    }

    // If no recent generation exists, build a prompt and generate on the fly
    const hasCredits = await AIService.checkCredits(businessId);
    if (!hasCredits) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted. Generate a new poster first.' });
    }

    let prompt = `Download poster: ${template.name}. ${template.description || ''}. Professional business poster design.`;
    if (template.content) {
      const cleanContent = String(template.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanContent.length > 50) {
        prompt += ` Layout: ${cleanContent.substring(0, 500)}`;
      }
    }

    const format = template.category === 'social' ? 'square'
      : template.category === 'whatsapp' ? 'story'
      : 'landscape';

    const { imageUrl } = await AIService.generatePoster(prompt, {
      format: format as any,
      businessId,
    });

    // Deduct AI credit atomically
    const creditUsed = await AIService.useCredit(businessId);
    if (!creditUsed) {
      console.warn(`[Posters] Credit deduction failed for business ${businessId} after download`);
    }

    res.json({
      success: true,
      data: {
        downloadUrl: imageUrl,
        filename: `${template.name.replace(/\s+/g, '_')}.png`,
      },
    });
  } catch (error: any) {
    console.error('Poster download error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to download poster', details: error.message });
  }
});

// ==================== PUBLIC: GET ACTIVE BACKGROUNDS ====================
// Users fetch backgrounds uploaded by admin
router.get('/backgrounds/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = category;

    const backgrounds = await prisma.posterBackground.findMany({
      where: {
        ...where,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: backgrounds });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch backgrounds', details: error.message });
  }
});

export default router;
