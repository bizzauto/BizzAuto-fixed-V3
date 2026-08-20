import axios from 'axios';
import { prisma } from '../db.js';

interface DograhConfig {
  apiUrl: string;
  apiKey: string;
}

class DograhService {
  async getConfig(businessId: string): Promise<DograhConfig | null> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        dograhApiKey: true,
        dograhApiUrl: true,
        dograhEnabled: true,
      },
    });

    if (!business?.dograhEnabled || !business.dograhApiKey || !business.dograhApiUrl) {
      return null;
    }

    return {
      apiUrl: business.dograhApiUrl,
      apiKey: business.dograhApiKey,
    };
  }

  async healthCheck(config: DograhConfig): Promise<boolean> {
    try {
      const res = await axios.get(`${config.apiUrl}/api/v1/health`, { timeout: 10000 });
      return res.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  async listAgents(config: DograhConfig): Promise<any[]> {
    try {
      const res = await axios.get(`${config.apiUrl}/api/v1/workflow/list`, {
        headers: { 'X-API-Key': config.apiKey },
        timeout: 15000,
      });
      return res.data ?? [];
    } catch (error: any) {
      console.error('Dograh listAgents error:', error.message);
      return [];
    }
  }

  async getAgent(config: DograhConfig, workflowId: number): Promise<any | null> {
    try {
      const res = await axios.get(`${config.apiUrl}/api/v1/workflow/${workflowId}`, {
        headers: { 'X-API-Key': config.apiKey },
        timeout: 15000,
      });
      return res.data ?? null;
    } catch (error: any) {
      console.error('Dograh getAgent error:', error.message);
      return null;
    }
  }

  async triggerPhoneCall(config: DograhConfig, params: {
    workflowId: number;
    phoneNumber: string;
    context?: Record<string, any>;
  }): Promise<{ runId: string; status: string }> {
    const res = await axios.post(`${config.apiUrl}/api/v1/test-phone-call`, {
      workflow_id: params.workflowId,
      phone_number: params.phoneNumber,
      ...(params.context && { initial_context: params.context }),
    }, {
      headers: { 'X-API-Key': config.apiKey },
      timeout: 30000,
    });

    return {
      runId: res.data?.run_id?.toString() ?? res.data?.id?.toString() ?? '',
      status: res.data?.status ?? 'initiated',
    };
  }

  async getRun(config: DograhConfig, runId: string): Promise<any | null> {
    try {
      const res = await axios.get(`${config.apiUrl}/api/v1/runs/${runId}`, {
        headers: { 'X-API-Key': config.apiKey },
        timeout: 15000,
      });
      return res.data ?? null;
    } catch (error: any) {
      console.error('Dograh getRun error:', error.message);
      return null;
    }
  }

  async listRuns(config: DograhConfig, params?: {
    workflow_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const res = await axios.get(`${config.apiUrl}/api/v1/runs`, {
        params,
        headers: { 'X-API-Key': config.apiKey },
        timeout: 15000,
      });
      return res.data ?? [];
    } catch (error: any) {
      console.error('Dograh listRuns error:', error.message);
      return [];
    }
  }
}

export const dograhService = new DograhService();
