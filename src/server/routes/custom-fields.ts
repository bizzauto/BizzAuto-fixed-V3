import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCustomFieldSchema } from '../validations/remaining-schemas.js';

const router = Router();

const VALID_TYPES = [
  'text', 'number', 'email', 'phone', 'date', 'datetime',
  'select', 'multi_select', 'radio', 'checkbox', 'textarea',
  'url', 'currency', 'file',
];

const VALID_ENTITY_TYPES = ['contact', 'lead', 'deal', 'appointment', 'order'];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Get fields for specific entity type (before /:id)
router.get('/entity/:entityType', authenticate, async (req: any, res: any) => {
  try {
    const { entityType } = req.params;
    const { isVisible } = req.query;

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    const where: any = {
      businessId: req.user.businessId,
      entityType,
    };

    if (isVisible !== undefined) {
      where.isVisible = isVisible === 'true';
    }

    const fields = await prisma.customField.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: fields,
    });
  } catch (error: any) {
    console.error('Get entity fields error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entity fields',
      details: error.message,
    });
  }
});

// Get field values for an entity (before /:id)
router.get('/entity/:entityType/:entityId', authenticate, async (req: any, res: any) => {
  try {
    const { entityType, entityId } = req.params;

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    // Get all visible custom fields for this entity type
    const fields = await prisma.customField.findMany({
      where: {
        businessId: req.user.businessId,
        entityType,
        isVisible: true,
      },
      orderBy: { order: 'asc' },
    });

    if (fields.length === 0) {
      return res.json({
        success: true,
        data: { fields: [], values: {} },
      });
    }

    // Fetch entity custom fields based on entity type
    let entityCustomFields: any = null;

    if (entityType === 'contact' || entityType === 'lead') {
      const contact = await prisma.contact.findFirst({
        where: {
          id: entityId,
          businessId: req.user.businessId,
        },
        select: { customFields: true },
      });
      entityCustomFields = contact?.customFields;
    } else if (entityType === 'deal') {
      entityCustomFields = null;
    } else if (entityType === 'appointment') {
      entityCustomFields = null;
    } else if (entityType === 'order') {
      entityCustomFields = null;
    }

    const values = (entityCustomFields as any) || {};

    res.json({
      success: true,
      data: { fields, values },
    });
  } catch (error: any) {
    console.error('Get entity field values error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch entity field values',
      details: error.message,
    });
  }
});

// Save field values for an entity (before /:id)
router.post('/entity/:entityType/values', authenticate, async (req: any, res: any) => {
  try {
    const { entityType } = req.params;
    const { entityId, values } = req.body;

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: 'Entity ID is required',
      });
    }

    if (!values || typeof values !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Values must be an object',
      });
    }

    // Validate field IDs belong to this business/entityType
    const fieldIds = Object.keys(values);
    if (fieldIds.length > 0) {
      const validFields = await prisma.customField.findMany({
        where: {
          id: { in: fieldIds },
          businessId: req.user.businessId,
          entityType,
        },
        select: { id: true },
      });

      const validIds = new Set(validFields.map((f) => f.id));
      const invalidIds = fieldIds.filter((id) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid field IDs for this entity type: ${invalidIds.join(', ')}`,
        });
      }

      // Validate required fields
      const requiredFields = await prisma.customField.findMany({
        where: {
          id: { in: fieldIds },
          businessId: req.user.businessId,
          entityType,
          isRequired: true,
        },
        select: { id: true, name: true },
      });

      for (const field of requiredFields) {
        const val = values[field.id];
        if (val === undefined || val === null || val === '') {
          return res.status(400).json({
            success: false,
            error: `Field "${field.name}" is required`,
          });
        }
      }
    }

    // Update the entity's customFields JSON
    let updated: any = null;

    if (entityType === 'contact' || entityType === 'lead') {
      const contact = await prisma.contact.findFirst({
        where: {
          id: entityId,
          businessId: req.user.businessId,
        },
      });

      if (!contact) {
        return res.status(404).json({ success: false, error: 'Entity not found' });
      }

      const existingValues = (contact.customFields as any) || {};
      updated = await prisma.contact.update({
        where: { id: entityId },
        data: {
          customFields: { ...existingValues, ...values },
        },
      });
    } else if (entityType === 'deal') {
      return res.status(400).json({ success: false, error: 'Custom fields for deals are not supported' });
    } else if (entityType === 'appointment') {
      return res.status(400).json({ success: false, error: 'Custom fields for appointments are not supported' });
    } else if (entityType === 'order') {
      return res.status(400).json({ success: false, error: 'Custom fields for orders are not supported' });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Save entity field values error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save entity field values',
      details: error.message,
    });
  }
});

// Reorder fields (before /:id)
router.put('/reorder', authenticate, async (req: any, res: any) => {
  try {
    const { fieldIds } = req.body;

    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fieldIds array is required',
      });
    }

    // Verify all fields belong to this business
    const fields = await prisma.customField.findMany({
      where: {
        id: { in: fieldIds },
        businessId: req.user.businessId,
      },
    });

    if (fields.length !== fieldIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some field IDs are invalid or do not belong to your business',
      });
    }

    // Update order in a transaction
    await prisma.$transaction(
      fieldIds.map((fieldId: string, index: number) =>
        prisma.customField.update({
          where: { id: fieldId },
          data: { order: index },
        })
      )
    );

    const reordered = await prisma.customField.findMany({
      where: {
        id: { in: fieldIds },
        businessId: req.user.businessId,
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: reordered,
    });
  } catch (error: any) {
    console.error('Reorder fields error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder fields',
      details: error.message,
    });
  }
});

// List all custom fields (filterable by entityType)
router.get('/', authenticate, async (req: any, res: any) => {
  try {
    const { entityType, isVisible, search } = req.query;

    const where: any = {
      businessId: req.user.businessId,
    };

    if (entityType) {
      if (!VALID_ENTITY_TYPES.includes(entityType as string)) {
        return res.status(400).json({
          success: false,
          error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
        });
      }
      where.entityType = entityType;
    }

    if (isVisible !== undefined) {
      where.isVisible = isVisible === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const fields = await prisma.customField.findMany({
      where,
      orderBy: [{ entityType: 'asc' }, { order: 'asc' }],
    });

    res.json({
      success: true,
      data: fields,
    });
  } catch (error: any) {
    console.error('Get custom fields error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom fields',
      details: error.message,
    });
  }
});

// Get single custom field
router.get('/:id', authenticate, async (req: any, res: any) => {
  try {
    const field = await prisma.customField.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found',
      });
    }

    res.json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    console.error('Get custom field error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom field',
      details: error.message,
    });
  }
});

// Create custom field
router.post('/', authenticate, validate(createCustomFieldSchema), async (req: any, res: any) => {
  try {
    const {
      name, type, entityType, options, validation,
      defaultValue, placeholder, helpText, isRequired, isVisible,
    } = req.body;

    if (!name || !type || !entityType) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and entityType are required',
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid field type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    // Validate options for select-type fields
    if (['select', 'multi_select', 'radio'].includes(type)) {
      if (!Array.isArray(options) || options.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Options array is required for ${type} fields`,
        });
      }
    }

    // Auto-generate slug from name
    let slug = generateSlug(name);

    // Check slug uniqueness within business + entityType
    const existing = await prisma.customField.findFirst({
      where: {
        businessId: req.user.businessId,
        entityType,
        slug,
      },
    });

    if (existing) {
      // Append number to make unique
      let counter = 1;
      while (true) {
        const candidateSlug = `${slug}-${counter}`;
        const conflict = await prisma.customField.findFirst({
          where: {
            businessId: req.user.businessId,
            entityType,
            slug: candidateSlug,
          },
        });
        if (!conflict) {
          slug = candidateSlug;
          break;
        }
        counter++;
      }
    }

    // Get next order value
    const maxOrder = await prisma.customField.aggregate({
      where: {
        businessId: req.user.businessId,
        entityType,
      },
      _max: { order: true },
    });

    const field = await prisma.customField.create({
      data: {
        businessId: req.user.businessId,
        name,
        slug,
        type,
        entityType,
        options: options || undefined,
        validation: validation || undefined,
        defaultValue: defaultValue || undefined,
        placeholder: placeholder || undefined,
        helpText: helpText || undefined,
        isRequired: isRequired || false,
        isVisible: isVisible !== false,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.status(201).json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    console.error('Create custom field error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom field',
      details: error.message,
    });
  }
});

// Update custom field
router.put('/:id', authenticate, async (req: any, res: any) => {
  try {
    const field = await prisma.customField.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found',
      });
    }

    const {
      name, type, entityType, options, validation,
      defaultValue, placeholder, helpText, isRequired, isVisible, order,
    } = req.body;

    // Validate type if being changed
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid field type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    // Validate entityType if being changed
    if (entityType && !VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      });
    }

    const fieldType = type || field.type;
    const fieldEntityType = entityType || field.entityType;

    // Validate options for select-type fields
    if (['select', 'multi_select', 'radio'].includes(fieldType)) {
      const fieldOptions = options || field.options;
      if (!Array.isArray(fieldOptions) || fieldOptions.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Options array is required for ${fieldType} fields`,
        });
      }
    }

    // Handle slug update if name changes
    let slug = field.slug;
    if (name && name !== field.name) {
      slug = generateSlug(name);

      const slugConflict = await prisma.customField.findFirst({
        where: {
          businessId: req.user.businessId,
          entityType: fieldEntityType,
          slug,
          id: { not: field.id },
        },
      });

      if (slugConflict) {
        let counter = 1;
        while (true) {
          const candidateSlug = `${slug}-${counter}`;
          const conflict = await prisma.customField.findFirst({
            where: {
              businessId: req.user.businessId,
              entityType: fieldEntityType,
              slug: candidateSlug,
              id: { not: field.id },
            },
          });
          if (!conflict) {
            slug = candidateSlug;
            break;
          }
          counter++;
        }
      }
    }

    const updated = await prisma.customField.update({
      where: { id: field.id },
      data: {
        ...(name && { name }),
        ...(slug !== field.slug && { slug }),
        ...(type && { type }),
        ...(entityType && { entityType }),
        ...(options !== undefined && { options }),
        ...(validation !== undefined && { validation }),
        ...(defaultValue !== undefined && { defaultValue }),
        ...(placeholder !== undefined && { placeholder }),
        ...(helpText !== undefined && { helpText }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isVisible !== undefined && { isVisible }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update custom field error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom field',
      details: error.message,
    });
  }
});

// Delete custom field
router.delete('/:id', authenticate, async (req: any, res: any) => {
  try {
    const field = await prisma.customField.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
    });

    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Custom field not found',
      });
    }

    await prisma.customField.delete({
      where: { id: field.id },
    });

    // Clean up: Remove field values from all entities of this type
    const cleanupWhere: any = { businessId: req.user.businessId };

    if (field.entityType === 'contact' || field.entityType === 'lead') {
      const contacts = await prisma.contact.findMany({
        where: cleanupWhere,
        select: { id: true, customFields: true },
      });

      for (const contact of contacts) {
        const cf = (contact.customFields as any) || {};
        if (cf[field.slug] !== undefined) {
          delete cf[field.slug];
          await prisma.contact.update({
            where: { id: contact.id },
            data: { customFields: cf },
          });
        }
      }
    } else if (field.entityType === 'deal') {
      // Deal model doesn't have customFields - skip cleanup
    } else if (field.entityType === 'appointment') {
      // Appointment model doesn't have customFields - skip cleanup
    } else if (field.entityType === 'order') {
      // Order model doesn't have customFields - skip cleanup
    }

    res.json({
      success: true,
      message: 'Custom field deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete custom field error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom field',
      details: error.message,
    });
  }
});

export default router;
