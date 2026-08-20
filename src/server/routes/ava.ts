import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { avaIntelligence } from '../services/ava-intelligence.service.js';
import { AIService } from '../services/ai.service.js';

const router = Router();

// ==================== AVA EXECUTIVE ASSISTANT API ====================
// All routes are FREE - uses Nvidia NIM + OpenRouter free models

// GET /api/ava/briefing - Daily Executive Briefing
router.get('/briefing', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const userName = req.user.name || 'Sir/Ma\'am';

    const briefing = await avaIntelligence.getDailyBriefing(businessId, userName);

    res.json({
      success: true,
      data: briefing
    });
  } catch (error: any) {
    console.error('Ava briefing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate briefing',
      details: error.message
    });
  }
});

// GET /api/ava/insights - Business Intelligence Insights
router.get('/insights', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const context = await avaIntelligence.getBusinessContext(businessId);

    res.json({
      success: true,
      data: { context }
    });
  } catch (error: any) {
    console.error('Ava insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
      details: error.message
    });
  }
});

// POST /api/ava/chat - Enhanced AI Chat with Business Context
router.post('/chat', authenticate, async (req: any, res: Response) => {
  try {
    const { text, history = [], language = 'en-IN' } = req.body;
    const businessId = req.user.businessId;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text required' });
    }

    // Get business context for intelligent responses
    const businessContext = await avaIntelligence.getBusinessContext(businessId);

    // Language names mapping
    const languageNames: Record<string, string> = {
      'en-IN': 'English',
      'hi-IN': 'Hindi (हिन्दी)',
      'mr-IN': 'Marathi (मराठी)',
      'gu-IN': 'Gujarati (ગુજરાતી)',
      'ta-IN': 'Tamil (தமிழ்)',
      'te-IN': 'Telugu (తెలుగు)',
      'bn-IN': 'Bengali (বাংলা)',
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
      'ml-IN': 'Malayalam (മലയാളം)',
      'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
    };

    const selectedLanguage = languageNames[language] || 'English';

    // Executive Assistant system prompt with LANGUAGE support
    const systemPrompt = `You are Ava, an elite AI Executive Assistant for a business platform called BizzAuto.

CRITICAL RULE: You MUST respond in ${selectedLanguage} language ONLY. If the user speaks in any language, still respond in ${selectedLanguage}. This is mandatory.

PERSONALITY:
- Professional, calm, efficient, proactive
- Speak like a top-tier executive assistant
- Be concise and actionable
- Never sound robotic or like a chatbot
- Use natural expressions of ${selectedLanguage}

BUSINESS CONTEXT:
${businessContext}

CAPABILITIES:
1. Daily Briefings - Revenue, sales, leads, pipeline, appointments, support
2. Business Intelligence - Analyze data, detect anomalies, suggest improvements
3. CRM Management - Leads, contacts, deals, follow-ups
4. Task Execution - Create invoices, send follow-ups, schedule meetings
5. Decision Support - Pros, cons, risks, recommendations

RULES:
- ALWAYS respond in ${selectedLanguage} language
- Keep responses under 3 lines unless detail is requested
- Use numbers and data from business context
- Always offer to take action
- Never say "As an AI" - say "Based on current data"
- End with a follow-up question or action offer`;

    // Build messages array with context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: text }
    ];

    // Call AI - try Nvidia NIM first (FREE), fallback to OpenRouter (FREE)
    let responseText = '';
    
    try {
      // Try Nvidia NIM (FREE)
      const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NVIDIA_NIM_API_KEY || process.env.VITE_NVIDIA_NIM_API_KEY}`
        },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages,
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9
        })
      });

      if (nvidiaResponse.ok) {
        const data = await nvidiaResponse.json() as any;
        responseText = data.choices[0]?.message?.content || '';
      }
    } catch (e) {
      console.log('Nvidia NIM failed, trying OpenRouter');
    }

    // Fallback to OpenRouter (FREE)
    if (!responseText) {
      try {
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://bizzauto.com',
            'X-Title': 'BizzAuto Ava Assistant'
          },
          body: JSON.stringify({
            model: 'google/gemma-2-9b-it:free',
            messages,
            max_tokens: 500,
            temperature: 0.7
          })
        });

        if (openrouterResponse.ok) {
          const data = await openrouterResponse.json() as any;
          responseText = data.choices[0]?.message?.content || '';
        }
      } catch (e) {
        console.log('OpenRouter also failed');
      }
    }

    // Final fallback
    if (!responseText) {
      responseText = 'I apologize, but I\'m experiencing a temporary connectivity issue. Please try again in a moment. In the meantime, you can check your dashboard for the latest business metrics.';
    }

    res.json({
      success: true,
      data: {
        text: responseText,
        model: 'ava-executive',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Ava chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat failed',
      details: error.message
    });
  }
});

// POST /api/ava/command - Execute Business Commands
router.post('/command', authenticate, async (req: any, res: Response) => {
  try {
    const { command, params } = req.body;
    const businessId = req.user.businessId;

    // Parse command intent
    const lower = command.toLowerCase();
    let result: any = { success: true, action: '' };

    if (lower.includes('revenue') || lower.includes('पैसा') || lower.includes('कमाई')) {
      const briefing = await avaIntelligence.getDailyBriefing(businessId);
      result = {
        success: true,
        action: 'revenue_update',
        data: briefing.revenue,
        message: `Revenue today: ₹${briefing.revenue.today.toLocaleString('en-IN')}. This month: ₹${briefing.revenue.thisMonth.toLocaleString('en-IN')}`
      };
    } else if (lower.includes('leads') || lower.includes('लीड')) {
      const briefing = await avaIntelligence.getDailyBriefing(businessId);
      result = {
        success: true,
        action: 'leads_update',
        data: briefing.leads,
        message: `${briefing.leads.newToday} new leads today. ${briefing.leads.totalActive} active leads total.`
      };
    } else if (lower.includes('pipeline') || lower.includes('डील')) {
      const briefing = await avaIntelligence.getDailyBriefing(businessId);
      result = {
        success: true,
        action: 'pipeline_update',
        data: briefing.pipeline,
        message: `Pipeline value: ₹${briefing.pipeline.totalValue.toLocaleString('en-IN')}. ${briefing.pipeline.stuckDeals.length} stuck deals.`
      };
    } else if (lower.includes('appointment') || lower.includes('मीटिंग')) {
      const briefing = await avaIntelligence.getDailyBriefing(businessId);
      result = {
        success: true,
        action: 'appointments_update',
        data: briefing.appointments,
        message: `${briefing.appointments.today} appointments today. ${briefing.appointments.tomorrow} tomorrow.`
      };
    } else {
      result = {
        success: false,
        action: 'unknown',
        message: 'I can help with revenue, leads, pipeline, and appointments. What would you like to know?'
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error('Ava command error:', error);
    res.status(500).json({
      success: false,
      error: 'Command execution failed',
      details: error.message
    });
  }
});

// GET /api/ava/context - Get Business Context for Frontend
router.get('/context', authenticate, async (req: any, res: Response) => {
  try {
    const businessId = req.user.businessId;
    const context = await avaIntelligence.getBusinessContext(businessId);

    res.json({
      success: true,
      data: { context }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch context'
    });
  }
});

export default router;
