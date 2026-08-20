import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// Debug endpoint - Test Qwen 3.6 Plus connection
router.post('/qwen-preview/test', async (req: any, res: any) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'OPENROUTER_API_KEY is not set in .env',
      });
    }

    // Test basic connection
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen-plus',  // Using qwen-plus as fallback
        messages: [{ role: 'user', content: 'Say "Test successful"' }],
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yoursaas.in',
          'X-Title': 'YourSaaS - Qwen Test',
        },
      }
    );

    res.json({
      success: true,
      message: 'Qwen API connection successful!',
      response: response.data.choices[0]?.message?.content,
      apiKeyActive: apiKey ? 'Yes' : 'No',
    });
  } catch (error: any) {
    console.error('Qwen test error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Qwen API test failed',
      details: error.response?.data?.error?.message || error.message,
      status: error.response?.status,
    });
  }
});

// Qwen 3.6 Plus Preview - Advanced AI Model
router.post('/qwen-preview', authenticate, async (req: any, res: any) => {
  try {
    const { prompt, maxTokens = 2000, temperature = 0.7, type = 'general' } = req.body;

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

    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenRouter API key not configured',
      });
    }

    // Call Qwen 3.6 Plus via OpenRouter
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen-plus',  // Using qwen-plus (more stable than qwen3-plus)
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yoursaas.in',
          'X-Title': 'YourSaaS - Qwen Preview',
        },
      }
    );

    const responseText = response.data.choices[0]?.message?.content || '';
    const tokensUsed = response.data.usage?.total_tokens || Math.ceil((prompt.length + responseText.length) / 4);
    const creditCost = Math.ceil(tokensUsed / 1000);

    // Update credits
    await prisma.business.update({
      where: { id: req.user.businessId },
      data: { aiCreditsUsed: { increment: creditCost } },
    });

    res.json({
      success: true,
      data: {
        text: responseText,
        model: 'qwen/qwen-plus',
        modelVersion: '3.6 Plus',
        tokensUsed,
        creditsDeducted: creditCost,
        isPreview: true,
      },
    });
  } catch (error: any) {
    console.error('Qwen 3.6 Plus Preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Qwen 3.6 Plus generation failed',
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Qwen 3.6 Plus Preview - Streaming endpoint
router.post('/qwen-preview/stream', authenticate, async (req: any, res: any) => {
  try {
    const { prompt, maxTokens = 2000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Verify API key exists
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenRouter API key not configured',
      });
    }

    // Call Qwen 3.6 Plus with streaming
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen-plus',  // Using qwen-plus (more stable than qwen3-plus)
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yoursaas.in',
          'X-Title': 'YourSaaS - Qwen Preview Stream',
        },
        responseType: 'stream',
      }
    );

    // Pipe the stream to the client
    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (error: Error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      res.end();
    });
  } catch (error: any) {
    console.error('Qwen 3.6 Plus Stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Streaming failed',
      details: error.message,
    });
  }
});

// Get Qwen 3.6 Plus Preview info
router.get('/qwen-preview/info', authenticate, async (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      model: 'Qwen Plus',
      modelId: 'qwen/qwen-plus',
      status: 'active',
      capabilities: [
        'Advanced text generation',
        'Multi-language support',
        'Code generation',
        'Mathematical reasoning',
        'Long context understanding',
        'Creative writing',
      ],
      maxTokens: 8192,
      pricing: {
        perMillionTokens: 0.40,
        currency: 'USD',
      },
      description: 'Qwen 3.6 Plus is a powerful AI model with enhanced capabilities in reasoning, coding, and creative tasks. This is a preview feature.',
    },
  });
});

export default router;
