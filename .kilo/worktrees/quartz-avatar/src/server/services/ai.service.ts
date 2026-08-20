import OpenAI from 'openai';
import axios from 'axios';
import { prisma } from '../../index.js';

// AI Provider Configuration
const providers = {
  openrouter: {
    client: new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    }),
    models: {
      text: 'meta-llama/llama-3.2-3b-instruct',
      code: 'meta-llama/llama-3.1-70b-instruct',
      image: 'stabilityai/stable-diffusion-3-medium',
      free: 'google/gemma-2-9b-it:free',
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    models: {
      text: 'llama3.2:3b',
      code: 'codellama:7b',
    },
  },
  replicate: {
    apiKey: process.env.REPLICATE_API_KEY || '',
    models: {
      image: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      video: 'cjwbw/damo-video-generator:2429189707c1c5e76db3a547ed509b13e2d1b3d93e1d8e5c8b5b5f5e5d5c5b5a',
    },
  },
};

/**
 * AI Service with automatic fallback
 * Priority: OpenRouter (Free) → Ollama (Local) → Replicate (Fallback)
 */
export class AIService {
  /**
   * Generate text with auto fallback
   */
  static async generateText(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      type?: 'text' | 'code' | 'creative';
    } = {}
  ): Promise<string> {
    const {
      model,
      maxTokens = 1000,
      temperature = 0.7,
      type = 'text',
    } = options;

    try {
      // Try OpenRouter first (free tier)
      return await this.tryOpenRouter(prompt, {
        model: model || providers.openrouter.models.free,
        maxTokens,
        temperature,
      });
    } catch (error: any) {
      console.warn('OpenRouter failed, trying Ollama:', error.message);
      
      try {
        // Fallback to Ollama (local)
        return await this.tryOllama(prompt, {
          model: model || providers.ollama.models.text,
          maxTokens,
          temperature,
        });
      } catch (ollamaError: any) {
        console.error('Ollama also failed:', ollamaError.message);
        throw new Error('AI generation failed: All providers unavailable');
      }
    }
  }

  /**
   * Generate image with fallback
   */
  static async generateImage(
    prompt: string,
    options: {
      size?: '1024x1024' | '1024x1792' | '1792x1024';
      style?: string;
    } = {}
  ): Promise<string> {
    const { size = '1024x1024', style = 'natural' } = options;

    try {
      // Try Replicate first
      return await this.tryReplicateImage(prompt, { size, style });
    } catch (error: any) {
      console.warn('Replicate failed:', error.message);
      throw new Error('Image generation failed');
    }
  }

  /**
   * Generate poster using AI
   */
  static async generatePoster(
    prompt: string,
    options: {
      format?: 'square' | 'story' | 'landscape';
      businessId?: string;
    } = {}
  ): Promise<{ imageUrl: string; prompt: string }> {
    const { format = 'square' } = options;
    
    const sizeMap = {
      square: '1024x1024',
      story: '1024x1792',
      landscape: '1792x1024',
    };

    const enhancedPrompt = `Create a professional business poster: ${prompt}. Make it visually appealing with modern design, clear hierarchy, and professional colors.`;

    const imageUrl = await this.generateImage(enhancedPrompt, {
      size: sizeMap[format] as any,
    });

    return { imageUrl, prompt };
  }

  /**
   * Try OpenRouter (Free tier models)
   */
  private static async tryOpenRouter(
    prompt: string,
    options: { model: string; maxTokens: number; temperature: number }
  ): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await providers.openrouter.client.chat.completions.create({
      model: options.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Try Ollama (Local models)
   */
  private static async tryOllama(
    prompt: string,
    options: { model: string; maxTokens: number; temperature: number }
  ): Promise<string> {
    const response = await axios.post(
      `${providers.ollama.baseURL}/api/generate`,
      {
        model: options.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      },
      { timeout: 60000 }
    );

    return response.data.response || '';
  }

  /**
   * Try Replicate for image generation
   */
  private static async tryReplicateImage(
    prompt: string,
    options: { size: string; style: string }
  ): Promise<string> {
    if (!process.env.REPLICATE_API_KEY) {
      throw new Error('Replicate API key not configured');
    }

    // Create prediction
    const createResponse = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: providers.replicate.models.image,
        input: {
          prompt,
          width: options.size === '1024x1792' ? 1024 : 1792,
          height: options.size === '1024x1792' ? 1792 : 1024,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const predictionId = createResponse.data.id;

    // Poll for result
    return await this.pollReplicateResult(predictionId);
  }

  /**
   * Poll Replicate prediction result
   */
  private static async pollReplicateResult(
    predictionId: string,
    maxAttempts = 30
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_KEY}`,
          },
        }
      );

      if (response.data.status === 'succeeded') {
        return response.data.output[0];
      }

      if (response.data.status === 'failed') {
        throw new Error('Replicate prediction failed');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Replicate prediction timed out');
  }

  /**
   * Check AI credit availability
   */
  static async checkCredits(businessId: string): Promise<boolean> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditsPurchased: true },
    });

    if (!business) return false;

    const totalCredits = business.aiCreditsLimit + business.aiCreditsPurchased;
    return business.aiCreditsUsed < totalCredits;
  }

  /**
   * Increment AI credit usage
   */
  static async incrementCredit(businessId: string): Promise<void> {
    await prisma.business.update({
      where: { id: businessId },
      data: { aiCreditsUsed: { increment: 1 } },
    });
  }
}

export default AIService;
