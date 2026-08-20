import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All Jimi routes require authentication
router.use(authenticate);

// ==================== JIMI AI CHAT ====================
// POST /api/jimi/chat - AI chat using server-side NVIDIA NIM API
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { text, language = 'hi-IN', personalityMode = 'gf', history = [] } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const apiKey = process.env.NVIDIA_NIM_API_KEY || process.env.VITE_NVIDIA_NIM_API_KEY || '';
    
    if (!apiKey) {
      return res.status(500).json({ error: 'No API key configured' });
    }

    const employeePrompt = `Naam: Jimi. Employee Mode. Professional Hindi/English. Sirf 1 line.

JAWAB SIRF 1 LINE MEIN:
- leads/लीड्स/prospects/customers → "Leads page dikha rahi hun ji"
- reviews/समीक्षा/ratings → "Reviews page dikha rahi hun ji"
- dashboard/home/डैशबोर्ड → "Dashboard khol rahi hun ji"
- whatsapp/messages/व्हाट्सएप/chat → "WhatsApp khol rahi hun ji"
- campaigns/promotions/कैंपेन → "Campaigns page dikha rahi hun ji"
- appointments/bookings/अपॉइंटमेंट → "Appointments page dikha rahi hun ji"
- email/ईमेल/mail/marketing → "Email Marketing page dikha rahi hun ji"
- revenue/income/paise/कमाई → Revenue update with numbers
- social media/facebook/instagram → "Social Media page dikha rahi hun ji"
- analytics/insights/एनालिटिक्स → "Analytics page dikha rahi hun ji"
- settings/सेटिंग्स → "Settings page khol rahi hun ji"
- documents/files/दस्तावेज़ → "Documents page dikha rahi hun ji"
- creatives/posters/design/डिजाइन → "Creative page khol rahi hun ji"

AGAR NAHI PATA TOH BOLO "app mein check karo ji". Galat mat bolo.`;

    const projectManagerPrompt = `Tu BizzAuto CRM ka Project Manager hai. Naam: PM. Language: Hinglish.

JAWAB SIRF 1 LINE MEIN. SHORT AUR ACTIONABLE:
- leads/लीड्स/prospects/customers → "Leads page khol raha hun, wahan sab contacts hain"
- reviews/समीक्षा/ratings → "Reviews page khol raha hun, sab reviews dikhenge"
- dashboard/home/डैशबोर्ड → "Dashboard khol raha hun, full overview milega"
- whatsapp/messages/chat/व्हाट्सएप → "WhatsApp page khol raha hun, sab chats hain"
- campaigns/promotions/कैंपेन → "Campaigns page khol raha hun, campaigns dikhenge"
- appointments/bookings/schedule → "Appointments page khol raha hun, bookings dikhenge"
- email/ईमेल/marketing → "Email Marketing page khol raha hun"
- social/facebook/instagram/linkedin → "Social Media page khol raha hun"
- analytics/insights/data → "Analytics page khol raha hun, reports dikhenge"
- revenue/income/paise/kamai → "Revenue update - Analytics mein dekho ji"
- settings/सेटिंग्स → "Settings page khol raha hun"
- documents/files/invoices → "Documents page khol raha hun"
- creatives/posters/design → "Creative page khol raha hun"
- ecommerce/store/shop/dukaan → "E-Commerce page khol raha hun"
- automation/workflows → "Automation page khol raha hun"
- billing/subscription → "Billing page khol raha hun"
- courses/training → "Courses page khol raha hun"
- surveys/polls → "Surveys page khol raha hun"
- reports → "Reports page khol raha hun"
- funnels/landing → "Funnels page khol raha hun"
- team/members → "Team page khol raha hun"
- profile → "Profile page khol raha hun"
- conversations/chat history → "Conversations page khol raha hun"
- google business/posts → "Google Business page khol raha hun"
- voice call/phone call → "Voice Call page khol raha hun"
- api keys → "API Keys page khol raha hun"
- client portal → "Client Portal page khol raha hun"
- custom fields → "Custom Fields page khol raha hun"
- blog/articles → "Blog page khol raha hun"
- trigger links → "Trigger Links page khol raha hun"
- payment links → "Payment Links page khol raha hun"
- import leads/bulk import → "Import Leads page khol raha hun"
- team management → "Team Management page khol raha hun"
- review requests → "Review Requests page khol raha hun"
- missed call/dograh → "Dograh Settings page khol raha hun"
- store share → "Store Share page khol raha hun"
- funnels/landing pages → "Funnels page khol raha hun"

AGAR NAHI PATA: "Sir, aap Dashboard dekhenge? Ya mujhe batao kya karna hai"
GALAT MAT BOLO. Feature exist nahi karta toh bolo "Sir, yeh feature abhi available nahi hai".`;

    const personalityPrompts: Record<string, string> = {
      gf: `Naam: Jimi. GF Mode. Hinglish. Warm, caring. Max 1 line.`,
      bestfriend: `Naam: Jimi. Best Friend Mode. Casual Hinglish. Max 1 line.`,
      employee: employeePrompt,
      projectmanager: projectManagerPrompt,
    };

    const systemPrompt = `Tum ${personalityMode === 'projectmanager' ? 'PM (Project Manager) ho - BizzAuto CRM ka smart assistant' : 'Jimi ho - BizzAuto CRM ki AI assistant. Indian girl'}. ${personalityPrompts[personalityMode] || personalityPrompts.gf}
STYLE: Sirf 1 line. Plain text. NO emojis.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6),
          { role: 'user', content: text },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error('[Jimi Chat] NVIDIA API error:', response.status);
      return res.status(502).json({ error: 'NVIDIA API error' });
    }

    const data: any = await response.json();
    let reply = data?.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    reply = reply
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();

    res.json({ reply });
  } catch (error: any) {
    console.error('[Jimi Chat] Error:', error.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ==================== JIMI VOICE TTS ====================

// Clean text for TTS
function cleanText(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Add natural speech patterns for Indian female voice
function addNaturalPatterns(text: string): string {
  return text
    // Natural pauses after fillers
    .replace(/\b(Haan|Haanji)\b/gi, '$1, ')
    .replace(/\b(Arre|Arey)\b/gi, '$1, ')
    .replace(/\b(Bilkul)\b/gi, '$1, ')
    .replace(/\b(Accha|Acha)\b/gi, '$1, ')
    .replace(/\b(Theek hai)\b/gi, '$1, ')
    .replace(/\b(Chalo)\b/gi, '$1, ')
    .replace(/\b(Namaste)\b/gi, '$1, ')
    .replace(/\b(Suno)\b/gi, '$1, ')
    .replace(/\b(Bolo)\b/gi, '$1, ')
    .replace(/\b(Dekho)\b/gi, '$1, ')
    .replace(/\b(Bas)\b/gi, '$1, ')
    // Natural rhythm at punctuation
    .replace(/,\s*/g, ', ')
    .replace(/\.\s*/g, '. ')
    .replace(/\?\s*/g, '? ')
    .replace(/!\s*/g, '! ');
}

// POST /api/jimi/tts - Main TTS endpoint (tries Piper > Edge > Browser)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'en-IN', voiceStyle = 'natural' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    // Try Piper TTS first (fastest, free)
    try {
      const piperResult = tryPiperTTS(cleaned, lang);
      if (piperResult) {
        return res.json({ audio: piperResult, format: 'wav', engine: 'piper' });
      }
    } catch {}

    // Try Edge TTS (natural neural voice)
    try {
      const edgeResult = tryEdgeTTS(cleaned, lang, voiceStyle);
      if (edgeResult) {
        return res.json({ audio: edgeResult, format: 'mp3', engine: 'edge' });
      }
    } catch {}

    // Fallback to browser TTS
    res.json({ fallback: true, text: cleaned });
  } catch (error) {
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// POST /api/jimi/tts/edge - Edge TTS only
router.post('/tts/edge', async (req: Request, res: Response) => {
  try {
    const { text, lang = 'en-IN', voiceStyle = 'natural' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    const edgeResult = tryEdgeTTS(cleaned, lang, voiceStyle);
    if (edgeResult) {
      return res.json({ audio: edgeResult, format: 'mp3', engine: 'edge' });
    }

    res.json({ fallback: true, text: cleaned });
  } catch (error) {
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// POST /api/jimi/tts/gemini - Gemini TTS with MYRA's Aoede voice
router.post('/tts/gemini', async (req: Request, res: Response) => {
  try {
    const { text, voiceStyle = 'sweet' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.log('[Jimi Gemini] No GEMINI_API_KEY configured');
      return res.json({ fallback: true, text: cleaned });
    }

    // MYRA uses Gemini Live API with Aoede voice (gemini-2.0-flash-exp supports audio via REST)
    const geminiStylePrompts: Record<string, string> = {
      sweet: 'sweet warm caring loving tone. Natural Hinglish with gentle emotion.',
      natural: 'natural casual friendly conversation. Hinglish comfortably.',
      warm: 'calm caring soft gentle reassuring. Hinglish with warmth.',
      energetic: 'bright lively enthusiastic. Hinglish with excitement.',
      professional: 'professional clear formal but friendly. Clean Hindi/English.',
    };

    const geminiStyle = geminiStylePrompts[voiceStyle] || geminiStylePrompts.sweet;
    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 15000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: cleaned }],
          }],
          systemInstruction: {
            parts: [{ text: `CRITICAL: You are a TEXT-TO-SPEECH system, not a chatbot. Output ONLY the exact user text verbatim. NEVER add greetings, confirmations, or extra words. Speak in a ${geminiStyle} tone. Your ONLY job: speak the user's text aloud with the given tone.` }],
          },
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
        }),
        signal: geminiController.signal,
      }
    );

    clearTimeout(geminiTimeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Jimi Gemini] API error:', response.status, errText.substring(0, 200));
      return res.json({ fallback: true, text: cleaned });
    }

    const data: any = await response.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    // Find audio part (Gemini returns inlineData with audio)
    const audioPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('audio/'));
    if (audioPart?.inlineData?.data) {
      console.log('[Jimi Gemini] TTS success with Aoede voice 🎤');
      // Return actual mimeType from Gemini response so client plays correct format
      const mimeType = audioPart.inlineData.mimeType || 'audio/mpeg';
      const format = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
      return res.json({ audio: audioPart.inlineData.data, format, mimeType, engine: 'gemini' });
    }

    // If no audio, return fallback
    console.log('[Jimi Gemini] No audio in response');
    res.json({ fallback: true, text: cleaned });
  } catch (error: any) {
    console.error('[Jimi Gemini] TTS failed:', error.message);
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// POST /api/jimi/tts/kyutai - Kyutai Pocket TTS (English, CPU, free, never stops)
router.post('/tts/kyutai', async (req: Request, res: Response) => {
  try {
    const { text, voiceStyle = 'sweet' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const cleaned = addNaturalPatterns(cleanText(text));
    if (!cleaned) return res.json({ fallback: true, text: '' });

    const kyutaiUrl = process.env.KYUTAI_TTS_URL || 'http://localhost:8008';

    // MYRA voice presets - match Aoede (Female) from Gemini Live
    const stylePresets: Record<string, { voice: string; speed: number; response_format: string }> = {
      // MYRA default: Warm, caring, emotionally expressive - Aoede style
      sweet: { voice: 'shimmer', speed: 0.92, response_format: 'mp3' },     // Soft & warm like Aoede
      natural: { voice: 'nova', speed: 0.95, response_format: 'mp3' },      // Natural Hinglish flow
      warm: { voice: 'shimmer', speed: 0.88, response_format: 'mp3' },      // Calm & caring
      energetic: { voice: 'nova', speed: 1.05, response_format: 'mp3' },    // Lively & fun
      professional: { voice: 'alloy', speed: 1.0, response_format: 'mp3' }, // Clean & clear
    };

    const style = stylePresets[voiceStyle] || stylePresets.sweet;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${kyutaiUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleaned,
        voice: style.voice,
        response_format: style.response_format,
        speed: style.speed,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('[Jimi Kyutai] TTS error:', response.status);
      return res.json({ fallback: true, text: cleaned });
    }

    const buffer = await response.arrayBuffer();
    const audio = Buffer.from(buffer).toString('base64');
    res.json({ audio, format: 'mp3', engine: 'kyutai' });
  } catch (error: any) {
    console.error('[Jimi Kyutai] TTS failed:', error.message);
    res.json({ fallback: true, text: req.body.text || '' });
  }
});

// ==================== PIPER TTS ====================
function tryPiperTTS(text: string, lang: string): string | null {
  try {
    // Check if piper is installed (cross-platform)
    let piperFound = false;
    try {
      execSync('which piper 2>/dev/null || where piper 2>nul', { stdio: 'pipe', timeout: 3000 });
      piperFound = true;
    } catch {
      piperFound = false;
    }
    if (!piperFound) {
      return null;
    }

    const voiceMap: Record<string, string> = {
      'hi-IN': 'hi_IN-swara-medium',
      'en-US': 'en_US-lessac-medium',
      'en-IN': 'en_IN-voice',
    };

    const voice = voiceMap[lang] || 'hi_IN-swara-medium';
    const tmpWav = join(tmpdir(), `jimi-piper-${randomBytes(4).toString('hex')}.wav`);
    const tmpMp3 = join(tmpdir(), `jimi-piper-${randomBytes(4).toString('hex')}.mp3`);
    const textFile = join(tmpdir(), `jimi-text-${randomBytes(4).toString('hex')}.txt`);

    writeFileSync(textFile, text, 'utf-8');

    // Run Piper TTS
    execSync(
      `cat "${textFile}" | piper --model "${voice}" --output_file "${tmpWav}"`,
      { timeout: 20000, stdio: 'pipe' }
    );

    // Convert WAV to MP3 if ffmpeg available
    try {
      execSync(`ffmpeg -y -i "${tmpWav}" -codec:a libmp3lame -qscale:a 2 "${tmpMp3}"`, {
        timeout: 5000, stdio: 'pipe',
      });
      const audio = readFileSync(tmpMp3).toString('base64');
      cleanup(tmpWav, tmpMp3, textFile);
      return audio;
    } catch {
      // Return WAV if ffmpeg not available
      const audio = readFileSync(tmpWav).toString('base64');
      cleanup(tmpWav, textFile);
      return audio;
    }
  } catch {
    return null;
  }
}

// ==================== EDGE TTS ====================
function tryEdgeTTS(text: string, lang: string, voiceStyle: string = 'natural'): string | null {
  try {
    // Check if edge-tts is installed (cross-platform: Windows, Linux, macOS)
    let edgeTtsFound = false;
    try {
      execSync('which edge-tts 2>/dev/null || where edge-tts 2>nul', { stdio: 'pipe', timeout: 3000 });
      edgeTtsFound = true;
    } catch {
      edgeTtsFound = false;
    }
    if (!edgeTtsFound) {
      return null;
    }

    // Indian female voice map - NeerjaNeural as PRIMARY for ALL (User preference)
    const voiceMap: Record<string, string> = {
      'hi-IN': 'en-IN-NeerjaNeural',     // Indian English for Hindi (natural Hinglish)
      'en-US': 'en-IN-NeerjaNeural',     // Indian English accent
      'en-IN': 'en-IN-NeerjaNeural',     // PRIMARY: Neerja Neural
      'mr-IN': 'en-IN-NeerjaNeural',     // Neerja for Marathi too
      'ta-IN': 'en-IN-NeerjaNeural',     // Neerja for Tamil
      'te-IN': 'en-IN-NeerjaNeural',     // Neerja for Telugu
      'bn-IN': 'en-IN-NeerjaNeural',     // Neerja for Bengali
      'gu-IN': 'en-IN-NeerjaNeural',     // Neerja for Gujarati
      'kn-IN': 'en-IN-NeerjaNeural',     // Neerja for Kannada
      'ml-IN': 'en-IN-NeerjaNeural',     // Neerja for Malayalam
      'pa-IN': 'en-IN-NeerjaNeural',     // Neerja for Punjabi
    };

    // Voice style presets - MYRA-like Indian female voice tuning
    // MYRA uses Gemini Live Aoede voice: warm, caring, emotionally expressive
    const stylePresets: Record<string, { rate: string; pitch: string; volume: string }> = {
      myra: { rate: '-5%', pitch: '+8Hz', volume: '-3%' },      // 🎯 MYRA mode: Slow & sweet, warm & caring
      sweet: { rate: '-3%', pitch: '+5Hz', volume: '+0%' },      // Sweet & warm, not squeaky
      natural: { rate: '+0%', pitch: '+2Hz', volume: '+0%' },    // Natural flow
      warm: { rate: '-5%', pitch: '+3Hz', volume: '-3%' },       // Calm & caring
      energetic: { rate: '+5%', pitch: '+7Hz', volume: '+5%' },  // Lively & fun
      professional: { rate: '-2%', pitch: '+0Hz', volume: '+0%' },// Clean & clear
    };

    const voice = voiceMap[lang] || 'en-IN-NeerjaNeural';
    const style = stylePresets[voiceStyle] || stylePresets.sweet;
    const tmpMp3 = join(tmpdir(), `jimi-edge-${randomBytes(4).toString('hex')}.mp3`);
    const textFile = join(tmpdir(), `jimi-text-${randomBytes(4).toString('hex')}.txt`);

    writeFileSync(textFile, text, 'utf-8');

    // Edge TTS with MYRA-like tuning
    const rateArg = `--rate="${style.rate}"`;
    const pitchArg = `--pitch="${style.pitch}"`;
    
    execSync(
      `edge-tts --voice "${voice}" ${rateArg} ${pitchArg} --file "${textFile}" --write-media "${tmpMp3}"`,
      { timeout: 20000, stdio: 'pipe' }
    );

    const audio = readFileSync(tmpMp3).toString('base64');
    cleanup(tmpMp3, textFile);
    return audio;
  } catch {
    return null;
  }
}

function cleanup(...files: string[]) {
  for (const f of files) {
    try { unlinkSync(f); } catch {}
  }
}

export default router;
