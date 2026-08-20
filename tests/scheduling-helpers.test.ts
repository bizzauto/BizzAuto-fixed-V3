/**
 * @jest-environment node
 * 
 * Unit tests for the scheduling helpers: query-param coercion (query.ts) and
 * the send-window gate (send-window.service.ts). These are pure functions and
 * require no database.
 */
/// <reference types="jest" />
import { qs, qn, qb } from '../src/server/utils/query.js';
import {
  evaluate,
  nextAllowedTime,
  normalizeWindow,
  DEFAULT_WINDOW,
} from '../src/server/services/send-window.service.js';

describe('query coercion helpers', () => {
  it('qs returns string as-is', () => {
    expect(qs('hello')).toBe('hello');
  });

  it('qs takes first element of an array', () => {
    expect(qs(['first', 'second'])).toBe('first');
  });

  it('qs coerces null/undefined to empty string', () => {
    expect(qs(null)).toBe('');
    expect(qs(undefined)).toBe('');
  });

  it('qn parses numbers and defaults to 0', () => {
    expect(qn('42')).toBe(42);
    expect(qn(['7'])).toBe(7);
    expect(qn('not-a-number')).toBe(0);
    expect(qn(undefined)).toBe(0);
  });

  it('qb parses boolean-like strings', () => {
    expect(qb('true')).toBe(true);
    expect(qb('1')).toBe(true);
    expect(qb('false')).toBe(false);
    expect(qb('0')).toBe(false);
  });
});

describe('send-window gate', () => {
  const businessHours = { startHour: 9, endHour: 21, allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] };

  it('allows sends within business hours on a weekday', () => {
    const wed10am = new Date('2026-08-19T10:00:00'); // Wednesday
    expect(evaluate(businessHours, wed10am)).toBe(true);
  });

  it('blocks sends outside business hours', () => {
    const wed7am = new Date('2026-08-19T07:00:00');
    const wed22pm = new Date('2026-08-19T22:00:00');
    expect(evaluate(businessHours, wed7am)).toBe(false);
    expect(evaluate(businessHours, wed22pm)).toBe(false);
  });

  it('blocks sends on non-allowed days', () => {
    const sunday10am = new Date('2026-08-23T10:00:00'); // Sunday
    expect(evaluate(businessHours, sunday10am)).toBe(false);
  });

  it('respects quiet-hours override', () => {
    const window = { startHour: 0, endHour: 23, allowedDays: [...DEFAULT_WINDOW.allowedDays], quietHours: { start: 22, end: 8 } };
    const lateNight = new Date('2026-08-19T23:30:00');
    expect(evaluate(window, lateNight)).toBe(false);
    const afternoon = new Date('2026-08-19T15:00:00');
    expect(evaluate(window, afternoon)).toBe(true);
  });

  it('falls back to default window for invalid config', () => {
    expect(normalizeWindow(null)).toEqual(DEFAULT_WINDOW);
    expect(normalizeWindow({ startHour: 99 } as any).startHour).toBe(23); // clamped to max 23
    expect(normalizeWindow({ startHour: -5 } as any).startHour).toBe(0);  // clamped to min 0
  });

  it('nextAllowedTime returns same time when already allowed', () => {
    const wed10am = new Date('2026-08-19T10:00:00');
    expect(nextAllowedTime(businessHours, wed10am).getTime()).toBe(wed10am.getTime());
  });

  it('nextAllowedTime defers a too-early send to startHour', () => {
    const wed7am = new Date('2026-08-19T07:00:00');
    const next = nextAllowedTime(businessHours, wed7am);
    expect(next.getHours()).toBe(9);
    expect(next.getDate()).toBe(19);
  });

  it('nextAllowedTime jumps a blocked day to the next allowed day', () => {
    const sunday10am = new Date('2026-08-23T10:00:00'); // Sunday
    const next = nextAllowedTime(businessHours, sunday10am);
    expect(next.getDay()).toBe(1); // Monday
    expect(next.getHours()).toBe(9);
  });
});
