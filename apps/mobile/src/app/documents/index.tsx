import { router } from 'expo-router';
import { useState } from 'react';
import { DOCUMENT_STATUS_LABEL, todayInZone, type DocumentStatus } from '@adultingos/shared';
import { listDocuments } from '@/db/documents';
import { useData } from '@/lib/useData';
import { useAppStore } from '@/state/appStore';
import { AppText, Card, Row } from '@/ui/primitives';
import { DocumentCard } from '@/ui/DocumentCard';
import { Segmented } from '@/ui/forms';
import { Stack } from '@/ui/primitives';
import { Fab, Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';

const ORDER: DocumentStatus[] = ['expired', 'expiring_soon', 'in_progress', 'not_obtained', 'active', 'no_expiration', 'archived'];

export default function Documents() {
  const tz = useAppStore((s) => s.profile.timezone);
  const today = todayInZone(tz);
  const [show, setShow] = useState<'current' | 'archived'>('current');
  const { data, isLoading, error, refetch } = useData(['documents', show], async () => {
    const all = await listDocuments(show === 'archived');
    return show === 'archived' ? all.filter((d) => d.archivedAt) : all;
  });
  const groups = ORDER.map((s) => ({ s, items: (data ?? []).filter((d) => d.status === s) })).filter((g) => g.items.length);
  return (
    <>
      <Screen title="Documents" largeTitle subtitle="Doki keeps track of renewals.">
        <Segmented label="Show" value={show} onChange={setShow} options={[{ value: 'current', label: 'Current' }, { value: 'archived', label: 'Archived' }]} />
        {isLoading ? <LoadingList /> : error ? <ErrorState mascot="doki" onRetry={() => refetch()} /> : !data?.length ? (
          show === 'current' ? (
            <EmptyState mascot="doki" title="No documents yet" body="Add your passport, IDs or clearances and Doki will remind you 90, 30 and 7 days before they expire." actionLabel="Track a document" onAction={() => router.push('/document/new')} />
          ) : <EmptyState mascot="doki" title="Nothing archived" body="Archived documents keep their history here." />
        ) : (
          <>
            {data.some((d) => d.status === 'expired' || d.status === 'expiring_soon') ? (
              <Card tone="catDocuments">
                <Row gap={12}>
                  <Mascot id="doki" expression="thoughtful" size={64} />
                  <AppText variant="bodyStrong" color="onCategory" style={{ flex: 1 }}>Some documents need renewing. Open one to see the steps and official link.</AppText>
                </Row>
              </Card>
            ) : null}
            {groups.map((g) => (
              <Stack key={g.s} gap={8}>
                <AppText variant="supportStrong" color="textMuted">{DOCUMENT_STATUS_LABEL[g.s]} · {g.items.length}</AppText>
                {g.items.map((d) => <DocumentCard key={d.id} d={d} today={today} />)}
              </Stack>
            ))}
          </>
        )}
      </Screen>
      <Fab label="Track a document" onPress={() => router.push('/document/new')} />
    </>
  );
}
