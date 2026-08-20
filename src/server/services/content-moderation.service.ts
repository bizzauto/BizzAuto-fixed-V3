/**
 * Content Moderation Service for BizzAuto CRM
 * Filters user-generated content for appropriate language
 */

const BLOCKED_WORDS = [
  'spam', 'scam', 'fake', 'fraud',
];

const SPAM_PATTERNS = [
  /(.)\1{5,}/g,
  /https?:\/\/[^\s]{3,}/g,
];

export interface ModerationResult {
  approved: boolean;
  reason?: string;
  score: number;
}

export function moderateContent(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { approved: true, score: 0 };
  }

  const lowerText = text.toLowerCase();

  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word)) {
      return { approved: false, reason: 'Blocked word: ' + word, score: 100 };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return { approved: false, reason: 'Spam pattern detected', score: 80 };
    }
  }

  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 10) {
    return { approved: false, reason: 'Excessive caps', score: 30 };
  }

  return { approved: true, score: 0 };
}

export function sanitizeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}