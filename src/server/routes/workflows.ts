import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createWorkflowSchema, updateWorkflowSchema } from '../validations/crm-schemas.js';

const router = Router();

// Get all workflows
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      businessId: req.user.businessId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { executions: true },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        workflows,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
      details: error.message,
    });
  }
});

// Get single workflow with nodes and edges
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow',
      details: error.message,
    });
  }
});

// Create workflow
router.post('/', authenticate, requireRole('OWNER', 'ADMIN'), validate(createWorkflowSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, triggerType, triggerConfig, nodes, edges } = req.body;

    if (!name || !triggerType) {
      return res.status(400).json({
        success: false,
        error: 'Name and trigger type are required',
      });
    }

    const validTriggerTypes = [
      'message_received',
      'lead_created',
      'appointment_booked',
      'form_subscribed',
      'tag_added',
      'deal_stage_changed',
      'manual',
    ];

    if (!validTriggerTypes.includes(triggerType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`,
      });
    }

    const workflow = await prisma.workflow.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig || {},
        nodes: nodes || [],
        edges: edges || [],
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
      details: error.message,
    });
  }
});

// Update workflow
router.put('/:id', authenticate, requireRole('OWNER', 'ADMIN'), validate(updateWorkflowSchema), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const { name, description, nodes, edges, triggerType, triggerConfig } = req.body;

    if (triggerType) {
      const validTriggerTypes = [
        'message_received',
        'lead_created',
        'appointment_booked',
        'form_subscribed',
        'tag_added',
        'deal_stage_changed',
        'manual',
      ];

      if (!validTriggerTypes.includes(triggerType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}`,
        });
      }
    }

    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow',
      details: error.message,
    });
  }
});

// Toggle workflow active state
router.patch('/:id/toggle', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: { isActive: !workflow.isActive },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Toggle workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle workflow',
      details: error.message,
    });
  }
});

// Delete workflow
router.delete('/:id', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    if (workflow.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete an active workflow. Deactivate it first.',
      });
    }

    await prisma.workflow.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow',
      details: error.message,
    });
  }
});

// Execute workflow manually — REAL execution engine
router.post('/:id/run', authenticate, requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { executeWorkflow } = await import('../services/workflow-execution.service.js');
    const result = await executeWorkflow(req.user.businessId, req.params.id, req.body.triggerData || { source: 'manual', triggeredBy: req.user.id });

    res.json({
      success: true,
      data: {
        execution: result,
        nodeResults: result.nodeResults,
      },
    });
  } catch (error: any) {
    console.error('Run workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to run workflow', details: error.message });
  }
});

// Get workflow execution history
router.get('/:id/runs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId: workflow.id },
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.workflowExecution.count({
        where: { workflowId: workflow.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        executions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Get workflow runs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow runs',
      details: error.message,
    });
  }
});

// Get single execution details
router.get('/executions/:executionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: req.params.executionId,
        businessId: req.user.businessId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            triggerType: true,
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    console.error('Get execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution details',
      details: error.message,
    });
  }
});

// Execute workflow by trigger type — REAL execution engine
router.post('/execute', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, triggerType, triggerData } = req.body;

    if (!businessId || !triggerType) {
      return res.status(400).json({ success: false, error: 'Business ID and trigger type are required' });
    }

    const { triggerWorkflows } = await import('../services/workflow-execution.service.js');
    const results = await triggerWorkflows(businessId, triggerType, triggerData || { source: 'trigger', triggerType });

    res.json({
      success: true,
      data: {
        executionsCreated: results.length,
        executions: results,
      },
    });
  } catch (error: any) {
    console.error('Execute workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to execute workflows', details: error.message });
  }
});

// Simulate output for different node types
function simulateNodeOutput(nodeType: string, data?: any): any {
  switch (nodeType) {
    case 'trigger':
      return { triggered: true, timestamp: new Date().toISOString() };
    case 'condition':
      return { evaluated: true, result: true, path: 'true' };
    case 'action':
      return { executed: true, action: data?.action || 'default_action' };
    case 'send_message':
      return { sent: true, to: data?.recipient || 'contact', message: data?.message || 'Template message' };
    case 'send_email':
      return { sent: true, to: data?.email || 'user@example.com', subject: data?.subject || 'Email sent' };
    case 'update_contact':
      return { updated: true, fields: data?.fields || {} };
    case 'add_tag':
      return { tagged: true, tags: data?.tags || [] };
    case 'remove_tag':
      return { untagged: true, tags: data?.tags || [] };
    case 'wait':
      return { waited: true, duration: data?.duration || '1h' };
    case 'webhook':
      return { called: true, url: data?.url || 'https://example.com/webhook', status: 200 };
    case 'delay':
      return { delayed: true, duration: data?.duration || '1h' };
    case 'create_deal':
      return { created: true, dealTitle: data?.title || 'New Deal' };
    case 'move_deal':
      return { moved: true, stage: data?.stage || 'qualification' };
    case 'notify_team':
      return { notified: true, team: data?.team || 'sales' };
    case 'ai_response':
      return { generated: true, model: data?.model || 'default', response: 'AI processed' };
    default:
      return { processed: true, type: nodeType };
  }
}

export default router;
