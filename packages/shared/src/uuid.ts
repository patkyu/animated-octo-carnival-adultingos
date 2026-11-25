/**
 * RFC 4122 v4 UUID. Uses crypto.getRandomValues when present (Hermes with
 * expo-crypto polyfill, browsers, Node 19+). Client-generated UUIDs make
 * offline creation and guest→account migration idempotent: re-uploading a
 * record with the same id is an upsert, never a duplicate.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else throw new Error('Secure random source unavailable');
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Deterministic UUID (version nibble 8, "custom") from string parts using
 * cyrb128. Used for records that must be identical no matter which device or
 * retry creates them:
 *   occurrence id = stableUuid('occ', obligationId, scheduledDate)
 *   payment id    = stableUuid('pay', occurrenceId)
 * Two phones completing the same bill offline therefore produce the *same*
 * next occurrence row, and the server's upsert collapses them into one.
 */
export function stableUuid(...parts: string[]): string {
  const str = parts.join('␟');
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  const hex = [h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
  const v = hex.slice(0, 12) + '8' + hex.slice(13, 16) + ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16) + hex.slice(17);
  return `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20, 32)}`;
}

export const occurrenceId = (obligationId: string, scheduledDate: string) => stableUuid('occ', obligationId, scheduledDate);
export const paymentId = (occurrenceId_: string) => stableUuid('pay', occurrenceId_);
