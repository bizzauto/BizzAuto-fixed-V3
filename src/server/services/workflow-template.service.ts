import { Request, Response } from 'express';
import { qs } from './utils/query.js';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'support' | 'marketing' | 'onboarding';
  trigger: {
    type: 'new_contact' | 'new_deal' | 'stage_change' | 'tag_added' | 'form_submit';
    conditions: Record<string, any>;
  };
  actions: {
    type: 'send_email' | 'send_sms' | 'create_task' | 'update_field' | 'notify_user' | 'wait' | 'add_to_list';
    config: Record<string, any>;
    delay?: number; // minutes
  }[];
  active: boolean;
  usageCount: number;
}

class WorkflowService {
  private templates: WorkflowTemplate[] = [
    {
      id: 'welcome-new-contact',
      name: 'Welcome New Contact',
      description: 'Send welcome email when new contact added',
      category: 'onboarding',
      trigger: { type: 'new_contact', conditions: {} },
      actions: [
        { type: 'send_email', config: { template: 'welcome', subject: 'Welcome!' }, delay: 5 },
        { type: 'create_task', config: { title: 'Follow up with new contact', assignTo: 'owner' }, delay: 1440 },
      ],
      active: true,
      usageCount: 0,
    },
    {
      id: 'deal-stage-notification',
      name: 'Deal Stage Alert',
      description: 'Notify team when deal moves to negotiation',
      category: 'sales',
      trigger: { type: 'stage_change', conditions: { toStage: 'negotiation' } },
      actions: [
        { type: 'notify_user', config: { channel: 'whatsapp', message: 'Deal moved to negotiation!' } },
      ],
      active: true,
      usageCount: 0,
    },
    {
      id: 'lead nurturing',
      name: 'Lead Nurturing Sequence',
      description: '7-day drip campaign for new leads',
      category: 'marketing',
      trigger: { type: 'tag_added', conditions: { tag: 'new-lead' } },
      actions: [
        { type: 'send_email', config: { template: 'lead-1', subject: 'Thanks for your interest!' }, delay: 60 },
        { type: 'wait', config: { duration: 1440 } },
        { type: 'send_email', config: { template: 'lead-2', subject: 'Here\'s what we offer' }, delay: 0 },
        { type: 'wait', config: { duration: 2880 } },
        { type: 'send_email', config: { template: 'lead-3', subject: 'Special offer inside' }, delay: 0 },
      ],
      active: true,
      usageCount: 0,
    },
  ];

  // Get all templates
  getTemplates(category?: string): WorkflowTemplate[] {
    if (category) {
      return this.templates.filter(t => t.category === category && t.active);
    }
    return this.templates.filter(t => t.active);
  }

  // Get template by ID
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  // Create custom template
  createTemplate(data: Partial<WorkflowTemplate>): WorkflowTemplate {
    const template: WorkflowTemplate = {
      id: `wf-${Date.now()}`,
      name: data.name || 'Custom Workflow',
      description: data.description || '',
      category: data.category || 'sales',
      trigger: data.trigger || { type: 'new_contact', conditions: {} },
      actions: data.actions || [],
      active: true,
      usageCount: 0,
    };
    this.templates.push(template);
    return template;
  }

  // Execute workflow (simulated)
  async executeWorkflow(templateId: string, context: Record<string, any>) {
    const template = this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const results: any[] = [];
    for (const action of template.actions) {
      if (action.delay) {
        await new Promise(r => setTimeout(r, action.delay! * 1000));
      }

      // Simulate action execution
      results.push({
        action: action.type,
        status: 'success',
        timestamp: new Date(),
      });
    }

    template.usageCount++;
    return results;
  }

  // Update template
  updateTemplate(id: string, data: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      Object.assign(template, data);
      return template;
    }
    return null;
  }

  // Toggle active
  toggleTemplate(id: string): boolean {
    const template = this.templates.find(t => t.id === id);
    if (template) {
      template.active = !template.active;
      return true;
    }
    return false;
  }
}

export const workflowService = new WorkflowService();

// Routes
export const getWorkflowTemplates = (req: Request, res: Response) => {
  const { category } = req.query;
  const templates = workflowService.getTemplates(category as string);
  res.json({ success: true, data: templates });
};

export const getWorkflowTemplate = (req: Request, res: Response) => {
  const { id } = req.params;
  const template = workflowService.getTemplate(qs(id));
  res.json({ success: !!template, data: template });
};

export const createWorkflowTemplate = (req: Request, res: Response) => {
  const template = workflowService.createTemplate(req.body);
  res.json({ success: true, data: template });
};

export const executeWorkflow = async (req: Request, res: Response) => {
  const { templateId, context } = req.body;
  try {
    const results = await workflowService.executeWorkflow(templateId, context);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateWorkflowTemplate = (req: Request, res: Response) => {
  const { id } = req.params;
  const template = workflowService.updateTemplate(qs(id), req.body);
  res.json({ success: !!template, data: template });
};

export const toggleWorkflow = (req: Request, res: Response) => {
  const { id } = req.params;
  const result = workflowService.toggleTemplate(qs(id));
  res.json({ success: result });
};