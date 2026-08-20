import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { UploadService } from '../services/upload.service.js';
import { qs } from '../utils/query.js';

const router = Router();

// Multer configuration — store files in memory for processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max (individual file categories have stricter limits)
    files: 10, // Max 10 files per request
  },
});

/**
 * POST /api/upload — Upload one or more files
 * Expects multipart/form-data with:
 *   - file(s) field named "file" (single) or "files" (multiple)
 *   - category: string (avatar, product, poster, document, social, general)
 *   - entityType: string (optional)
 *   - entityId: string (optional)
 */
router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const businessId = req.user.businessId;
      const userId = req.user.id;
      const category = (req.body.category as string) || 'general';
      const entityType = req.body.entityType as string | undefined;
      const entityId = req.body.entityId as string | undefined;

      // Collect all file buffers from multer
      const singleFile = (req.files as any)?.['file']?.[0];
      const multiFiles = (req.files as any)?.['files'] || [];
      const allFiles: Express.Multer.File[] = [];

      if (singleFile) allFiles.push(singleFile);
      allFiles.push(...multiFiles);

      if (allFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No file provided. Send a file with field name "file" or "files".',
        });
      }

      const results = [];
      const errors: { name: string; error: string }[] = [];

      for (const file of allFiles) {
        try {
          const uploadRecord = await UploadService.uploadFile(
            businessId,
            userId,
            file,
            category,
            { entityType, entityId }
          );
          results.push(uploadRecord);
        } catch (err: any) {
          errors.push({
            name: file.originalname,
            error: err.message,
          });
        }
      }

      res.status(results.length > 0 ? 201 : 400).json({
        success: results.length > 0,
        data: {
          uploads: results,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `${results.length} file(s) uploaded successfully${errors.length ? `, ${errors.length} failed` : ''}`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Upload failed',
      });
    }
  }
);

/**
 * GET /api/upload — List uploaded files
 * Query params: page, limit, category, entityType, entityId
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const { page, limit, category, entityType, entityId } = req.query;

    const result = await UploadService.listUploads(businessId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string | undefined,
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('List uploads error:', error);
    res.status(500).json({ success: false, error: 'Failed to list uploads' });
  }
});

/**
 * DELETE /api/upload/:id — Delete a file
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const result = await UploadService.deleteFile(qs(req.params.id), businessId);
    res.json(result);
  } catch (error: any) {
    console.error('Delete upload error:', error);
    res.status(404).json({ success: false, error: error.message || 'Upload not found' });
  }
});

/**
 * GET /api/upload/stats — Get storage stats for the business
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await UploadService.getStorageStats(req.user.businessId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Upload stats error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to get storage stats' });
  }
});

export default router;
