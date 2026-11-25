import { daysBetween, type LocalDate } from './dates';

export const DOCUMENT_STATUSES = [
  'not_obtained', 'in_progress', 'active', 'expiring_soon', 'expired', 'no_expiration', 'archived',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** What the user tells us; the visible status is derived. */
export const DOCUMENT_STAGES = ['not_obtained', 'in_progress', 'obtained'] as const;
export type DocumentStage = (typeof DOCUMENT_STAGES)[number];

export const DEFAULT_RENEWAL_OFFSETS = [90, 30, 7] as const;
export const RENEWAL_OFFSET_CHOICES = [90, 60, 30, 7, 0] as const;

export interface DocumentLike {
  stage: DocumentStage;
  expiryDate: LocalDate | null;
  archivedAt?: string | null;
  reminderOffsets?: readonly number[];
}

/** "Expiring soon" begins at the earliest configured reminder (default 90 days). */
export function expiringSoonWindow(offsets: readonly number[] | undefined): number {
  const valid = (offsets ?? []).filter((n) => n > 0);
  return valid.length ? Math.max(...valid) : 90;
}

export function documentStatus(doc: DocumentLike, today: LocalDate): DocumentStatus {
  if (doc.archivedAt) return 'archived';
  if (doc.stage === 'not_obtained') return 'not_obtained';
  if (doc.stage === 'in_progress') return 'in_progress';
  if (!doc.expiryDate) return 'no_expiration';
  const days = daysBetween(today, doc.expiryDate);
  if (days < 0) return 'expired';
  if (days <= expiringSoonWindow(doc.reminderOffsets)) return 'expiring_soon';
  return 'active';
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  not_obtained: 'Not yet obtained',
  in_progress: 'In progress',
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  no_expiration: 'No expiration',
  archived: 'Archived',
};

export function expiryCountdown(expiryDate: LocalDate | null, today: LocalDate): string {
  if (!expiryDate) return 'No expiration date';
  const d = daysBetween(today, expiryDate);
  if (d === 0) return 'Expires today';
  if (d === 1) return 'Expires tomorrow';
  if (d > 1) return `Expires in ${d} days`;
  if (d === -1) return 'Expired yesterday';
  return `Expired ${-d} days ago`;
}

/**
 * Masks a reference number so only the last 4 characters are kept. We never
 * store the full number: the app masks before saving.
 */
export function maskReference(raw: string): string {
  const compact = raw.replace(/[\s-]/g, '');
  if (compact.length === 0) return '';
  const tail = compact.slice(-4);
  return `•••• ${tail}`;
}
