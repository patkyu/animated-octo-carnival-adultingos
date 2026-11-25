import { router } from 'expo-router';
import { useState } from 'react';
import { searchGuides } from '@adultingos/shared';
import { listItems } from '@/db/obligations';
import { listDocuments } from '@/db/documents';
import { loadGuides } from '@/features/guides';
import { toggleItem } from '@/features/actions';
import { useData } from '@/lib/useData';
import { AppText, Card, Icon, Row, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { TaskRow } from '@/ui/TaskRow';
import { EmptyState } from '@/ui/states';

/** Searches tasks, bills, documents and guides at once. */
export default function Search() {
  const [q, setQ] = useState('');
  const query = q.trim();
  const { data } = useData(['search', query], async () => {
    if (query.length < 2) return null;
    const [items, docs, guides] = await Promise.all([listItems({ status: 'all', search: query, limit: 30 }), listDocuments(true), loadGuides({ refresh: false })]);
    const lower = query.toLowerCase();
    return {
      items,
      docs: docs.filter((d) => d.name.toLowerCase().includes(lower) || d.issuer.toLowerCase().includes(lower)),
      guides: searchGuides(guides.guides, query).slice(0, 8),
    };
  });
  const empty = data && !data.items.length && !data.docs.length && !data.guides.length;
  return (
    <Screen title="Search">
      <TextField label="Search everything" value={q} onChangeText={setQ} autoFocus icon="search" placeholder="Tasks, bills, documents, guides" returnKeyType="search" />
      {!data ? <AppText color="textMuted">Type at least 2 characters.</AppText> : empty ? (
        <EmptyState mascot="doki" title="No results" body={`Nothing matched “${query}”.`} />
      ) : (
        <Stack gap={16}>
          {data.items.length ? <Stack gap={8}><AppText variant="section">Tasks & bills</AppText>{data.items.map((i) => <TaskRow key={i.id} item={i} onToggle={toggleItem} />)}</Stack> : null}
          {data.docs.length ? (
            <Stack gap={8}>
              <AppText variant="section">Documents</AppText>
              {data.docs.map((d) => (
                <Card key={d.id} onPress={() => router.push(`/document/${d.id}`)} accessibilityLabel={d.name}>
                  <Row gap={10}><Icon name="file-text" color="primary" /><AppText variant="bodyStrong">{d.name}</AppText></Row>
                </Card>
              ))}
            </Stack>
          ) : null}
          {data.guides.length ? (
            <Stack gap={8}>
              <AppText variant="section">Guides</AppText>
              {data.guides.map((g) => (
                <Card key={g.slug} onPress={() => router.push(`/guide/${g.slug}`)} accessibilityLabel={g.title}>
                  <Row gap={10}><Icon name="book-open" color="primary" /><AppText variant="bodyStrong" style={{ flex: 1 }}>{g.title}</AppText></Row>
                </Card>
              ))}
            </Stack>
          ) : null}
        </Stack>
      )}
    </Screen>
  );
}
