import { prisma } from '../db.js';
import { EventEmitter } from 'events';

const workflowEvents = new EventEmitter();
workflowEvents.setMaxListeners(50);

interface WorkflowContext {
  businessId: string;
  workflowId: string;
  executionId: string;
  triggerData: Record<string, any>;
  nodeResults: Record<string, any>;
}

// Execute a single node and return its result
async function executeNode(
  nodeType: string,
  data: any,
  ctx: WorkflowContext,
  previousOutput?: any
): Promise<any> {
  const depth = (ctx.nodeResults as any).__depth || 0;
  if (depth > 5) {
    return { error: 'Max workflow recursion depth reached' };
  }
  (ctx.nodeResults as any).__depth = depth + 1;

  const contact = ctx.triggerData.contact || {};
  const phone = contact.phone || ctx.triggerData.phone || '';
  const email = contact.email || ctx.triggerData.email || '';
  const contactId = contact.id || ctx.triggerData.contactId || '';

  switch (nodeType) {
    case 'send_whatsapp':
    case 'send_message': {
      const { default: axios } = await import('axios');
      const message = interpolateTemplate(data.message || data.template || 'Hello!', { contact, trigger: ctx.triggerData, previous: previousOutput });
      const to = data.to || phone;
      if (!to) return { sent: false, error: 'No phone number' };

      try {
        const business = await prisma.business.findUnique({ where: { id: ctx.businessId } });
        const integration = await prisma.integration.findFirst({
          where: { businessId: ctx.businessId, type: 'whatsapp_meta', isActive: true },
        });

        if (integration) {
          const config = integration.config as any;
          const phoneNumberId = config.phoneNumberId;
          const accessToken = config.accessToken;

          await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: to.replace(/\D/g, ''),
              type: 'text',
              text: { body: message },
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          // Log message
          await prisma.message.create({
            data: {
              businessId: ctx.businessId,
              contactId: contactId || undefined,
              direction: 'outbound',
              type: 'text',
              content: message,
              status: 'sent',
              metadata: { workflowId: ctx.workflowId, executionId: ctx.executionId, nodeType },
            },
          });

          return { sent: true, to, message, channel: 'whatsapp_meta' };
        }

        // Try Evolution API
        const evoIntegration = await prisma.integration.findFirst({
          where: { businessId: ctx.businessId, type: 'evolution_api', isActive: true },
        });

        if (evoIntegration) {
          const config = evoIntegration.config as any;
          await axios.post(
            `${config.baseUrl}/message/sendText/${config.instanceName}`,
            { number: to.replace(/\D/g, ''), textMessage: { text: message } },
            { headers: { apikey: config.apiKey } }
          );

          await prisma.message.create({
            data: {
              businessId: ctx.businessId,
              contactId: contactId || undefined,
              direction: 'outbound',
              type: 'text',
              content: message,
              status: 'sent',
              metadata: { workflowId: ctx.workflowId, executionId: ctx.executionId, nodeType },
            },
          });

          return { sent: true, to, message, channel: 'evolution' };
        }

        return { sent: false, error: 'No WhatsApp provider configured' };
      } catch (err: any) {
        console.error(`[Workflow] WhatsApp send failed:`, err.message);
        return { sent: false, error: err.message };
      }
    }

    case 'send_email': {
      const { default: nodemailer } = await import('nodemailer');
      const subject = interpolateTemplate(data.subject || 'Message from BizzAuto', { contact, trigger: ctx.triggerData });
      const body = interpolateTemplate(data.message || data.body || '', { contact, trigger: ctx.triggerData });
      const toEmail = data.to || email;

      if (!toEmail) return { sent: false, error: 'No email address' };

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: toEmail,
          subject,
          html: body,
        });

        await prisma.message.create({
          data: {
            businessId: ctx.businessId,
            contactId: contactId || undefined,
            direction: 'outbound',
            type: 'email',
            content: body,
            status: 'sent',
            metadata: { workflowId: ctx.workflowId, to: toEmail, subject },
          },
        });

        return { sent: true, to: toEmail, subject };
      } catch (err: any) {
        return { sent: false, error: err.message };
      }
    }

    case 'send_sms': {
      // SMS requires a configured provider (Twilio, etc.)
      console.warn('[Workflow] send_sms node triggered but no SMS provider configured');
      return { sent: false, error: 'SMS provider not configured', to: phone, message: data.message, channel: 'sms' };
    }

    case 'update_contact': {
      if (!contactId) return { updated: false, error: 'No contact ID' };
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.status) updateData.status = data.status;
      if (data.dealValue) updateData.dealValue = parseFloat(data.dealValue);
      if (data.notes) updateData.notes = data.notes;

      await prisma.contact.update({ where: { id: contactId }, data: updateData });
      return { updated: true, fields: updateData };
    }

    case 'add_tag': {
      if (!contactId) return { tagged: false, error: 'No contact ID' };
      const tags = Array.isArray(data.tags) ? data.tags : (data.tags || '').split(',').map((t: string) => t.trim());
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      const existingTags = (contact?.tags as string[]) || [];
      const newTags = [...new Set([...existingTags, ...tags])];
      await prisma.contact.update({ where: { id: contactId }, data: { tags: newTags } });
      return { tagged: true, tags: newTags };
    }

    case 'remove_tag': {
      if (!contactId) return { untagged: false, error: 'No contact ID' };
      const removeTags = Array.isArray(data.tags) ? data.tags : (data.tags || '').split(',').map((t: string) => t.trim());
      const c = await prisma.contact.findUnique({ where: { id: contactId } });
      const currentTags = (c?.tags as string[]) || [];
      const filteredTags = currentTags.filter((t) => !removeTags.includes(t));
      await prisma.contact.update({ where: { id: contactId }, data: { tags: filteredTags } });
      return { untagged: true, removed: removeTags, remaining: filteredTags };
    }

    case 'ai_reply':
    case 'ai_response': {
      try {
        const { AIService } = await import('./ai.service.js');

        const business = await prisma.business.findUnique({ where: { id: ctx.businessId } });
        const autopilot = await prisma.autopilotSettings.findFirst({ where: { businessId: ctx.businessId } });

        const tone = autopilot?.aiTone || 'professional';
        const language = autopilot?.aiLanguage || 'english';
        const systemPrompt = data.systemPrompt ||
          `You are a helpful ${tone} customer service agent for ${business?.name || 'the business'}. ` +
          `Reply in ${language}. Be concise and helpful. Do not use markdown. Keep messages under 300 characters for WhatsApp.`;

        const incomingMessage = ctx.triggerData.message || data.message || 'Hello';
        const history = ctx.triggerData.conversationHistory || [];

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...history.slice(-5).map((h: any) => ({ role: h.role || 'user' as const, content: h.content })),
          { role: 'user' as const, content: incomingMessage },
        ];

        const response = await (AIService as any).generateText(messages, { maxTokens: 500 });

        // Send via WhatsApp if phone available
        if (phone && response) {
          const sendResult = await executeNode('send_whatsapp', { message: response, to: phone }, ctx);
          return { generated: true, response, sent: sendResult.sent, channel: 'ai_whatsapp' };
        }

        return { generated: true, response, sent: false, reason: 'no_phone' };
      } catch (err: any) {
        return { generated: false, error: err.message };
      }
    }

    case 'ai_score_lead':
        // Calculate lead score based on real contact data
        try {
          const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            select: { dealValue: true, tags: true, lastActivity: true, stage: true }
          }) as any;
          
          let overallScore = 50;
          let engagementScore = 50;
          let recencyScore = 50;
          let intentScore = 50;
          let fitScore = 50;

          if (contact) {
            // Score based on deal value
            engagementScore = Math.min(100, Math.floor((contact.dealValue || 0) / 10000));
            
            // Score based on tags
            const tags = (contact.tags || []).map((t: string) => t.toLowerCase());
            if (tags.includes('hot') || tags.includes('vip')) intentScore = 85;
            else if (tags.includes('warm')) intentScore = 70;
            else if (tags.includes('cold')) intentScore = 30;
            
            // Score based on stage
            switch (contact.stage) {
              case 'Won': fitScore = 95; break;
              case 'Negotiation': fitScore = 85; break;
              case 'Proposal': fitScore = 75; break;
              case 'Qualified': fitScore = 65; break;
              case 'Contacted': fitScore = 55; break;
              default: fitScore = 45;
            }
            
            overallScore = Math.floor((engagementScore + recencyScore + intentScore + fitScore) / 4);
          }

          await prisma.leadScore.upsert({
            where: { businessId_contactId: { businessId: ctx.businessId, contactId } },
            update: { 
              score: overallScore, engagementScore, recencyScore, 
              intentScore, fitScore, lastScoredAt: new Date() 
            },
            create: { 
              businessId: ctx.businessId,
              contactId: contactId, 
              score: overallScore, engagementScore, recencyScore, 
              intentScore, fitScore, lastScoredAt: new Date() 
            }
          });
        } catch (err: any) {
          console.warn('[Workflow] Lead score calculation failed:', err?.message);
        }
        break;

    case 'webhook': {
      const { default: axios } = await import('axios');
      const url = data.url;
      if (!url) return { called: false, error: 'No webhook URL' };

      const payload = {
        businessId: ctx.businessId,
        triggerData: ctx.triggerData,
        contact,
        nodeData: data,
      };

      try {
        const response = await axios.post(url, payload, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        });

        return { called: true, url, status: response.status };
      } catch (err: any) {
        return { called: false, error: err.message };
      }
    }

    case 'condition':
    case 'if_else': {
      const field = data.field || 'source';
      const value = data.value || '';
      const operator = data.operator || 'equals';
      const fieldValue = ctx.triggerData[field] || contact[field] || previousOutput?.[field] || '';

      let result = false;
      switch (operator) {
        case 'equals': result = String(fieldValue) === String(value); break;
        case 'not_equals': result = String(fieldValue) !== String(value); break;
        case 'contains': result = String(fieldValue).toLowerCase().includes(String(value).toLowerCase()); break;
        case 'gt': result = Number(fieldValue) > Number(value); break;
        case 'lt': result = Number(fieldValue) < Number(value); break;
        default: result = String(fieldValue) === String(value);
      }

      return { evaluated: true, result, path: result ? 'true' : 'false', field, operator, value: fieldValue };
    }

    case 'delay':
    case 'wait': {
      // Parse duration string (e.g., "30m", "1h", "2d") to milliseconds
      const durationStr = data.duration || '1h';
      let delayMs = 60 * 60 * 1000; // default 1h
      const match = durationStr.match(/^(\d+)(m|h|d)$/);
      if (match) {
        const val = parseInt(match[1]);
        if (match[2] === 'm') delayMs = val * 60 * 1000;
        else if (match[2] === 'h') delayMs = val * 60 * 60 * 1000;
        else if (match[2] === 'd') delayMs = val * 24 * 60 * 60 * 1000;
      }

      // For short delays (≤30s), actually wait in-process
      if (delayMs <= 30000) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return { waited: true, duration: durationStr, actualMs: delayMs, scheduled: false };
      }

      // For longer delays, the workflow should be re-queued via BullMQ
      // Log warning — proper fix is to schedule remaining steps via queue
      console.warn(`[Workflow] Delay node "${durationStr}" (${delayMs}ms) — in-process wait too long, continuing immediately. Implement queue-based scheduling for production.`);
      return { waited: false, duration: durationStr, scheduled: false, warning: 'Long delays require queue-based scheduling' };
    }

    case 'add_activity': {
      if (!contactId) return { added: false, error: 'No contact ID' };
      await prisma.activity.create({
        data: {
          businessId: ctx.businessId,
          contactId,
          type: data.activityType || 'note',
          title: data.title || 'Activity added by workflow',
          content: data.content || '',
          metadata: { workflowId: ctx.workflowId },
          createdBy: 'system',
        },
      });
      return { added: true };
    }

    case 'trigger': {
      return { triggered: true, timestamp: new Date().toISOString() };
    }

    default:
      return { executed: true, nodeType, note: 'Unknown node type — simulated' };
  }
}

// Interpolate template variables like {{contact.name}}, {{trigger.message}}
function interpolateTemplate(template: string, vars: any): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split('.');
    let value: any = vars;
    for (const p of parts) {
      value = value?.[p];
    }
    return value !== undefined && value !== null ? String(value) : `{{${path}}}`;
  });
}

// Execute a workflow (real execution, not simulated)
export async function executeWorkflow(
  businessId: string,
  workflowId: string,
  triggerData: Record<string, any>
): Promise<any> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, businessId, isActive: true },
  });

  if (!workflow) throw new Error('Workflow not found or inactive');

  const nodes = workflow.nodes as any[];
  const edges = workflow.edges as any[];
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error('Workflow has no nodes');

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      businessId,
      workflowId,
      status: 'running',
      triggerData,
      nodeResults: {},
    },
  });

  const ctx: WorkflowContext = {
    businessId,
    workflowId,
    executionId: execution.id,
    triggerData,
    nodeResults: {},
  };

  // Build adjacency list
  const adjacencyList: Record<string, string[]> = {};
  for (const edge of edges) {
    const sourceId = edge.source || edge.sourceNodeId;
    const targetId = edge.target || edge.targetNodeId;
    if (sourceId && targetId) {
      if (!adjacencyList[sourceId]) adjacencyList[sourceId] = [];
      adjacencyList[sourceId].push(targetId);
    }
  }

  // Find root nodes
  const targetIds = new Set(edges.map((e: any) => e.target || e.targetNodeId));
  const rootNodes = nodes.filter((n: any) => !targetIds.has(n.id));

  // BFS traversal with real execution
  const queue: string[] = rootNodes.map((n: any) => n.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) continue;

    const nodeType = node.type || node.data?.type || 'unknown';

    try {
      const previousOutput = Object.values(ctx.nodeResults).length > 0
        ? Object.values(ctx.nodeResults)[Object.values(ctx.nodeResults).length - 1]?.output
        : undefined;

      const output = await executeNode(nodeType, node.data || {}, ctx, previousOutput);

      ctx.nodeResults[nodeId] = {
        nodeType,
        label: node.data?.label || node.label || nodeType,
        status: 'completed',
        executedAt: new Date().toISOString(),
        output,
      };

      // Handle condition branching
      if (nodeType === 'condition' || nodeType === 'if_else') {
        const trueEdge = edges.find((e: any) => (e.source === nodeId || e.sourceNodeId === nodeId) && e.sourceHandle === 'true');
        const falseEdge = edges.find((e: any) => (e.source === nodeId || e.sourceNodeId === nodeId) && e.sourceHandle === 'false');

        if (output.result) {
          if (trueEdge) {
            const nextId = trueEdge.target || trueEdge.targetNodeId;
            if (nextId && !visited.has(nextId)) queue.push(nextId);
          }
        } else {
          if (falseEdge) {
            const nextId = falseEdge.target || falseEdge.targetNodeId;
            if (nextId && !visited.has(nextId)) queue.push(nextId);
          }
        }
        continue; // Don't add all children for condition nodes
      }

      // Enqueue children
      const children = adjacencyList[nodeId] || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    } catch (err: any) {
      console.error(`[Workflow] Node ${nodeId} (${nodeType}) failed:`, err.message);
      ctx.nodeResults[nodeId] = {
        nodeType,
        label: node.data?.label || nodeType,
        status: 'failed',
        executedAt: new Date().toISOString(),
        output: { error: err.message },
      };
    }
  }

  // Mark unvisited nodes as skipped
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      ctx.nodeResults[node.id] = {
        nodeType: node.type || node.data?.type || 'unknown',
        label: node.data?.label || 'Unknown',
        status: 'skipped',
        executedAt: new Date().toISOString(),
        output: null,
      };
    }
  }

  // Update execution record
  const hasFailures = Object.values(ctx.nodeResults).some((r: any) => r.status === 'failed');
  const completedExecution = await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: hasFailures ? 'partial' : 'completed',
      nodeResults: ctx.nodeResults,
      completedAt: new Date(),
    },
  });

  await prisma.workflow.update({
    where: { id: workflowId },
    data: { runCount: { increment: 1 }, lastRunAt: new Date() },
  });

  return completedExecution;
}

// Trigger all matching workflows for a given event
export async function triggerWorkflows(
  businessId: string,
  triggerType: string,
  triggerData: Record<string, any>
): Promise<any[]> {
  const workflows = await prisma.workflow.findMany({
    where: { businessId, triggerType, isActive: true },
  });

  const results: any[] = [];

  for (const workflow of workflows) {
    // Check trigger config conditions
    if (workflow.triggerConfig && typeof workflow.triggerConfig === 'object') {
      const config = workflow.triggerConfig as any;
      let shouldExecute = true;

      if (triggerType === 'message_received' && config.keywords && triggerData.message) {
        const keywords = Array.isArray(config.keywords) ? config.keywords : [config.keywords];
        const messageText = (triggerData.message as string).toLowerCase();
        shouldExecute = keywords.some((kw: string) => messageText.includes(kw.toLowerCase()));
      }

      if (triggerType === 'tag_added' && config.tags && triggerData.tag) {
        const tags = Array.isArray(config.tags) ? config.tags : [config.tags];
        shouldExecute = tags.includes(triggerData.tag);
      }

      if (!shouldExecute) continue;
    }

    try {
      const execution = await executeWorkflow(businessId, workflow.id, triggerData);
      results.push({ workflowId: workflow.id, workflowName: workflow.name, execution });
    } catch (err: any) {
      console.error(`[Workflow] Failed to execute ${workflow.name}:`, err.message);
      results.push({ workflowId: workflow.id, workflowName: workflow.name, error: err.message });
    }
  }

  return results;
}

export { workflowEvents, interpolateTemplate };
