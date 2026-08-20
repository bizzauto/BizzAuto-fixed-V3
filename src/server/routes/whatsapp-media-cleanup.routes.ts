import { Router, Response } from 'express';
import { prisma } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import WhatsAppMediaCleanupService, { MEDIA_RETENTION_DAYS } from '../services/whatsapp-media-cleanup.service.js';

const router = Router();

router.use(authenticate);

// GET /api/whatsapp-media/cleanup/stats - Get cleanup stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await WhatsAppMediaCleanupService.getCleanupStats();
    
    res.json({
      success: true,
      data: {
        retentionDays: MEDIA_RETENTION_DAYS,
        warningDays: 85,
        ...stats,
        totalSizeFormatted: WhatsAppMediaCleanupService.formatSize(stats.totalSize),
        oldFilesSizeFormatted: WhatsAppMediaCleanupService.formatSize(stats.oldFilesSize)
      }
    });
  } catch (error: any) {
    console.error('Cleanup stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cleanup stats' });
  }
});

// GET /api/whatsapp-media/cleanup/pending - Get files pending deletion
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const { files, totalSize, canExport } = await WhatsAppMediaCleanupService.getFilesPendingDeletion(
      req.query.userId as string
    );
    
    res.json({
      success: true,
      data: {
        files,
        totalSize,
        totalSizeFormatted: WhatsAppMediaCleanupService.formatSize(totalSize),
        canExport
      }
    });
  } catch (error: any) {
    console.error('Pending files error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending files' });
  }
});

// GET /api/whatsapp-media/cleanup/users - Get user warnings
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const warnings = await WhatsAppMediaCleanupService.getUserWarnings();
    
    res.json({
      success: true,
      data: warnings
    });
  } catch (error: any) {
    console.error('User warnings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user warnings' });
  }
});

// POST /api/whatsapp-media/cleanup/warn-users - Send warnings to users
router.post('/warn-users', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const result = await WhatsAppMediaCleanupService.sendWarningsToUsers();
    
    res.json({
      success: true,
      message: `Sent ${result.sent} warnings`,
      data: result
    });
  } catch (error: any) {
    console.error('Send warnings error:', error);
    res.status(500).json({ success: false, error: 'Failed to send warnings' });
  }
});

// POST /api/whatsapp-media/cleanup/export - Export files before deletion
router.post('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { fileIds, format = 'json' } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({ success: false, error: 'fileIds array required' });
    }

    const exportData = await WhatsAppMediaCleanupService.exportFilesForUser(
      fileIds,
      req.user.id,
      format
    );

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="whatsapp-media-export-${Date.now()}.json"`);
      return res.send(exportData);
    }

    if (format === 'csv') {
      const stats = await WhatsAppMediaCleanupService.getCleanupStats();
      const files = stats.filesToDelete.filter(f => fileIds.includes(f.id));
      const csv = WhatsAppMediaCleanupService.generateCSV(files);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="whatsapp-media-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData });
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export files' });
  }
});

// DELETE /api/whatsapp-media/cleanup - Delete files with admin permission
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { fileIds, reason } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({ success: false, error: 'fileIds array required' });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deletion reason required (minimum 10 characters)' 
      });
    }

    // Require explicit confirmation
    if (!req.body.confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deletion not confirmed. Set confirmed: true to proceed.',
        warning: `${fileIds.length} files will be permanently deleted. This action cannot be undone.`
      });
    }

    const result = await WhatsAppMediaCleanupService.deleteFilesWithPermission(
      fileIds,
      req.user.id,
      reason
    );

    res.json({
      success: true,
      message: `Deleted ${result.deleted} files, ${result.failed} failed. Freed ${WhatsAppMediaCleanupService.formatSize(result.freedSpace)}`,
      data: result
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete files' });
  }
});

// GET /api/whatsapp-media/cleanup/cleanup-trigger - Trigger cleanup scan (for cron)
router.post('/cleanup-trigger', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await WhatsAppMediaCleanupService.runScheduledCleanup();
    
    res.json({ success: true, message: 'Cleanup scan completed' });
  } catch (error: any) {
    console.error('Cleanup trigger error:', error);
    res.status(500).json({ success: false, error: 'Failed to run cleanup' });
  }
});

export default router;