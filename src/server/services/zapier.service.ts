import { Request, Response } from 'express';
import { qs } from './utils/query.js';

interface ZapierWebhook {
  id: string;
  name: string;
  triggerEvent: string;
  url: string;
  active: boolean;
  headers?: Record<string, string>;
}

interface ZapierAction {
  id: string;
  name: string;
  description: string;
  inputFields: { key: string; type: string; required: boolean; label: string }[];
}

const availableActions: ZapierAction[] = [
  {
    id: 'create_contact',
    name: 'Create Contact',
    description: 'Create a new contact in BizzAuto CRM',
    inputFields: [
      { key: 'name', type: 'string', required: true, label: 'Full Name' },
      { key: 'phone', type: 'string', required: true, label: 'Phone Number' },
      { key: 'email', type: 'email', required: false, label: 'Email' },
      { key: 'company', type: 'string', required: false, label: 'Company' },
    ],
  },
  {
    id: 'create_deal',
    name: 'Create Deal',
    description: 'Create a new deal in pipeline',
    inputFields: [
      { key: 'contactId', type: 'string', required: true, label: 'Contact ID' },
      { key: 'title', type: 'string', required: true, label: 'Deal Title' },
      { key: 'value', type: 'number', required: true, label: 'Deal Value' },
      { key: 'stage', type: 'string', required: false, label: 'Stage' },
    ],
  },
  {
    id: 'send_whatsapp',
    name: 'Send WhatsApp Message',
    description: 'Send a WhatsApp message',
    inputFields: [
      { key: 'phone', type: 'string', required: true, label: 'Phone Number' },
      { key: 'message', type: 'text', required: true, label: 'Message' },
    ],
  },
  {
    id: 'create_task',
    name: 'Create Task',
    description: 'Create a new task',
    inputFields: [
      { key: 'title', type: 'string', required: true, label: 'Task Title' },
      { key: 'dueDate', type: 'datetime', required: false, label: 'Due Date' },
      { key: 'priority', type: 'string', required: false, label: 'Priority' },
    ],
  },
  {
    id: 'update_contact',
    name: 'Update Contact',
    description: 'Update an existing contact',
    inputFields: [
      { key: 'contactId', type: 'string', required: true, label: 'Contact ID' },
      { key: 'stage', type: 'string', required: false, label: 'Stage' },
      { key: 'tags', type: 'string', required: false, label: 'Tags (comma separated)' },
    ],
  },
];

const triggers = [
  {
    id: 'new_contact',
    name: 'New Contact Created',
    description: 'Triggers when a new contact is created',
    sample: {},
  },
  {
    id: 'new_deal',
    name: 'New Deal Created',
    description: 'Triggers when a new deal is created',
    sample: {},
  },
  {
    id: 'deal_won',
    name: 'Deal Won',
    description: 'Triggers when a deal is marked as won',
    sample: {},
  },
  {
    id: 'order_created',
    name: 'New Order',
    description: 'Triggers when a new order is created',
    sample: {},
  },
  {
    id: 'appointment_scheduled',
    name: 'Appointment Scheduled',
    description: 'Triggers when an appointment is scheduled',
    sample: {},
  },
];

class ZapierService {
  private webhooks: ZapierWebhook[] = [];

  // Get available triggers
  getTriggers() {
    return triggers;
  }

  // Get available actions
  getActions() {
    return availableActions;
  }

  // Create webhook
  createWebhook(data: { name: string; triggerEvent: string; url: string; headers?: Record<string, string> }): ZapierWebhook {
    const webhook: ZapierWebhook = {
      id: `webhook-${Date.now()}`,
      name: data.name,
      triggerEvent: data.triggerEvent,
      url: data.url,
      active: true,
      headers: data.headers,
    };
    this.webhooks.push(webhook);
    return webhook;
  }

  // List webhooks
  listWebhooks() {
    return this.webhooks;
  }

  // Delete webhook
  deleteWebhook(id: string) {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
    return { success: true };
  }

  // Execute action
  async executeAction(actionId: string, inputData: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    const action = availableActions.find(a => a.id === actionId);
    
    if (!action) {
      return { success: false, error: 'Unknown action' };
    }

    console.log(`⚡ Executing Zapier action: ${action.name}`);

    // Simulate action execution
    switch (actionId) {
      case 'create_contact':
        return { success: true, data: { id: `contact-${Date.now()}`, ...inputData } };
      case 'create_deal':
        return { success: true, data: { id: `deal-${Date.now()}`, ...inputData } };
      case 'send_whatsapp':
        return { success: true, data: { messageId: `wa-${Date.now()}`, status: 'sent' } };
      case 'create_task':
        return { success: true, data: { id: `task-${Date.now()}`, ...inputData } };
      case 'update_contact':
        return { success: true, data: { id: inputData.contactId, ...inputData } };
      default:
        return { success: false, error: 'Action not implemented' };
    }
  }

  // Trigger webhook (called when events happen in CRM)
  async triggerWebhook(event: string, data: any): Promise<void> {
    const matchingWebhooks = this.webhooks.filter(w => w.triggerEvent === event && w.active);
    
    for (const webhook of matchingWebhooks) {
      try {
        // In production, send actual HTTP request
        console.log(`📤 Triggering webhook ${webhook.name} for event ${event}`);
        
        // Simulate webhook call
        // await fetch(webhook.url, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json', ...webhook.headers },
        //   body: JSON.stringify({ event, data }),
        // });
      } catch (error) {
        console.error(`Webhook error for ${webhook.name}:`, error);
      }
    }
  }

  // Generate Zapier-compatible authentication
  getAuthConfig() {
    return {
      type: 'basic',
      fields: [
        { key: 'apiKey', label: 'API Key', type: 'string', required: true },
      ],
    };
  }

  // Test connection
  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey) {
      return { success: false, message: 'API key required' };
    }
    return { success: true, message: 'Connection successful!' };
  }
}

export const zapierService = new ZapierService();

// Route handlers
export const getZapierTriggers = (_req: Request, res: Response) => {
  res.json({ success: true, data: zapierService.getTriggers() });
};

export const getZapierActions = (_req: Request, res: Response) => {
  res.json({ success: true, data: zapierService.getActions() });
};

export const createZapierWebhook = (req: Request, res: Response) => {
  const webhook = zapierService.createWebhook(req.body);
  res.json({ success: true, data: webhook });
};

export const listZapierWebhooks = (_req: Request, res: Response) => {
  res.json({ success: true, data: zapierService.listWebhooks() });
};

export const deleteZapierWebhook = (req: Request, res: Response) => {
  const result = zapierService.deleteWebhook(qs(req.params.id));
  res.json(result);
};

export const executeZapierAction = async (req: Request, res: Response) => {
  const { actionId, ...inputData } = req.body;
  const result = await zapierService.executeAction(actionId, inputData);
  res.json(result);
};

export const testZapierConnection = async (req: Request, res: Response) => {
  const result = await zapierService.testConnection(req.body.apiKey);
  res.json(result);
};