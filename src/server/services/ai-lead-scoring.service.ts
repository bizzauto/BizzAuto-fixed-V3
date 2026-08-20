import { prisma } from '../db.js';
import { AIService } from './ai.service.js';

interface ScoringFactors {
  digitalPresenceGap: number;  // 0-30
  businessCategory: number;    // 0-20
  locationTier: number;        // 0-20
  reviewActivity: number;      // 0-15
  phoneValidity: number;       // 0-15
}

export class AiLeadScoringService {
  static async scoreContact(contactId: string, businessId: string): Promise<{
    score: number;
    category: string;
    factors: ScoringFactors;
    reasons: string[];
    aiAnalysis?: string;
  }> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { leadScores: true },
    });

    if (!contact) throw new Error('Contact not found');

    const factors = this.calculateFactors(contact);
    const totalScore = Math.min(100, Object.values(factors).reduce((a, b) => a + b, 0));
    const category = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';

    const reasons = this.generateReasons(factors, contact);

    // Try AI analysis for hot leads
    let aiAnalysis: string | undefined;
    if (totalScore >= 70) {
      try {
        aiAnalysis = await AIService.generateText(
          `Analyze this business lead for digital marketing outreach:\n` +
          `Business: ${contact.name}\n` +
          `Phone: ${contact.phone || 'N/A'}\n` +
          `City: ${contact.city || 'N/A'}\n` +
          `Current digital presence gaps: ${reasons.join(', ')}\n` +
          `Score: ${totalScore}/100 (${category})\n\n` +
          `Provide a brief 2-3 sentence assessment of why this business needs digital marketing services and what pitch would work best.`,
          { maxTokens: 200, temperature: 0.6 }
        );
      } catch {
        // AI analysis is optional
      }
    }

    // Upsert lead score
    await prisma.leadScore.upsert({
      where: { businessId_contactId: { businessId, contactId } },
      update: {
        score: totalScore,
        category,
        factors: Object.entries(factors).map(([k, v]) => ({ factor: k, points: v })),
        engagementScore: factors.reviewActivity,
        recencyScore: 100,
        intentScore: factors.digitalPresenceGap,
        fitScore: factors.businessCategory + factors.locationTier,
        aiModel: 'lead_finder_v1',
        aiConfidence: aiAnalysis ? 0.9 : 0.7,
        reasons: { reasons, aiAnalysis },
        lastScoredAt: new Date(),
      },
      create: {
        businessId,
        contactId,
        score: totalScore,
        category,
        factors: Object.entries(factors).map(([k, v]) => ({ factor: k, points: v })),
        engagementScore: factors.reviewActivity,
        recencyScore: 100,
        intentScore: factors.digitalPresenceGap,
        fitScore: factors.businessCategory + factors.locationTier,
        aiModel: 'lead_finder_v1',
        aiConfidence: aiAnalysis ? 0.9 : 0.7,
        reasons: { reasons, aiAnalysis },
        lastScoredAt: new Date(),
      },
    });

    return { score: totalScore, category, factors, reasons, aiAnalysis };
  }

  static async bulkScore(businessId: string, contactIds?: string[]): Promise<{
    scored: number;
    hot: number;
    warm: number;
    cold: number;
  }> {
    const where: any = { businessId, source: 'lead_finder' };
    if (contactIds?.length) where.id = { in: contactIds };

    const contacts = await prisma.contact.findMany({ where, take: 100 });
    let hot = 0, warm = 0, cold = 0;

    for (const contact of contacts) {
      const result = await this.scoreContact(contact.id, businessId);
      if (result.category === 'hot') hot++;
      else if (result.category === 'warm') warm++;
      else cold++;
    }

    return { scored: contacts.length, hot, warm, cold };
  }

  private static calculateFactors(contact: any): ScoringFactors {
    const data = (contact.leadFinderData as any) || {};
    const metadata = (contact.metadata as any) || {};

    return {
      digitalPresenceGap: this.scoreDigitalPresenceGap(data),
      businessCategory: this.scoreBusinessCategory(data.types || []),
      locationTier: this.scoreLocationTier(contact.city || ''),
      reviewActivity: this.scoreReviewActivity(metadata.reviews || 0, metadata.rating || 0),
      phoneValidity: contact.phone && contact.phone.length >= 10 ? 15 : 0,
    };
  }

  private static scoreDigitalPresenceGap(data: any): number {
    let score = 0;
    if (!data.website) score += 30;
    if (!data.socialMedia?.facebook) score += 10;
    if (!data.socialMedia?.instagram) score += 10;
    return Math.min(30, score);
  }

  private static scoreBusinessCategory(types: string[]): number {
    const highValue = ['restaurant', 'doctor', 'lawyer', 'real_estate_agent', 'insurance_agency', 'financial_planner', 'dentist', 'gym', 'beauty_salon', 'spa'];
    const match = types.some(t => highValue.includes(t));
    return match ? 20 : 10;
  }

  private static scoreLocationTier(city: string): number {
    const metros = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'jaipur'];
    if (metros.some(m => city.toLowerCase().includes(m))) return 20;
    return 12; // Tier 2/3 cities are actually better leads (less competition)
  }

  private static scoreReviewActivity(reviews: number, rating: number): number {
    let score = 0;
    if (reviews > 50) score += 10;
    else if (reviews > 10) score += 7;
    else if (reviews > 0) score += 3;
    if (rating >= 4.0) score += 5;
    return Math.min(15, score);
  }

  private static generateReasons(factors: ScoringFactors, contact: any): string[] {
    const reasons: string[] = [];
    if (factors.digitalPresenceGap >= 20) reasons.push('Weak digital presence — high conversion potential');
    if (factors.businessCategory >= 15) reasons.push('High-value business category');
    if (factors.locationTier >= 15) reasons.push('Located in key market area');
    if (factors.reviewActivity >= 10) reasons.push('Active customer base with reviews');
    if (factors.phoneValidity >= 15) reasons.push('Valid phone number available');
    if (factors.digitalPresenceGap < 10) reasons.push('Already has some digital presence');
    return reasons;
  }
}
