import { prisma } from '../db.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads are stored at project-root/uploads/businessId/category/
const UPLOADS_ROOT = path.join(__dirname, '..', '..', '..', 'uploads');

// Maximum file sizes per category (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  avatar: 2 * 1024 * 1024,     // 2 MB
  product: 10 * 1024 * 1024,   // 10 MB
  poster: 5 * 1024 * 1024,     // 5 MB
  document: 20 * 1024 * 1024,  // 20 MB
  social: 10 * 1024 * 1024,    // 10 MB
  general: 10 * 1024 * 1024,   // 10 MB
};

// Allowed MIME types per category
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  product: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  poster: ['image/jpeg', 'image/png', 'image/webp'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  social: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
  general: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4'],
};

// Storage limits per plan (in MB)
const PLAN_STORAGE_LIMITS: Record<string, number> = {
  FREE: 50,
  STARTER: 500,
  GROWTH: 1000,
  PRO: 5000,
  AGENCY: 50000,
  ENTERPRISE: 10000,
};

export class UploadService {
  /**
   * Upload a file and store it in the local filesystem
   */
  static async uploadFile(
    businessId: string,
    userId: string | undefined,
    file: Express.Multer.File,
    category: string = 'general',
    options?: {
      generateThumbnail?: boolean;
      entityType?: string;
      entityId?: string;
    }
  ) {
    // Validate category
    const validCategory = category || 'general';
    
    // Check if category is valid
    if (!MAX_FILE_SIZES[validCategory]) {
      throw new Error(`Invalid category: ${validCategory}. Valid categories: ${Object.keys(MAX_FILE_SIZES).join(', ')}`);
    }

    // Check file size against category limits
    const maxSize = MAX_FILE_SIZES[validCategory];
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File too large. Maximum size for ${validCategory} is ${maxMB}MB.`);
    }

    // Check MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[validCategory];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed for ${validCategory}. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Check business storage limit
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    const planStorageMB = PLAN_STORAGE_LIMITS[business.plan] || PLAN_STORAGE_LIMITS.FREE;
    const planStorageBytes = planStorageMB * 1024 * 1024;

    // Calculate current storage usage
    const storageAgg = await (prisma as any).upload.aggregate({
      where: { businessId },
      _sum: { size: true },
    });

    const currentUsageBytes = storageAgg._sum.size || 0;
    const newUsageBytes = currentUsageBytes + file.size;

    if (newUsageBytes > planStorageBytes) {
      const usedMB = Math.round(currentUsageBytes / (1024 * 1024));
      const limitMB = planStorageMB;
      throw new Error(
        `Storage limit reached. You've used ${usedMB}MB of ${limitMB}MB. ` +
        `Upgrade your plan to get more storage.`
      );
    }

    // Determine upload directory
    const uploadDir = path.join(UPLOADS_ROOT, businessId, validCategory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.originalname) || '.bin';
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Generate thumbnail for images
    let thumbnailUrl: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (file.mimetype.startsWith('image/') && options?.generateThumbnail !== false) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        // Generate thumbnail (300px max width)
        const thumbName = `thumb_${uniqueName}`;
        const thumbPath = path.join(uploadDir, thumbName);
        
        if (file.buffer.length < 50 * 1024 * 1024) { // Only thumbnail files < 50MB
          await sharp(file.buffer)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .toFile(thumbPath);
          thumbnailUrl = `/uploads/${businessId}/${validCategory}/${thumbName}`;
        }
      } catch {
        // Thumbnail generation is optional
      }
    }

    // Public URL for the file
    const url = `/uploads/${businessId}/${validCategory}/${uniqueName}`;

    // Save upload record in database
    const upload = await (prisma as any).upload.create({
      data: {
        businessId,
        userId: userId || null,
        originalName: file.originalname,
        fileName: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        url,
        category: validCategory,
        entityType: options?.entityType || null,
        entityId: options?.entityId || null,
        width,
        height,
        thumbnailUrl,
      },
    });

    return upload;
  }

  /**
   * Delete a file by its upload record
   */
  static async deleteFile(uploadId: string, businessId: string) {
    const upload = await (prisma as any).upload.findFirst({
      where: { id: uploadId, businessId },
    });

    if (!upload) {
      throw new Error('Upload not found');
    }

    // Delete file from disk
    try {
      if (fs.existsSync(upload.path)) {
        fs.unlinkSync(upload.path);
      }
      // Delete thumbnail
      if (upload.thumbnailUrl) {
        const dir = path.dirname(upload.path);
        const ext = path.extname(upload.path);
        const base = path.basename(upload.path, ext);
        const thumbPath = path.join(dir, `thumb_${base}${ext}`);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    } catch {
      // File deletion errors are non-critical
    }

    // Delete database record
    await (prisma as any).upload.delete({ where: { id: uploadId } });

    return { success: true };
  }

  /**
   * List uploads for a business with pagination
   */
  static async listUploads(
    businessId: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      entityType?: string;
      entityId?: string;
    } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (params.category) where.category = params.category;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;

    const [uploads, total] = await Promise.all([
      (prisma as any).upload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).upload.count({ where }),
    ]);

    return {
      uploads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get storage stats for a business
   */
  static async getStorageStats(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true },
    });

    if (!business) throw new Error('Business not found');

    const planStorageMB = PLAN_STORAGE_LIMITS[business.plan] || PLAN_STORAGE_LIMITS.FREE;
    const planStorageBytes = planStorageMB * 1024 * 1024;

    const [storageAgg, categoryAgg] = await Promise.all([
      (prisma as any).upload.aggregate({
        where: { businessId },
        _sum: { size: true },
        _count: true,
      }),
      (prisma as any).upload.groupBy({
        by: ['category'],
        where: { businessId },
        _sum: { size: true },
        _count: true,
      }),
    ]);

    const usedBytes = storageAgg._sum.size || 0;
    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const usagePercent = planStorageBytes > 0
      ? Math.round((usedBytes / planStorageBytes) * 100)
      : 0;

    const categoryBreakdown = categoryAgg.map(c => ({
      category: c.category,
      files: c._count,
      sizeMB: Math.round((c._sum.size || 0) / (1024 * 1024)),
    }));

    return {
      totalFiles: storageAgg._count,
      usedBytes,
      usedMB,
      limitMB: planStorageMB,
      usagePercent,
      categoryBreakdown,
    };
  }

  /**
   * Get storage limits for a plan
   */
  static getPlanStorageLimit(plan: string): number {
    return PLAN_STORAGE_LIMITS[plan] || PLAN_STORAGE_LIMITS.FREE;
  }
}
