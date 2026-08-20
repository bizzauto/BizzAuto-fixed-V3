import OpenAI from 'openai';
import axios from 'axios';
import { prisma } from '../db.js';

// AI Provider Configuration — lazy init to avoid crash when env vars are missing

// Nvidia NIM (FREE — first priority)
let _nvidiaClient: OpenAI | null = null;
function getNvidiaClient(): OpenAI {
  if (!_nvidiaClient) {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) throw new Error('Nvidia NIM API key not configured');
    _nvidiaClient = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey,
    });
  }
  return _nvidiaClient;
}

// OpenRouter (fallback)
let _openrouterClient: OpenAI | null = null;
function getOpenRouterClient(): OpenAI {
  if (!_openrouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OpenRouter API key not configured');
    _openrouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }
  return _openrouterClient;
}

const providers = {
  openrouter: {
    get client() { return getOpenRouterClient(); },
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

    // 1) Try Nvidia NIM (FREE, highest quality)
    try {
      return await this.tryNvidiaNIM(prompt, {
        model: model || 'meta/llama-3.3-70b-instruct',
        maxTokens,
        temperature,
      });
    } catch (error: any) {
      console.warn('Nvidia NIM failed, trying OpenRouter:', error.message);
    }

    // 2) Fallback: OpenRouter
    try {
      return await this.tryOpenRouter(prompt, {
        model: model || providers.openrouter.models.free,
        maxTokens,
        temperature,
      });
    } catch (error: any) {
      console.warn('OpenRouter failed, trying Ollama:', error.message);
      
      try {
        // 3) Fallback: Ollama (local)
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
      // Try OpenRouter first (image generation via Stable Diffusion)
      return await this.tryOpenRouterImage(prompt, { size, style });
    } catch (error: any) {
      console.warn('OpenRouter image failed:', error.message);
    }

    try {
      // Fallback: Replicate
      return await this.tryReplicateImage(prompt, { size, style });
    } catch (error: any) {
      console.warn('Replicate also failed:', error.message);
      throw new Error('Image generation failed: All providers unavailable');
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
   * Try Nvidia NIM (FREE — 1000 req/day)
   */
  private static async tryNvidiaNIM(
    prompt: string,
    options: { model: string; maxTokens: number; temperature: number }
  ): Promise<string> {
    if (!process.env.NVIDIA_NIM_API_KEY) {
      throw new Error('Nvidia NIM API key not configured');
    }

    const response = await getNvidiaClient().chat.completions.create({
      model: options.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    return response.choices[0]?.message?.content || '';
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
   * Try OpenRouter for image generation
   */
  private static async tryOpenRouterImage(
    prompt: string,
    options: { size: string; style: string }
  ): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/images/generations',
      {
        model: providers.openrouter.models.image,
        prompt,
        n: 1,
        size: options.size,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bizzautoai.com',
          'X-Title': 'BizzAuto',
        },
        timeout: 120000,
      }
    );

    return response.data.data[0].url;
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
   * ATOMIC credit check + deduction.
   * Uses Prisma $transaction to prevent race conditions.
   * Returns true if credits were available and deducted, false otherwise.
   */
  static async useCredit(businessId: string, amount: number = 1): Promise<boolean> {
    try {
      return await prisma.$transaction(async (tx) => {
        const business = await tx.business.findUnique({
          where: { id: businessId },
          select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditsPurchased: true },
        });

        if (!business) return false;

        const totalCredits = business.aiCreditsLimit + business.aiCreditsPurchased;
        if (business.aiCreditsUsed + amount > totalCredits) {
          return false; // Not enough credits
        }

        await tx.business.update({
          where: { id: businessId },
          data: { aiCreditsUsed: { increment: amount } },
        });

        return true;
      });
    } catch (error) {
      console.error('[AI] Atomic credit deduction failed:', error);
      return false;
    }
  }

  /**
   * Check AI credit availability (read-only, non-atomic)
   * Prefer useCredit() for write operations to avoid race conditions.
   */
  static async checkCredits(businessId: string): Promise<boolean> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { aiCreditsUsed: true, aiCreditsLimit: true, aiCreditsPurchased: true },
      });

      if (!business) return false;

      const totalCredits = business.aiCreditsLimit + business.aiCreditsPurchased;
      return business.aiCreditsUsed < totalCredits;
    } catch (error) {
      console.error('[AI] Credit check failed:', error);
      return false;
    }
  }
}

export default AIService;
