import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads with business-scoped subdirectory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const businessId = (req as any).user?.businessId || 'unknown';
    const dir = `uploads/${businessId}`;
    import('fs').then(fs => {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    }).catch(() => cb(null, 'uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG) and PDFs are allowed'));
    }
  }
});

// Submit admission form
router.post('/submit', authenticate, upload.fields([
  { name: 'logoFile', maxCount: 1 },
  { name: 'businessRegistrationFile', maxCount: 1 }
]), async (req: any, res: any) => {
  try {
    const businessId = req.user.businessId;
    
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID not found' });
    }

    // Parse marketing channels from JSON string
    let marketingChannels: string[] = [];
    try {
      marketingChannels = JSON.parse(req.body.currentMarketingChannels || '[]');
    } catch {
      marketingChannels = [];
    }

    // Get uploaded file paths
    const files = req.files as any;
    const logoUrl = files?.logoFile?.[0]?.filename || null;
    const businessRegUrl = files?.businessRegistrationFile?.[0]?.filename || null;

    // Save admission data to business
    const admissionData = {
      admissionCompleted: true,
      // Personal Info
      address: req.body.address || null,
      city: req.body.city || null,
      state: req.body.state || null,
      country: req.body.country || 'India',
      // Business Details
      website: req.body.businessWebsite || null,
      logoUrl: logoUrl,
      // Additional business info stored in brandColors JSON
      brandColors: {
        businessCategory: req.body.businessCategory || null,
        gstNumber: req.body.gstNumber || null,
        panNumber: req.body.panNumber || null,
        businessDescription: req.body.businessDescription || null,
        yearEstablished: req.body.yearEstablished || null,
        employeeCount: req.body.employeeCount || null,
        annualRevenue: req.body.annualRevenue || null,
        alternatePhone: req.body.alternatePhone || null,
        // Contact Person
        contactPerson: {
          name: req.body.contactPersonName || null,
          designation: req.body.contactPersonDesignation || null,
          email: req.body.contactPersonEmail || null,
          phone: req.body.contactPersonPhone || null,
        },
        // Bank Details
        bankDetails: {
          bankName: req.body.bankName || null,
          accountNumber: req.body.accountNumber || null,
          ifscCode: req.body.ifscCode || null,
          accountHolderName: req.body.accountHolderName || null,
        },
        // Social Media
        socialMedia: {
          facebook: req.body.facebookUrl || null,
          instagram: req.body.instagramUrl || null,
          linkedin: req.body.linkedinUrl || null,
          twitter: req.body.twitterUrl || null,
          youtube: req.body.youtubeUrl || null,
        },
        // Marketing
        primaryGoal: req.body.primaryGoal || null,
        monthlyBudget: req.body.monthlyBudget || null,
        targetAudience: req.body.targetAudience || null,
        currentMarketingChannels: marketingChannels,
        // Agreement
        agreeTerms: req.body.agreeTerms === 'true',
        agreePrivacy: req.body.agreePrivacy === 'true',
        agreeMarketing: req.body.agreeMarketing === 'true',
        // Document
        businessRegistrationUrl: businessRegUrl,
      }
    };

    // Update business with admission data
    await prisma.business.update({
      where: { id: businessId },
      data: admissionData,
    });

    // Update user name if provided
    if (req.body.fullName) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { 
          name: req.body.fullName,
          phone: req.body.phone || undefined,
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Admission form submitted successfully',
        admissionCompleted: true,
      }
    });
  } catch (error: any) {
    console.error('Admission form submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit admission form',
      details: error.message 
    });
  }
});

// Get admission form status
router.get('/status', authenticate, async (req: any, res: any) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user.businessId },
      select: { admissionCompleted: true },
    });

    res.json({
      success: true,
      data: {
        admissionCompleted: business?.admissionCompleted || false,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to check admission status' });
  }
});

export default router;
