import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { DOCUMENT_STATUS_LABEL, addDays, documentTemplate, expiryCountdown, formatDateLong, formatDateShort, todayInZone, uuidv4, type LocalDate } from '@adultingos/shared';
import { deleteDocument, getDocument, listRenewals, recordRenewal, setDocumentArchived } from '@/db/documents';
import { createTask } from '@/db/obligations';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Button, Card, Divider, Icon, IconButton, Row, Stack, StatusBadge } from '@/ui/primitives';
import { DateField, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { ConfirmDialog, Sheet, toast } from '@/ui/overlays';
import { EmptyState, LoadingList, Notice } from '@/ui/states';
import { SyncLabel } from '@/ui/SyncLabel';
import { STATUS_TONE } from '@/ui/DocumentCard';

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [menu, setMenu] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newIssue, setNewIssue] = useState<LocalDate | null>(today);
  const [newExpiry, setNewExpiry] = useState<LocalDate | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useData(['document', id], async () => {
    const doc = await getDocument(id);
    return doc ? { doc, renewals: await listRenewals(id) } : null;
  });
  if (isLoading) return <Screen title="Document"><LoadingList rows={3} /></Screen>;
  if (!data) return <Screen title="Document"><EmptyState mascot="doki" title="This document isn't here anymore" body="It may have been deleted on another device." actionLabel="All documents" onAction={() => router.replace('/documents')} /></Screen>;
  const { doc, renewals } = data;
  const tpl = documentTemplate(doc.templateKey);
  const needsAction = doc.status === 'expired' || doc.status === 'expiring_soon';

  return (
    <Screen title="Document" actions={<IconButton icon="more-vertical" label="More actions" onPress={() => setMenu(true)} />}>
      <Row gap={12}>
        <Mascot id="doki" expression={doc.status === 'expired' ? 'concern' : doc.status === 'expiring_soon' ? 'thoughtful' : 'happy'} size={72} />
        <Stack gap={6} style={{ flex: 1 }}>
          <AppText variant="title">{doc.name}</AppText>
          <StatusBadge label={DOCUMENT_STATUS_LABEL[doc.status]} tone={STATUS_TONE[doc.status]} />
          <SyncLabel state={doc.syncState} />
        </Stack>
      </Row>

      {doc.status === 'expired' ? (
        <Notice tone="danger" title="This document has expired">Plan your renewal, then use “Record renewal” to update it. Your history is kept.</Notice>
      ) : doc.status === 'expiring_soon' ? (
        <Notice tone="warning" title={expiryCountdown(doc.expiryDate, today)}>It's a good time to start your renewal.</Notice>
      ) : null}

      <Card>
        <Stack gap={12}>
          <Row gap={12}><Icon name="briefcase" color="textMuted" /><AppText>{doc.issuer || 'Issuer not set'}</AppText></Row>
          {doc.issueDate ? <Row gap={12}><Icon name="calendar" color="textMuted" /><AppText>Issued {formatDateLong(doc.issueDate)}</AppText></Row> : null}
          <Row gap={12}><Icon name="clock" color="textMuted" /><AppText>{doc.expiryDate ? `Expires ${formatDateLong(doc.expiryDate)} · ${expiryCountdown(doc.expiryDate, today).toLowerCase()}` : 'No expiration date'}</AppText></Row>
          {doc.expiryDate ? <Row gap={12}><Icon name="bell" color="textMuted" /><AppText>{doc.reminderOffsets.length ? `Reminders ${doc.reminderOffsets.map((n) => (n === 0 ? 'on the day' : `${n} days before`)).join(', ')}` : 'No reminders'}</AppText></Row> : null}
          {doc.referenceLast4 ? <Row gap={12}><Icon name="hash" color="textMuted" /><AppText>Reference ending •••• {doc.referenceLast4}</AppText></Row> : null}
          {doc.notes ? <><Divider /><AppText>{doc.notes}</AppText></> : null}
        </Stack>
      </Card>

      <Stack gap={8}>
        {doc.stage === 'obtained' ? <Button label="Record renewal" icon="refresh-cw" variant={needsAction ? 'primary' : 'secondary'} full onPress={() => setRenewOpen(true)} /> : null}
        {tpl.guideSlug ? <Button label="See the renewal guide" icon="book-open" variant="secondary" full onPress={() => router.push(`/guide/${tpl.guideSlug}`)} /> : null}
        {doc.officialUrl || tpl.officialUrl ? (
          <Button label="Open official website" icon="external-link" variant="ghost" full onPress={() => Linking.openURL(doc.officialUrl || tpl.officialUrl!)} />
        ) : null}
        {needsAction ? (
          <Button label="Add “Renew” task" icon="plus" variant="ghost" full onPress={async () => {
            const { obligationId } = await createTask({
              title: `Renew ${doc.name}`, description: '', category: 'government', priority: 'high', dueDate: addDays(today, 7), dueTime: null,
              recurrence: { freq: 'none', interval: 1 }, reminderOffsets: [1, 0], tags: ['renewal'], notes: '', checklist: [],
            }, { source: 'user', sourceRef: `document:${doc.id}`, id: uuidv4() });
            toast('Renewal task added.', 'success');
            router.push(`/task/${obligationId}`);
          }} />
        ) : null}
      </Stack>

      <Card>
        <Stack gap={8}>
          <AppText variant="section">Renewal history</AppText>
          {renewals.length === 0 ? <AppText color="textMuted">No renewals recorded yet.</AppText> : renewals.map((r) => (
            <Stack key={r.id} gap={2}>
              <AppText variant="bodyStrong">Renewed {formatDateShort(r.renewedOn)}</AppText>
              <AppText variant="support" color="textMuted">
                {r.previousExpiryDate ? `Was valid until ${formatDateShort(r.previousExpiryDate)}` : 'No previous expiry'} → {r.newExpiryDate ? `now valid until ${formatDateShort(r.newExpiryDate)}` : 'no expiry'}
              </AppText>
              {r.note ? <AppText variant="support">{r.note}</AppText> : null}
            </Stack>
          ))}
        </Stack>
      </Card>

      <Sheet visible={renewOpen} onClose={() => setRenewOpen(false)} title="Record renewal"
        footer={<Button label="Save renewal" full onPress={async () => {
          if (newExpiry && newIssue && newExpiry < newIssue) return toast('The new expiry date must be after the issue date.', 'error');
          await recordRenewal(id, newIssue, newExpiry, today, note);
          setRenewOpen(false);
          toast('Renewal saved. Previous dates are kept in history.', 'success', { mascot: 'doki' });
        }} />}>
        <Stack gap={16}>
          <DateField label="New issue date" value={newIssue} onChange={setNewIssue} quick={false} allowClear />
          <DateField label="New expiry date" value={newExpiry} onChange={setNewExpiry} quick={false} allowClear helper="Leave empty if the renewed document does not expire." />
          <TextField label="Note (optional)" value={note} onChangeText={setNote} maxLength={500} />
        </Stack>
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Document options">
        <Stack gap={6}>
          <Button label="Edit" icon="edit-2" variant="secondary" full onPress={() => { setMenu(false); router.push(`/document/edit/${id}`); }} />
          <Button label={doc.archivedAt ? 'Restore' : 'Archive'} icon="archive" variant="secondary" full onPress={async () => { setMenu(false); await setDocumentArchived(id, !doc.archivedAt); toast(doc.archivedAt ? 'Restored.' : 'Archived.'); }} />
          <Divider />
          <Button label="Delete" icon="trash-2" variant="danger" full onPress={() => { setMenu(false); setConfirmDelete(true); }} />
        </Stack>
      </Sheet>
      <ConfirmDialog visible={confirmDelete} title="Delete this document?" message="This removes the document, its renewal history and its reminders. Archive it instead to keep the history." confirmLabel="Delete" destructive
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { setConfirmDelete(false); await deleteDocument(id); toast('Document deleted.'); router.back(); }} />
    </Screen>
  );
}
