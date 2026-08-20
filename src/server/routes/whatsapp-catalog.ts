import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== LIST CATALOG PRODUCTS ====================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', category, availability, isActive, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { businessId: req.user.businessId };

    if (category) where.category = category;
    if (availability) where.availability = availability;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.whatsAppCatalog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.whatsAppCatalog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CATALOG STATS ====================

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const [totalProducts, activeProducts, outOfStock, inStock, preorder, byCategory] = await Promise.all([
      prisma.whatsAppCatalog.count({ where: { businessId } }),
      prisma.whatsAppCatalog.count({ where: { businessId, isActive: true } }),
      prisma.whatsAppCatalog.count({ where: { businessId, availability: 'out_of_stock' } }),
      prisma.whatsAppCatalog.count({ where: { businessId, availability: 'in_stock' } }),
      prisma.whatsAppCatalog.count({ where: { businessId, availability: 'preorder' } }),
      prisma.whatsAppCatalog.groupBy({
        by: ['category'],
        where: { businessId },
        _count: { id: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        availability: {
          inStock,
          outOfStock,
          preorder,
        },
        byCategory: byCategory.map((c) => ({
          category: c.category || 'Uncategorized',
          count: c._count.id,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET PRODUCT DETAILS ====================

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.whatsAppCatalog.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Catalog product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADD PRODUCT TO CATALOG ====================

router.post('/', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, currency, imageUrl, category, availability, link, productId } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const product = await prisma.whatsAppCatalog.create({
      data: {
        businessId: req.user.businessId,
        name,
        description,
        price: parseFloat(price),
        currency: currency || 'INR',
        imageUrl,
        category,
        availability: availability || 'in_stock',
        link,
        productId,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== UPDATE CATALOG PRODUCT ====================

router.put('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.whatsAppCatalog.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Catalog product not found' });
    }

    const { name, description, price, currency, imageUrl, category, availability, link, isActive } = req.body;

    const product = await prisma.whatsAppCatalog.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(currency !== undefined && { currency }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(category !== undefined && { category }),
        ...(availability !== undefined && { availability }),
        ...(link !== undefined && { link }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REMOVE FROM CATALOG ====================

router.delete('/:id', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.whatsAppCatalog.findFirst({
      where: { id: req.params.id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Catalog product not found' });
    }

    await prisma.whatsAppCatalog.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Catalog product removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SYNC FROM ECOMMERCE ====================

router.post('/sync-from-ecommerce', requireRole('OWNER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;

    const ecommerceProducts = await prisma.product.findMany({
      where: { businessId, isActive: true },
    });

    if (ecommerceProducts.length === 0) {
      return res.json({
        success: true,
        data: { synced: 0, message: 'No active ecommerce products found to sync' },
      });
    }

    let synced = 0;
    let updated = 0;
    let skipped = 0;

    for (const product of ecommerceProducts) {
      const catalogData = {
        name: product.name,
        description: product.description,
        price: product.price,
        currency: 'INR',
        imageUrl: product.mainImage || (product.images as string[])?.[0] || null,
        category: product.category,
        availability: product.quantity > 0 ? 'in_stock' : 'out_of_stock',
        isActive: product.isActive,
      };

      const existingCatalog = await prisma.whatsAppCatalog.findFirst({
        where: { businessId, productId: product.id },
      });

      if (existingCatalog) {
        await prisma.whatsAppCatalog.update({
          where: { id: existingCatalog.id },
          data: catalogData,
        });
        updated++;
      } else {
        await prisma.whatsAppCatalog.create({
          data: {
            businessId,
            productId: product.id,
            ...catalogData,
          },
        });
        synced++;
      }
    }

    res.json({
      success: true,
      data: {
        synced,
        updated,
        skipped,
        total: ecommerceProducts.length,
        message: `Sync complete: ${synced} added, ${updated} updated`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
