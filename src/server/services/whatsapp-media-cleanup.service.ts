import { prisma } from '../db.js';
import path from 'path';
import fs from 'fs';

const MEDIA_RETENTION_DAYS = 90;
const WARNING_DAYS = 85;

interface MediaFile {
  id: string;
  filename: string;
  filepath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  ageInDays: number;
  uploadedBy?: string;
  chatId?: string;
  downloadUrl?: string;
}

interface CleanupStats {
  totalFiles: number;
  oldFiles: number;
  totalSize: number;
  oldFilesSize: number;
  filesToDelete: MediaFile[];
  warnings: MediaFile[];
}

interface UserWarning {
  userId: string;
  userName: string;
  email: string;
  filesCount: number;
  totalSize: number;
  oldestFileDate: Date;
  lastWarningSent: Date;
}

interface ExportData {
  exportedAt: Date;
  userId: string;
  businessId: string;
  totalFiles: number;
  totalSize: number;
  format: 'csv' | 'json' | 'zip';
  files: {
    filename: string;
    size: number;
    createdAt: string;
    type: string;
    downloadUrl: string;
  }[];
  metadata: {
    retentionDays: number;
    exportReason: string;
    exportedBy: string;
  };
}

class WhatsAppMediaCleanupService {
  
  /**
   * Export files before deletion (user can download)
   */
  static async exportFilesForUser(
    fileIds: string[],
    userId: string,
    format: 'csv' | 'json' | 'zip'
  ): Promise<ExportData> {
    const stats = await this.getCleanupStats();
    
    // Get user's files (files that belong to this user or all files if admin)
    const userFiles = stats.filesToDelete.filter(f => 
      fileIds.includes(f.id) || fileIds.includes('all')
    );

    const exportData: ExportData = {
      exportedAt: new Date(),
      userId,
      businessId: '',
      totalFiles: userFiles.length,
      totalSize: userFiles.reduce((sum, f) => sum + f.fileSize, 0),
      format,
      files: userFiles.map(f => ({
        filename: f.filename,
        size: f.fileSize,
        createdAt: f.createdAt.toISOString(),
        type: f.mimeType,
        downloadUrl: `/api/whatsapp-media/download/${f.id}`
      })),
      metadata: {
        retentionDays: MEDIA_RETENTION_DAYS,
        exportReason: 'Pre-deletion backup',
        exportedBy: userId
      }
    };

    // Log export action
    await prisma.auditLog.create({
      data: {
        action: 'WHATSAPP_MEDIA_EXPORTED',
        userId: userId as any,
        details: {
          fileCount: userFiles.length,
          format,
          totalSize: exportData.totalSize
        }
      } as any
    });

    return exportData;
  }

  /**
   * Generate CSV export
   */
  static generateCSV(files: MediaFile[]): string {
    const headers = ['Filename', 'Size (bytes)', 'Size (MB)', 'Type', 'Created Date', 'Age (Days)'];
    const rows = files.map(f => [
      f.filename,
      f.fileSize.toString(),
      (f.fileSize / (1024 * 1024)).toFixed(2),
      f.mimeType,
      f.createdAt.toISOString(),
      f.ageInDays.toString()
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
  }

  /**
   * Generate JSON export
   */
  static generateJSON(files: MediaFile[]): string {
    const exportObj = {
      exportedAt: new Date().toISOString(),
      retentionPolicy: {
        retentionDays: MEDIA_RETENTION_DAYS,
        warningDays: WARNING_DAYS
      },
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
      files: files.map(f => ({
        filename: f.filename,
        size: f.fileSize,
        sizeFormatted: this.formatSize(f.fileSize),
        mimeType: f.mimeType,
        createdAt: f.createdAt.toISOString(),
        ageInDays: f.ageInDays
      }))
    };

    return JSON.stringify(exportObj, null, 2);
  }

  /**
   * Get files pending deletion with export info
   */
  static async getFilesPendingDeletion(userId?: string): Promise<{
    files: MediaFile[];
    totalSize: number;
    canExport: boolean;
  }> {
    const stats = await this.getCleanupStats();
    
    let files = stats.filesToDelete;
    
    // If userId provided, filter by user's files
    if (userId) {
      files = files.filter(f => f.filepath.includes(userId));
    }

    return {
      files,
      totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
      canExport: files.length > 0
    };
  }
  
  /**
   * Scan WhatsApp media files and get cleanup stats
   */
  static async getCleanupStats(): Promise<CleanupStats> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'whatsapp');
    
    // Create directory if not exists
    if (!fs.existsSync(uploadsDir)) {
      return {
        totalFiles: 0,
        oldFiles: 0,
        totalSize: 0,
        oldFilesSize: 0,
        filesToDelete: [],
        warnings: []
      };
    }

    const files: MediaFile[] = [];
    const now = new Date();
    const oldFiles: MediaFile[] = [];

    // Recursive scan of uploads directory
    this.scanDirectory(uploadsDir, now, files, oldFiles);

    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const oldFilesSize = oldFiles.reduce((sum, f) => sum + f.fileSize, 0);

    return {
      totalFiles: files.length,
      oldFiles: oldFiles.length,
      totalSize,
      oldFilesSize,
      filesToDelete: oldFiles,
      warnings: oldFiles.filter(f => f.ageInDays >= WARNING_DAYS && f.ageInDays < MEDIA_RETENTION_DAYS)
    };
  }

  private static scanDirectory(dir: string, now: Date, allFiles: MediaFile[], oldFiles: MediaFile[]) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.scanDirectory(fullPath, now, allFiles, oldFiles);
      } else {
        // Check if it's a media file
        const ext = path.extname(item).toLowerCase();
        const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.pdf', '.ogg', '.opus', '.webp', '.doc', '.docx'];
        
        if (mediaExtensions.includes(ext)) {
          const ageInDays = Math.floor((now.getTime() - stat.mtime.getTime()) / (1000 * 60 * 60 * 24));
          
          const mediaFile: MediaFile = {
            id: this.generateFileId(fullPath),
            filename: item,
            filepath: fullPath,
            fileSize: stat.size,
            mimeType: this.getMimeType(ext),
            createdAt: stat.mtime,
            ageInDays
          };

          allFiles.push(mediaFile);
          
          if (ageInDays >= MEDIA_RETENTION_DAYS) {
            oldFiles.push(mediaFile);
          }
        }
      }
    }
  }

  private static generateFileId(filepath: string): string {
    return Buffer.from(filepath).toString('base64').substring(0, 20);
  }

  private static getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get user-wise warning data
   */
  static async getUserWarnings(): Promise<UserWarning[]> {
    // This would integrate with user data
    // For now, return mock structure
    const stats = await this.getCleanupStats();
    
    if (stats.filesToDelete.length === 0) return [];

    // Group files by potential user (based on filepath)
    const userGroups = new Map<string, MediaFile[]>();
    
    for (const file of stats.filesToDelete) {
      // Extract user identifier from path
      // Path format: uploads/whatsapp/{userId}/...
      const parts = file.filepath.split(path.sep);
      const userId = parts[3] || 'unknown';
      
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId)!.push(file);
    }

    const warnings: UserWarning[] = [];
    
    for (const [userId, files] of userGroups) {
      warnings.push({
        userId,
        userName: this.maskUserName(userId),
        email: 'user@bizzauto.com',
        filesCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.fileSize, 0),
        oldestFileDate: files.reduce((oldest, f) => f.createdAt < oldest ? f.createdAt : oldest, files[0].createdAt),
        lastWarningSent: new Date()
      });
    }

    return warnings.sort((a, b) => b.filesCount - a.filesCount);
  }

  private static maskUserName(userId: string): string {
    if (userId.length <= 4) return '***' + userId;
    return userId.substring(0, 2) + '***' + userId.substring(userId.length - 2);
  }

  /**
   * Send warning to users about old files
   */
  static async sendWarningsToUsers(): Promise<{ sent: number }> {
    const warnings = await this.getUserWarnings();
    let sent = 0;

    for (const warning of warnings) {
      if (warning.filesCount > 0) {
        // In production, this would:
        // 1. Save warning to database
        // 2. Send email/notification
        // 3. Show in-app notification
        
        await prisma.notification.create({
          data: {
            userId: warning.userId as any,
            title: '📁 WhatsApp Media Cleanup Warning',
            message: `Aapke ${warning.filesCount} WhatsApp media files ${MEDIA_RETENTION_DAYS} din purane hain. Admin approval ke baad delete ho jayenge.`,
            type: 'warning',
            isRead: false
          }
        });
        sent++;
      }
    }

    return { sent };
  }

  /**
   * Get files pending deletion (90+ days old)
   */
  static async getPendingDeletionFiles(): Promise<MediaFile[]> {
    const stats = await this.getCleanupStats();
    return stats.filesToDelete;
  }

  /**
   * Delete files with admin permission
   */
  static async deleteFilesWithPermission(
    fileIds: string[],
    adminUserId: string,
    reason: string
  ): Promise<{ deleted: number; failed: number; freedSpace: number }> {
    const stats = await this.getCleanupStats();
    let deleted = 0;
    let failed = 0;
    let freedSpace = 0;

    // Log admin action
    console.log(`[MediaCleanup] Admin ${adminUserId} approved deletion of ${fileIds.length} files. Reason: ${reason}`);

    for (const fileId of fileIds) {
      // Find file by ID
      const file = stats.filesToDelete.find(f => f.id === fileId);
      
      if (!file) {
        failed++;
        continue;
      }

      try {
        // Check if file exists
        if (fs.existsSync(file.filepath)) {
          // Delete the file
          fs.unlinkSync(file.filepath);
          
          // Remove empty parent directories
          this.removeEmptyDirectories(path.dirname(file.filepath));
          
          deleted++;
          freedSpace += file.fileSize;

          // Log deletion
          await prisma.auditLog.create({
            data: {
              action: 'WHATSAPP_MEDIA_DELETED',
              userId: adminUserId as any,
              details: {
                filename: file.filename,
                filepath: file.filepath,
                fileSize: file.fileSize,
                ageInDays: file.ageInDays,
                reason
              }
            } as any
          });
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[MediaCleanup] Failed to delete ${file.filepath}:`, error);
        failed++;
      }
    }

    return { deleted, failed, freedSpace };
  }

  private static removeEmptyDirectories(dir: string) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    // If directory is empty, delete it
    if (items.length === 0) {
      fs.rmdirSync(dir);
      
      // Recursively check parent
      const parent = path.dirname(dir);
      if (parent.includes('uploads/whatsapp')) {
        this.removeEmptyDirectories(parent);
      }
    }
  }

  /**
   * Schedule weekly cleanup check (for cron/worker)
   */
  static async runScheduledCleanup(): Promise<void> {
    const stats = await this.getCleanupStats();
    
    console.log(`[MediaCleanup] Scheduled scan: ${stats.totalFiles} total, ${stats.oldFiles} old (${stats.oldFilesSize} bytes)`);

    // Send warnings for files approaching 90 days
    if (stats.warnings.length > 0) {
      await this.sendWarningsToUsers();
      console.log(`[MediaCleanup] Sent ${stats.warnings.length} warnings`);
    }

    // Log stats for monitoring
    if (stats.oldFiles > 0) {
      console.log(`[MediaCleanup] WARNING: ${stats.oldFiles} files pending deletion (admin approval required)`);
    }
  }

  /**
   * Format file size for display
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

export default WhatsAppMediaCleanupService;
export { MEDIA_RETENTION_DAYS, WARNING_DAYS };