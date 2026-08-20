import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { AIService } from '../services/ai.service.js';
import axios from 'axios';
import express, { Request, Response } from 'express';

const router = express.Router();

router.post('/generate', authenticate, async (req: any, res: any) => {
  try {
    const { type, prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const sanitizedPrompt = prompt.replace(/\b(hack|exploit|bypass|crack)\b/gi, '[filtered]');

    const model = getOptimalModel(type);
    const response = await callAIProvider(model, sanitizedPrompt);
    const tokensUsed = estimateTokens(sanitizedPrompt, response.text);
    const creditCost = Math.ceil(tokensUsed / 1000);

    const credited = await AIService.useCredit(req.user.businessId, creditCost);
    if (!credited) {
      return res.status(429).json({
        success: false,
        error: 'AI credits exhausted. Please upgrade your plan or purchase more credits.',
      });
    }

    res.json({
      success: true,
      data: {
        text: response.text,
        model: model.model,
        tokensUsed,
        creditsDeducted: creditCost,
      },
    });
  } catch (error: any) {
    console.error('AI generation error:', error);
    res.status(500).json({ success: false, error: 'AI generation failed' });
  }
});

router.post('/caption', authenticate, async (req: any, res: Response) => {
  try {
    const { topic, businessType, platform, language = 'en' } = req.body;

    const prompt = `Generate a ${platform} caption for a ${businessType} in India. Topic: ${topic}. Include emojis and relevant hashtags. Keep it engaging and under 280 characters for Twitter, or appropriate length for ${platform}.`;
    const response = await callAIProvider({ provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' }, prompt);

    const credited = await AIService.useCredit(req.user.businessId);
    if (!credited) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted' });
    }

    res.json({ success: true, data: { caption: response.text } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate caption' });
  }
});

router.post('/hashtags', authenticate, async (req: any, res: Response) => {
  try {
    const { topic, platform } = req.body;

    const prompt = `Generate 15-20 relevant hashtags for ${topic} on ${platform}. Mix of popular and niche hashtags. Return as JSON array.`;
    const response = await callAIProvider({ provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' }, prompt);

    const credited = await AIService.useCredit(req.user.businessId);
    if (!credited) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted' });
    }

    res.json({ success: true, data: { hashtags: response.text } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate hashtags' });
  }
});

router.post('/review-reply', authenticate, async (req: any, res: Response) => {
  try {
    const { reviewText, rating, businessType, businessName } = req.body;

    const prompt = `Generate a professional reply to this ${rating}-star review for ${businessName}, a ${businessType} in India. Review: "${reviewText}". Keep it under 100 words, thank the customer, and address their concerns. Use Indian English tone.`;
    const response = await callAIProvider({ provider: 'grok', model: 'grok-3-mini' }, prompt);

    const credited = await AIService.useCredit(req.user.businessId);
    if (!credited) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted' });
    }

    res.json({ success: true, data: { reply: response.text } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate review reply' });
  }
});

router.post('/smart-replies', authenticate, async (req: any, res: Response) => {
  try {
    const { conversation, tone = 'professional', context } = req.body;

    const prompt = `Generate 3-5 smart reply suggestions for this customer message: "${conversation}". The tone should be ${tone}. Consider the context: ${context}. Each reply should be concise, helpful, and appropriate for customer service. Return as JSON array.`;
    const response = await callAIProvider({ provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' }, prompt);

    const credited = await AIService.useCredit(req.user.businessId);
    if (!credited) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted' });
    }

    res.json({ success: true, data: { replies: response.text } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate smart replies' });
  }
});

router.post('/content-calendar', authenticate, async (req: any, res: Response) => {
  try {
    const { businessType, city, month, year } = req.body;

    const prompt = `Generate a ${month} ${year} content calendar for a ${businessType} in ${city}, India. Include 30 posts with: date, topic, caption, hashtags, and post_type (promotional, educational, engagement, festival). Return as JSON array.`;
    const response = await callAIProvider({ provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' }, prompt);

    const credited = await AIService.useCredit(req.user.businessId);
    if (!credited) {
      return res.status(429).json({ success: false, error: 'AI credits exhausted' });
    }

    res.json({ success: true, data: { calendar: response.text } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate content calendar' });
  }
});

router.post('/backup', authenticate, async (req: Request, res: Response) => {
  try {
    const { type = 'full', include = ['contacts', 'leads', 'appointments'] } = req.body;
    const businessId = (req as any).user.businessId;
    const backupData: any = { businessId, timestamp: new Date().toISOString(), type, data: {} };

    if (include.includes('contacts')) {
      backupData.data.contacts = await prisma.contact.findMany({ where: { businessId } });
    }
    if (include.includes('leads')) {
      backupData.data.leads = await (prisma as any).lead.findMany({ where: { businessId } });
    }
    if (include.includes('appointments')) {
      backupData.data.appointments = await prisma.appointment.findMany({ where: { businessId } });
    }

    res.json({ success: true, data: { backup: backupData } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

router.post('/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ success: false, error: 'Backup ID is required' });
    }
    const backup = await prisma.auditLog.findUnique({ where: { id: backupId } });
    if (!backup) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    res.json({ success: true, data: { backup } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to restore backup' });
  }
});

function getOptimalModel(type: string) {
  const models: any = {
    simple: { provider: 'grok', model: 'grok-3-mini' },
    medium: { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
    heavy: { provider: 'openrouter', model: 'google/gemini-flash-1.5' },
    caption: { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
    hashtags: { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
    review: { provider: 'grok', model: 'grok-3-mini' },
    calendar: { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
  };
  return models[type] || models.medium;
}

async function callAIProvider(model: any, prompt: string) {
  try {
    if (model.provider === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey || apiKey === 'your_openrouter_api_key') {
        throw new Error('AI service not configured');
      }
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model: model.model, messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.7 },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://yoursaas.in', 'X-Title': 'YourSaaS' } }
      );
      return { text: response.data.choices[0].message.content };
    }

    if (model.provider === 'grok') {
      const grokKey = process.env.GROK_API_KEY;
      if (!grokKey || grokKey === 'your_grok_api_key') {
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (!openrouterKey || openrouterKey === 'your_openrouter_api_key') {
          throw new Error('AI service not configured');
        }
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.7 },
          { headers: { Authorization: `Bearer ${openrouterKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://yoursaas.in', 'X-Title': 'YourSaaS' } }
        );
        return { text: response.data.choices[0].message.content };
      }
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        { model: model.model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 },
        { headers: { Authorization: `Bearer ${grokKey}`, 'Content-Type': 'application/json' } }
      );
      return { text: response.data.choices[0].message.content };
    }

    throw new Error('Unknown provider');
  } catch (error: any) {
    console.error('AI provider error:', error.response?.data || error.message);
    throw error;
  }
}

function estimateTokens(prompt: string, response: string): number {
  return Math.ceil((prompt.length + response.length) / 4);
}

export default router;