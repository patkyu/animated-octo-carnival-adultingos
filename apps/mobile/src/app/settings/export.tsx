import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform } from 'react-native';
import { buildBillsCsv, buildLocalExport, buildTasksCsv } from '@/db/exporter';
import { useAuthStore } from '@/sync/auth';
import { supabase } from '@/sync/supabase';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { Notice } from '@/ui/states';

async function share(name: string, content: string, mime: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Save your AdultingOS export' });
  else toast('Sharing is not available on this device.', 'error');
}

const stamp = () => new Date().toISOString().slice(0, 10);

export default function ExportData() {
  const session = useAuthStore((s) => s.session);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed.', 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Screen title="Export my data">
      <AppText color="textMuted">Download a copy of your information. Files are created on your phone and you choose where to save or send them.</AppText>
      <Card>
        <Stack gap={8}>
          <AppText variant="section">Everything (JSON)</AppText>
          <AppText variant="support" color="textMuted">All your records{session ? ', including AI conversations and consent history from your account' : ' on this device'}, in a documented format.</AppText>
          <Button label="Export JSON" icon="download" loading={busy === 'json'} onPress={() => run('json', async () => {
            const local = await buildLocalExport();
            let server: unknown = null;
            const sb = supabase();
            if (session && sb) {
              const { data, error } = await sb.rpc('export_my_data');
              if (error) throw new Error('Could not fetch your account data. Check your connection.');
              server = data;
            }
            await share(`adultingos-export-${stamp()}.json`, JSON.stringify({ ...local, account: server }, null, 2), 'application/json');
          })} />
        </Stack>
      </Card>
      <Card>
        <Stack gap={8}>
          <AppText variant="section">Spreadsheets (CSV)</AppText>
          <Button label="Tasks CSV" icon="file" variant="secondary" loading={busy === 'tasks'} onPress={() => run('tasks', async () => share(`adultingos-tasks-${stamp()}.csv`, await buildTasksCsv(), 'text/csv'))} />
          <Button label="Bills & payments CSV" icon="file" variant="secondary" loading={busy === 'bills'} onPress={() => run('bills', async () => share(`adultingos-bills-${stamp()}.csv`, await buildBillsCsv(), 'text/csv'))} />
        </Stack>
      </Card>
      <Notice icon="shield">Export files contain your personal information. Keep them somewhere safe.</Notice>
    </Screen>
  );
}
