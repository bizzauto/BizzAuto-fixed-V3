/**
 * Query/param coercion helpers.
 *
 * Express types `req.query` and destructured members as
 * `string | ParsedQs | string[] | undefined`. Under NodeNext strictness this
 * union cannot flow directly into Prisma `String`/`StringFilter` fields or
 * `parseInt`, which is the dominant source of server type errors. These
 * helpers coerce the union into a single `string` (or `number`) at the
 * boundary so filters compile and behave predictably.
 *
 * Pattern extracted from `routes/client-portal.ts` `asString`.
 */

/** Coerce a query/param value (string | string[] | undefined | null) to string. */
export function qs(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : String(first ?? '');
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Coerce a query/param value to a finite number, defaulting to 0. */
export function qn(value: unknown): number {
  const n = Number(qs(value));
  return Number.isFinite(n) ? n : 0;
}

/** Coerce to boolean from common string representations. */
export function qb(value: unknown): boolean {
  const s = qs(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}
