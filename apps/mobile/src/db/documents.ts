import { documentStatus, todayInZone, uuidv4, type DocumentInput, type DocumentStage, type DocumentStatus, type LocalDate } from '@adultingos/shared';
import { all, first, tx } from './database';
import { patchRow, softDelete, upsertRow, nowIso } from './mutate';
import { getProfile } from './settings';
import { dataChanged } from '@/lib/events';
import type { SyncState } from './obligations';

type R = Record<string, unknown>;

export interface DocumentRecord {
  id: string;
  templateKey: string;
  name: string;
  issuer: string;
  stage: DocumentStage;
  issueDate: LocalDate | null;
  expiryDate: LocalDate | null;
  referenceLast4: string;
  officialUrl: string;
  reminderOffsets: number[];
  notes: string;
  archivedAt: string | null;
  status: DocumentStatus;
  syncState: SyncState;
}

export interface Renewal {
  id: string;
  documentId: string;
  previousIssueDate: LocalDate | null;
  previousExpiryDate: LocalDate | null;
  newIssueDate: LocalDate | null;
  newExpiryDate: LocalDate | null;
  renewedOn: LocalDate;
  note: string;
}

function map(r: R, today: LocalDate): DocumentRecord {
  let offsets: number[] = [90, 30, 7];
  try {
    offsets = JSON.parse(String(r.reminder_offsets));
  } catch {
    /* keep default */
  }
  const base = {
    id: String(r.id), templateKey: String(r.template_key), name: String(r.name), issuer: String(r.issuer ?? ''), stage: r.stage as DocumentStage,
    issueDate: (r.issue_date as string) ?? null, expiryDate: (r.expiry_date as string) ?? null, referenceLast4: String(r.reference_last4 ?? ''),
    officialUrl: String(r.official_url ?? ''), reminderOffsets: offsets, notes: String(r.notes ?? ''), archivedAt: (r.archived_at as string) ?? null,
    syncState: r.sync_state as SyncState,
  };
  return { ...base, status: documentStatus(base, today) };
}

async function today() {
  return todayInZone((await getProfile()).timezone);
}

export async function listDocuments(includeArchived = false): Promise<DocumentRecord[]> {
  const t = await today();
  const rows = await all<R>(`SELECT * FROM documents WHERE deleted_at IS NULL ${includeArchived ? '' : 'AND archived_at IS NULL'} ORDER BY expiry_date IS NULL, expiry_date, name COLLATE NOCASE`);
  return rows.map((r) => map(r, t));
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const r = await first<R>('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', id);
  return r ? map(r, await today()) : null;
}

function toRow(input: DocumentInput) {
  return {
    template_key: input.templateKey, name: input.name, issuer: input.issuer ?? '', stage: input.stage, issue_date: input.issueDate ?? null,
    expiry_date: input.stage === 'obtained' ? input.expiryDate ?? null : null, reference_last4: input.referenceLast4 ?? '',
    official_url: input.officialUrl ?? '', reminder_offsets: input.reminderOffsets, notes: input.notes ?? '',
  };
}

export async function createDocument(input: DocumentInput): Promise<string> {
  const id = uuidv4();
  await tx(async (db) => upsertRow(db, 'documents', { id, ...toRow(input), archived_at: null, deleted_at: null }));
  dataChanged('documents');
  return id;
}

export async function updateDocument(id: string, input: DocumentInput): Promise<void> {
  await tx(async (db) => patchRow(db, 'documents', id, toRow(input)));
  dataChanged('documents');
}

/** Records a renewal: keeps the previous dates in history and updates the document. */
export async function recordRenewal(id: string, newIssueDate: LocalDate | null, newExpiryDate: LocalDate | null, renewedOn: LocalDate, note = ''): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) throw new Error('This document no longer exists.');
  await tx(async (db) => {
    await upsertRow(db, 'document_renewals', {
      id: uuidv4(), document_id: id, previous_issue_date: doc.issueDate, previous_expiry_date: doc.expiryDate, new_issue_date: newIssueDate,
      new_expiry_date: newExpiryDate, renewed_on: renewedOn, note: note.slice(0, 500), deleted_at: null,
    });
    await patchRow(db, 'documents', id, { issue_date: newIssueDate, expiry_date: newExpiryDate, stage: 'obtained' });
  });
  dataChanged('documents');
}

export async function listRenewals(documentId: string): Promise<Renewal[]> {
  return (await all<R>('SELECT * FROM document_renewals WHERE document_id = ? AND deleted_at IS NULL ORDER BY renewed_on DESC', documentId)).map((r) => ({
    id: String(r.id), documentId: String(r.document_id), previousIssueDate: (r.previous_issue_date as string) ?? null,
    previousExpiryDate: (r.previous_expiry_date as string) ?? null, newIssueDate: (r.new_issue_date as string) ?? null,
    newExpiryDate: (r.new_expiry_date as string) ?? null, renewedOn: String(r.renewed_on), note: String(r.note ?? ''),
  }));
}

export async function setDocumentArchived(id: string, archived: boolean) {
  await tx(async (db) => patchRow(db, 'documents', id, { archived_at: archived ? nowIso() : null }));
  dataChanged('documents');
}

export async function deleteDocument(id: string) {
  await tx(async (db) => {
    const ren = await db.getAllAsync<R>('SELECT id FROM document_renewals WHERE document_id = ? AND deleted_at IS NULL', [id]);
    for (const r of ren) await softDelete(db, 'document_renewals', String(r.id));
    await softDelete(db, 'documents', id);
  });
  dataChanged('documents');
}
