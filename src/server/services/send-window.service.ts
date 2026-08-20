/**
 * Send-window gate for outbound messaging.
 *
 * Prevents WhatsApp / email sends outside a business's allowed hours so
 * drip sequences, follow-ups and recurring campaigns don't fire at 3am or on
 * opted-out days. The window is stored on `Business.sendWindow` as JSON:
 *
 *   {
 *     "timezone": "Asia/Kolkata",
 *     "startHour": 9,          // 0-23, inclusive
 *     "endHour": 21,           // 0-23, exclusive (21 => last send at 20:59)
 *     "allowedDays": ["monday", ... "sunday"],
 *     "quietHours": { "start": 22, "end": 8 }   // optional override window
 *   }
 *
 * When no config exists we default to 9:00–21:00, every day — a safe,
 * send-friendly window.
 */
// NOTE: prisma is imported lazily inside isWithinSendWindow so this module is
// import-safe in unit tests (no DB connection required to test evaluate()).
let prisma: typeof import('../db.js').prisma | null = null;
async function getPrisma() {
  if (!prisma) {
    const db = await import('../db.js');
    prisma = db.prisma;
  }
  return prisma;
}

export interface SendWindow {
  timezone?: string;
  startHour: number;
  endHour: number;
  allowedDays: string[];
  quietHours?: { start: number; end: number };
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DEFAULT_WINDOW: SendWindow = {
  startHour: 9,
  endHour: 21,
  allowedDays: [...DAY_NAMES],
};

function isWithinHours(hour: number, w: SendWindow): boolean {
  // Quiet-hours override takes precedence (e.g. 22:00–08:00 blocked).
  if (w.quietHours) {
    const { start, end } = w.quietHours;
    const inQuiet =
      start <= end
        ? hour >= start && hour < end
        : hour >= start || hour < end; // wraps midnight
    if (inQuiet) return false;
  }
  return hour >= w.startHour && hour < w.endHour;
}

/**
 * Returns true when a message may be sent at `when` for `businessId`.
 * Reads the business send-window config; falls back to the default window on
 * any failure so sending is never permanently blocked by config errors.
 */
export async function isWithinSendWindow(
  businessId: string,
  when: Date = new Date()
): Promise<boolean> {
  const window = await getSendWindow(businessId);
  return evaluate(window, when);
}

/**
 * Resolve a business's effective send-window (normalized). Safe to call with
 * no database — returns the default window on any error.
 */
export async function getSendWindow(businessId: string): Promise<SendWindow> {
  try {
    const db = await getPrisma();
    const business = await (db as any).business.findUnique({
      where: { id: businessId },
      select: { businessHours: true },
    });
    return normalizeWindow((business?.businessHours as SendWindow | null) ?? null);
  } catch {
    return { ...DEFAULT_WINDOW };
  }
}

/** Pure evaluation used directly by tests without a DB. */
export function evaluate(window: SendWindow, when: Date): boolean {
  const w = normalizeWindow(window);
  const day = DAY_NAMES[when.getDay()];
  if (!w.allowedDays.includes(day)) return false;
  return isWithinHours(when.getHours(), w);
}

/**
 * Given a desired send time that falls outside the window, return the next
 * allowed time. If already allowed, returns `when` unchanged.
 */
export function nextAllowedTime(window: SendWindow, when: Date = new Date()): Date {
  const w = normalizeWindow(window);
  let cursor = new Date(when);

  // Guard against infinite loop on a fully-closed window.
  for (let i = 0; i < 7 * 24 + 1; i++) {
    if (evaluate(w, cursor)) return cursor;
    if (!w.allowedDays.includes(DAY_NAMES[cursor.getDay()])) {
      // Jump to the next allowed day at startHour.
      cursor = startOfNextAllowedDay(w, cursor);
      continue;
    }
    // Same allowed day but outside hours — advance to startHour.
    cursor.setMinutes(0, 0, 0);
    cursor.setHours(w.startHour);
    if (cursor <= when) cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

function startOfNextAllowedDay(w: SendWindow, from: Date): Date {
  const next = new Date(from);
  for (let i = 1; i <= 7; i++) {
    next.setDate(from.getDate() + i);
    next.setHours(w.startHour, 0, 0, 0);
    if (w.allowedDays.includes(DAY_NAMES[next.getDay()])) return next;
  }
  return new Date(from);
}

export function normalizeWindow(raw: SendWindow | null | undefined): SendWindow {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WINDOW };
  const allowedDays =
    Array.isArray(raw.allowedDays) && raw.allowedDays.length > 0
      ? raw.allowedDays.filter((d) => DAY_NAMES.includes(String(d).toLowerCase()))
      : [...DEFAULT_WINDOW.allowedDays];
  return {
    timezone: raw.timezone,
    startHour: clampHour(raw.startHour, DEFAULT_WINDOW.startHour),
    endHour: clampHour(raw.endHour, DEFAULT_WINDOW.endHour),
    allowedDays,
    quietHours: raw.quietHours
      ? { start: clampHour(raw.quietHours.start, 0), end: clampHour(raw.quietHours.end, 0) }
      : undefined,
  };
}

function clampHour(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(23, Math.floor(n)));
}

export { DEFAULT_WINDOW, DAY_NAMES };
