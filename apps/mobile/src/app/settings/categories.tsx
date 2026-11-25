import { useState } from 'react';
import { TASK_CATEGORIES } from '@adultingos/shared';
import { createCustomCategory, deleteCustomCategory, listCustomCategories } from '@/db/obligations';
import { useData } from '@/lib/useData';
import { AppText, Button, Card, IconButton, Row, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { ConfirmDialog, toast } from '@/ui/overlays';

export default function Categories() {
  const { data } = useData(['custom-categories'], listCustomCategories);
  const [name, setName] = useState('');
  const [del, setDel] = useState<{ id: string; name: string } | null>(null);
  return (
    <Screen title="Categories">
      <AppText color="textMuted">Built-in: {TASK_CATEGORIES.map((c) => c.label).join(', ')}.</AppText>
      <Row gap={8}>
        <Stack style={{ flex: 1 }} gap={0}><TextField label="New category" value={name} onChangeText={setName} maxLength={40} /></Stack>
        <Button label="Add" compact disabled={!name.trim()} onPress={async () => { await createCustomCategory(name); setName(''); toast('Category added.', 'success'); }} />
      </Row>
      <Stack gap={8}>
        {(data ?? []).map((c) => (
          <Card key={c.id}>
            <Row>
              <AppText style={{ flex: 1 }}>{c.name}</AppText>
              <IconButton icon="trash-2" label={`Delete ${c.name}`} tone="textMuted" onPress={() => setDel(c)} />
            </Row>
          </Card>
        ))}
        {!data?.length ? <AppText color="textMuted">No custom categories yet.</AppText> : null}
      </Stack>
      <ConfirmDialog visible={!!del} title={`Delete “${del?.name}”?`} message="Tasks in this category move to Personal. Nothing else is deleted." confirmLabel="Delete" destructive
        onCancel={() => setDel(null)} onConfirm={async () => { const d = del!; setDel(null); await deleteCustomCategory(d.id); toast('Category deleted.'); }} />
    </Screen>
  );
}
