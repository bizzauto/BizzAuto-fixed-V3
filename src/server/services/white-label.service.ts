import { Request, Response } from 'express';
import { qs } from './utils/query.js';

interface WhiteLabelConfig {
  id: string;
  userId: string;
  brandName: string;
  brandLogo?: string;
  brandColor: string;
  brandAccent: string;
  favicon?: string;
  customDomain?: string;
  emailFromName: string;
  emailFromEmail: string;
  footerText: string;
  termsUrl?: string;
  privacyUrl?: string;
  active: boolean;
}

class WhiteLabelService {
  private configs: WhiteLabelConfig[] = [];

  // Create/update white label config
  saveConfig(userId: string, config: Partial<WhiteLabelConfig>): WhiteLabelConfig {
    const existing = this.configs.find(c => c.userId === userId);
    
    const defaultConfig: WhiteLabelConfig = {
      id: existing?.id || `wl-${Date.now()}`,
      userId,
      brandName: 'My Business',
      brandColor: '#6366f1',
      brandAccent: '#818cf8',
      emailFromName: 'My Business',
      emailFromEmail: 'noreply@mybusiness.com',
      footerText: '© 2026 My Business. All rights reserved.',
      active: true,
      ...config,
    };

    if (existing) {
      Object.assign(existing, defaultConfig);
      return existing;
    }
    
    this.configs.push(defaultConfig);
    return defaultConfig;
  }

  // Get config for user
  getConfig(userId: string): WhiteLabelConfig | undefined {
    return this.configs.find(c => c.userId === userId && c.active);
  }

  // Apply branding to email templates
  applyBranding(userId: string, template: string): string {
    const config = this.getConfig(userId);
    if (!config) return template;

    return template
      .replace(/{{BRAND_NAME}}/g, config.brandName)
      .replace(/{{BRAND_COLOR}}/g, config.brandColor)
      .replace(/{{ACCENT_COLOR}}/g, config.brandAccent)
      .replace(/{{FOOTER}}/g, config.footerText);
  }

  // Generate CSS variables
  getCSSVariables(userId: string): Record<string, string> {
    const config = this.getConfig(userId);
    if (!config) return {};
    
    return {
      '--brand-primary': config.brandColor,
      '--brand-accent': config.brandAccent,
      '--brand-name': config.brandName,
    };
  }

  // List all white label configs (admin)
  listConfigs(): WhiteLabelConfig[] {
    return this.configs;
  }
}

export const whiteLabelService = new WhiteLabelService();

// Routes
export const getWhiteLabelConfig = (req: Request, res: Response) => {
  const { userId } = req.params;
  const config = whiteLabelService.getConfig(qs(userId));
  res.json({ success: true, data: config });
};

export const saveWhiteLabelConfig = (req: Request, res: Response) => {
  const { userId } = req.body;
  const config = whiteLabelService.saveConfig(userId, req.body);
  res.json({ success: true, data: config });
};

export const getWhiteLabelCSS = (req: Request, res: Response) => {
  const { userId } = req.params;
  const vars = whiteLabelService.getCSSVariables(qs(userId));
  res.json({ success: true, data: vars });
};

export const listWhiteLabelConfigs = (_req: Request, res: Response) => {
  const configs = whiteLabelService.listConfigs();
  res.json({ success: true, data: configs });
};