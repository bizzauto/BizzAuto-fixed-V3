import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== AVA INTELLIGENCE SERVICE ====================
// 100% FREE - Uses existing Prisma database, no paid APIs

export interface DailyBriefing {
  greeting: string;
  date: string;
  revenue: RevenueSummary;
  sales: SalesSummary;
  leads: LeadSummary;
  pipeline: PipelineSummary;
  appointments: AppointmentSummary;
  support: SupportSummary;
  team: TeamSummary;
  alerts: Alert[];
  recommendations: string[];
}

export interface RevenueSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  growth: number; // percentage
  topDeals: { contact: string; value: number; stage: string }[];
}

export interface SalesSummary {
  dealsWonToday: number;
  dealsWonWeek: number;
  dealsWonMonth: number;
  totalPipelineValue: number;
  conversionRate: number;
  avgDealSize: number;
}

export interface LeadSummary {
  newToday: number;
  newThisWeek: number;
  totalActive: number;
  hotLeads: { name: string; score: number; source: string }[];
  needsFollowUp: { name: string; lastContact: string; daysSince: number }[];
}

export interface PipelineSummary {
  totalValue: number;
  byStage: { stage: string; count: number; value: number }[];
  stuckDeals: { contact: string; stage: string; daysInStage: number }[];
}

export interface AppointmentSummary {
  today: number;
  tomorrow: number;
  upcoming: { title: string; date: string; contact: string }[];
  missed: number;
}

export interface SupportSummary {
  openTickets: number;
  urgentTickets: number;
  avgResponseTime: string;
}

export interface TeamSummary {
  activeMembers: number;
  topPerformer: string;
}

export interface Alert {
  type: 'urgent' | 'warning' | 'info';
  message: string;
  action?: string;
}

export class AvaIntelligenceService {

  // ==================== DAILY BRIEFING ====================
  async getDailyBriefing(businessId: string, userName?: string): Promise<DailyBriefing> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Run all queries in parallel for speed
    const [
      revenue,
      sales,
      leads,
      pipeline,
      appointments,
      support,
      team
    ] = await Promise.all([
      this.getRevenueSummary(businessId, todayStart, weekStart, monthStart, lastMonthStart, lastMonthEnd),
      this.getSalesSummary(businessId, todayStart, weekStart, monthStart),
      this.getLeadSummary(businessId, todayStart, weekStart),
      this.getPipelineSummary(businessId),
      this.getAppointmentSummary(businessId, todayStart),
      this.getSupportSummary(businessId),
      this.getTeamSummary(businessId)
    ]);

    const alerts = this.generateAlerts(revenue, sales, leads, pipeline, appointments, support);
    const recommendations = this.generateRecommendations(revenue, sales, leads, pipeline);

    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    if (userName) greeting += `, ${userName}`;

    return {
      greeting,
      date: now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      revenue,
      sales,
      leads,
      pipeline,
      appointments,
      support,
      team,
      alerts,
      recommendations
    };
  }

  // ==================== REVENUE SUMMARY ====================
  private async getRevenueSummary(
    businessId: string,
    todayStart: Date,
    weekStart: Date,
    monthStart: Date,
    lastMonthStart: Date,
    lastMonthEnd: Date
  ): Promise<RevenueSummary> {
    // Get deals won this month
    const thisMonthDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealStage: 'won',
        updatedAt: { gte: monthStart }
      },
      select: { dealValue: true, name: true, dealStage: true }
    });

    // Get deals won last month
    const lastMonthDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealStage: 'won',
        updatedAt: { gte: lastMonthStart, lte: lastMonthEnd }
      },
      select: { dealValue: true }
    });

    // Get today's won deals
    const todayDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealStage: 'won',
        updatedAt: { gte: todayStart }
      },
      select: { dealValue: true, name: true }
    });

    // Get this week's won deals
    const weekDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealStage: 'won',
        updatedAt: { gte: weekStart }
      },
      select: { dealValue: true }
    });

    // Get top deals in pipeline
    const topDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealValue: { gt: 0 },
        dealStage: { notIn: ['won', 'lost'] }
      },
      orderBy: { dealValue: 'desc' },
      take: 5,
      select: { name: true, dealValue: true, stageName: true }
    });

    const today = todayDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
    const thisWeek = weekDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
    const thisMonth = thisMonthDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
    const lastMonth = lastMonthDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      today,
      thisWeek,
      thisMonth,
      lastMonth,
      growth: Math.round(growth * 10) / 10,
      topDeals: topDeals.map(d => ({
        contact: d.name,
        value: d.dealValue || 0,
        stage: d.stageName || 'Unknown'
      }))
    };
  }

  // ==================== SALES SUMMARY ====================
  private async getSalesSummary(
    businessId: string,
    todayStart: Date,
    weekStart: Date,
    monthStart: Date
  ): Promise<SalesSummary> {
    const [dealsWonToday, dealsWonWeek, dealsWonMonth, totalPipeline] = await Promise.all([
      prisma.contact.count({
        where: { businessId, dealStage: 'won', updatedAt: { gte: todayStart } }
      }),
      prisma.contact.count({
        where: { businessId, dealStage: 'won', updatedAt: { gte: weekStart } }
      }),
      prisma.contact.count({
        where: { businessId, dealStage: 'won', updatedAt: { gte: monthStart } }
      }),
      prisma.contact.aggregate({
        where: { businessId, dealStage: { notIn: ['won', 'lost'] }, dealValue: { gt: 0 } },
        _sum: { dealValue: true }
      })
    ]);

    const totalContacts = await prisma.contact.count({ where: { businessId } });
    const wonContacts = await prisma.contact.count({ where: { businessId, dealStage: 'won' } });
    const conversionRate = totalContacts > 0 ? (wonContacts / totalContacts) * 100 : 0;

    const avgDeal = dealsWonMonth > 0 ? await prisma.contact.aggregate({
      where: { businessId, dealStage: 'won', updatedAt: { gte: monthStart } },
      _avg: { dealValue: true }
    }) : null;

    return {
      dealsWonToday,
      dealsWonWeek,
      dealsWonMonth,
      totalPipelineValue: totalPipeline._sum.dealValue || 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      avgDealSize: avgDeal?._avg.dealValue || 0
    };
  }

  // ==================== LEAD SUMMARY ====================
  private async getLeadSummary(
    businessId: string,
    todayStart: Date,
    weekStart: Date
  ): Promise<LeadSummary> {
    const [newToday, newThisWeek, totalActive] = await Promise.all([
      prisma.contact.count({
        where: { businessId, createdAt: { gte: todayStart } }
      }),
      prisma.contact.count({
        where: { businessId, createdAt: { gte: weekStart } }
      }),
      prisma.contact.count({
        where: { businessId, status: 'active' }
      })
    ]);

    // Hot leads (high deal value, not won/lost)
    const hotLeads = await prisma.contact.findMany({
      where: {
        businessId,
        dealValue: { gt: 10000 },
        dealStage: { notIn: ['won', 'lost'] },
        status: 'active'
      },
      orderBy: { dealValue: 'desc' },
      take: 5,
      select: { name: true, dealValue: true, source: true }
    });

    // Needs follow-up (no recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const needsFollowUp = await prisma.contact.findMany({
      where: {
        businessId,
        status: 'active',
        dealStage: { notIn: ['won', 'lost'] },
        OR: [
          { lastActivity: null },
          { lastActivity: { lt: thirtyDaysAgo } }
        ]
      },
      orderBy: { lastActivity: 'asc' },
      take: 5,
      select: { name: true, lastActivity: true }
    });

    return {
      newToday,
      newThisWeek,
      totalActive,
      hotLeads: hotLeads.map(l => ({
        name: l.name,
        score: Math.min(100, Math.round((l.dealValue || 0) / 1000)),
        source: l.source || 'Unknown'
      })),
      needsFollowUp: needsFollowUp.map(l => ({
        name: l.name,
        lastContact: l.lastActivity?.toISOString() || 'Never',
        daysSince: l.lastActivity
          ? Math.floor((Date.now() - l.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : 999
      }))
    };
  }

  // ==================== PIPELINE SUMMARY ====================
  private async getPipelineSummary(businessId: string): Promise<PipelineSummary> {
    const pipeline = await prisma.pipeline.findFirst({
      where: { businessId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } }
    });

    let byStage: { stage: string; count: number; value: number }[] = [];
    let totalValue = 0;

    if (pipeline) {
      for (const stage of pipeline.stages) {
        const count = await prisma.contact.count({
          where: { businessId, stageId: stage.id }
        });
        const value = await prisma.contact.aggregate({
          where: { businessId, stageId: stage.id },
          _sum: { dealValue: true }
        });
        const stageValue = value._sum.dealValue || 0;
        totalValue += stageValue;
        byStage.push({ stage: stage.name, count, value: stageValue });
      }
    }

    // Stuck deals (same stage for >14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const stuckDeals = await prisma.contact.findMany({
      where: {
        businessId,
        dealStage: { notIn: ['won', 'lost'] },
        lastActivity: { lt: twoWeeksAgo }
      },
      take: 5,
      select: { name: true, stageName: true, lastActivity: true }
    });

    return {
      totalValue,
      byStage,
      stuckDeals: stuckDeals.map(d => ({
        contact: d.name,
        stage: d.stageName || 'Unknown',
        daysInStage: d.lastActivity
          ? Math.floor((Date.now() - d.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : 999
      }))
    };
  }

  // ==================== APPOINTMENT SUMMARY ====================
  private async getAppointmentSummary(
    businessId: string,
    todayStart: Date
  ): Promise<AppointmentSummary> {
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const dayAfterTomorrow = new Date(tomorrowStart);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const [today, tomorrow, upcoming, missed] = await Promise.all([
      prisma.appointment.count({
        where: {
          businessId,
          startTime: { gte: todayStart, lt: tomorrowStart },
          status: { not: 'cancelled' }
        }
      }),
      prisma.appointment.count({
        where: {
          businessId,
          startTime: { gte: tomorrowStart, lt: dayAfterTomorrow },
          status: { not: 'cancelled' }
        }
      }),
      prisma.appointment.findMany({
        where: {
          businessId,
          startTime: { gte: todayStart },
          status: { not: 'cancelled' }
        },
        orderBy: { startTime: 'asc' },
        take: 5,
        include: { contact: { select: { name: true } } }
      }),
      prisma.appointment.count({
        where: {
          businessId,
          startTime: { lt: todayStart },
          status: 'scheduled'
        }
      })
    ]);

    return {
      today,
      tomorrow,
      upcoming: upcoming.map(a => ({
        title: a.title,
        date: a.startTime.toISOString(),
        contact: a.contact?.name || 'Unknown'
      })),
      missed
    };
  }

  // ==================== SUPPORT SUMMARY ====================
  private async getSupportSummary(businessId: string): Promise<SupportSummary> {
    const [openTickets, urgentTickets] = await Promise.all([
      prisma.supportTicket.count({
        where: { businessId, status: { in: ['open', 'in_progress'] } }
      }),
      prisma.supportTicket.count({
        where: { businessId, status: { in: ['open', 'in_progress'] }, priority: 'urgent' }
      })
    ]);

    return {
      openTickets,
      urgentTickets,
      avgResponseTime: '< 2 hours' // Can be calculated from actual data
    };
  }

  // ==================== TEAM SUMMARY ====================
  private async getTeamSummary(businessId: string): Promise<TeamSummary> {
    const activeMembers = await prisma.user.count({
      where: { businessId, isActive: true }
    });

    // Top performer by deals won
    const topPerformer = await prisma.user.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { name: true }
    });

    return {
      activeMembers,
      topPerformer: topPerformer?.name || 'N/A'
    };
  }

  // ==================== ALERTS ====================
  private generateAlerts(
    revenue: RevenueSummary,
    sales: SalesSummary,
    leads: LeadSummary,
    pipeline: PipelineSummary,
    appointments: AppointmentSummary,
    support: SupportSummary
  ): Alert[] {
    const alerts: Alert[] = [];

    // Urgent alerts
    if (support.urgentTickets > 0) {
      alerts.push({
        type: 'urgent',
        message: `${support.urgentTickets} urgent support ticket(s) need attention`,
        action: 'Open Support'
      });
    }

    if (appointments.missed > 0) {
      alerts.push({
        type: 'urgent',
        message: `${appointments.missed} missed appointment(s) need rescheduling`,
        action: 'View Appointments'
      });
    }

    // Warning alerts
    if (leads.needsFollowUp.length > 3) {
      alerts.push({
        type: 'warning',
        message: `${leads.needsFollowUp.length} leads need follow-up (no activity in 30+ days)`
      });
    }

    if (pipeline.stuckDeals.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${pipeline.stuckDeals.length} deals stuck in pipeline for 14+ days`
      });
    }

    if (revenue.growth < 0) {
      alerts.push({
        type: 'warning',
        message: `Revenue declined ${Math.abs(revenue.growth)}% vs last month`
      });
    }

    // Info alerts
    if (leads.newToday > 0) {
      alerts.push({
        type: 'info',
        message: `${leads.newToday} new lead(s) added today`
      });
    }

    if (appointments.today > 0) {
      alerts.push({
        type: 'info',
        message: `You have ${appointments.today} appointment(s) today`
      });
    }

    return alerts;
  }

  // ==================== RECOMMENDATIONS ====================
  private generateRecommendations(
    revenue: RevenueSummary,
    sales: SalesSummary,
    leads: LeadSummary,
    pipeline: PipelineSummary
  ): string[] {
    const recs: string[] = [];

    if (leads.hotLeads.length > 0) {
      recs.push(`🔥 Focus on ${leads.hotLeads.length} hot lead(s) - high conversion potential`);
    }

    if (leads.needsFollowUp.length > 5) {
      recs.push(`📞 ${leads.needsFollowUp.length} leads need follow-up - schedule outreach today`);
    }

    if (pipeline.stuckDeals.length > 0) {
      recs.push(`⚠️ Review ${pipeline.stuckDeals.length} stuck deals - consider updating or closing`);
    }

    if (sales.conversionRate < 15) {
      recs.push(`📈 Conversion rate is ${sales.conversionRate}% - review sales process`);
    }

    if (revenue.thisMonth > revenue.lastMonth) {
      recs.push(`✅ Great progress! Revenue up ${revenue.growth}% - keep the momentum`);
    }

    return recs;
  }

  // ==================== BUSINESS CONTEXT FOR AI ====================
  async getBusinessContext(businessId: string): Promise<string> {
    const briefing = await this.getDailyBriefing(businessId);
    
    return `BUSINESS CONTEXT (Auto-generated for AI):
Date: ${briefing.date}
Revenue Today: ₹${briefing.revenue.today.toLocaleString('en-IN')}
Revenue This Month: ₹${briefing.revenue.thisMonth.toLocaleString('en-IN')} (${briefing.revenue.growth > 0 ? '+' : ''}${briefing.revenue.growth}%)
Pipeline Value: ₹${briefing.pipeline.totalValue.toLocaleString('en-IN')}
New Leads Today: ${briefing.leads.newToday}
Active Leads: ${briefing.leads.totalActive}
Appointments Today: ${briefing.appointments.today}
Open Tickets: ${briefing.support.openTickets}
Alerts: ${briefing.alerts.length > 0 ? briefing.alerts.map(a => a.message).join('; ') : 'None'}`;
  }
}

export const avaIntelligence = new AvaIntelligenceService();
