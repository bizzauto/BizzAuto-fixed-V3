import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// AI Router - Cost-optimized AI request handling
router.post('/generate', authenticate, async (req: any, res: any) => {
  try {
    const { type, prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found',
      });
    }

    // Check AI credits
    const creditsUsed = business.aiCreditsUsed || 0;
    const creditsLimit = business.aiCreditsLimit || 100;

    if (creditsUsed >= creditsLimit) {
      return res.status(429).json({
        success: false,
        error: 'AI credits exhausted. Please upgrade your plan or purchase more credits.',
        current: creditsUsed,
        limit: creditsLimit,
      });
    }

    // Route to appropriate AI model based on task type
    const model = getOptimalModel(type);
    const response = await callAIProvider(model, prompt);

    // Deduct credits (estimate based on tokens)
    const tokensUsed = estimateTokens(prompt, response.text);
    const creditCost = Math.ceil(tokensUsed / 1000);

    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { aiCreditsUsed: { increment: creditCost } },
    });

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
    res.status(500).json({
      success: false,
      error: 'AI generation failed',
      details: error.message,
    });
  }
});

// Generate social media caption
router.post('/caption', authenticate, async (req: any, res: any) => {
  try {
    const { topic, businessType, platform, language = 'en' } = req.body;

    const prompt = `Generate a ${platform} caption for a ${businessType} in India. Topic: ${topic}. Include emojis and relevant hashtags. Keep it engaging and under 280 characters for Twitter, or appropriate length for ${platform}.`;

    const response = await callAIProvider(
      { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
      prompt
    );

    res.json({
      success: true,
      data: { caption: response.text },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate caption', details: error.message });
  }
});

// Generate hashtags
router.post('/hashtags', authenticate, async (req: any, res: any) => {
  try {
    const { topic, platform } = req.body;

    const prompt = `Generate 15-20 relevant hashtags for ${topic} on ${platform}. Mix of popular and niche hashtags. Return as JSON array.`;

    const response = await callAIProvider(
      { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
      prompt
    );

    res.json({
      success: true,
      data: { hashtags: response.text },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate hashtags', details: error.message });
  }
});

// Generate review reply
router.post('/review-reply', authenticate, async (req: any, res: any) => {
  try {
    const { reviewText, rating, businessType, businessName } = req.body;

    const prompt = `Generate a professional reply to this ${rating}-star review for ${businessName}, a ${businessType} in India. Review: "${reviewText}". Keep it under 100 words, thank the customer, and address their concerns. Use Indian English tone.`;

    const response = await callAIProvider(
      { provider: 'grok', model: 'grok-3-mini' },
      prompt
    );

    res.json({
      success: true,
      data: { reply: response.text },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate review reply', details: error.message });
  }
});

// Generate content calendar
router.post('/content-calendar', authenticate, async (req: any, res: any) => {
  try {
    const { businessType, city, month, year } = req.body;

    const prompt = `Generate a ${month} ${year} content calendar for a ${businessType} in ${city}, India. Include 30 posts with: date, topic, caption, hashtags, and post_type (promotional, educational, engagement, festival). Return as JSON array.`;

    const response = await callAIProvider(
      { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
      prompt
    );

    res.json({
      success: true,
      data: { calendar: response.text },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to generate content calendar', details: error.message });
  }
});

// Helper functions
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
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://yoursaas.in',
            'X-Title': 'YourSaaS',
          },
        }
      );
      return { text: response.data.choices[0].message.content };
    }

    if (model.provider === 'grok') {
      const response = await axios.post(
        'https://api.x.ai/v1/chat/completions',
        {
          model: model.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
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
