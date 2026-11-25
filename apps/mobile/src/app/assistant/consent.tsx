import { router } from 'expo-router';
import { useState } from 'react';
import { recordConsent } from '@/features/ai';
import { updatePreferences } from '@/db/settings';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

/** Explicit, revocable consent before any message is sent to the AI provider. */
export default function AiConsent() {
  const [records, setRecords] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="How Ask Adu works" largeTitle footer={
      <Stack gap={8}>
        <Button label="I understand — continue" full loading={busy} onPress={async () => {
          setBusy(true);
          try {
            await recordConsent('ai_processing', true);
            await recordConsent('ai_record_access', records);
            await updatePreferences({ aiIncludeRecords: records });
            router.back();
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not save your choice.', 'error');
          } finally {
            setBusy(false);
          }
        }} />
        <Button label="Not now" variant="ghost" full onPress={() => router.back()} />
      </Stack>
    }>
      <Card>
        <Stack gap={10}>
          <AppText variant="bodyStrong">What happens to your question</AppText>
          <AppText>• Your question is sent to AdultingOS servers and to our AI provider (currently Anthropic) to generate an answer.</AppText>
          <AppText>• Adu answers using guides our editors have verified, and says so when it can't verify something.</AppText>
          <AppText>• Long numbers (like ID or card numbers) are removed before your message is processed. Please don't share them.</AppText>
          <AppText>• Conversations are saved to your account so you can see them later. You can delete them any time in Settings → Privacy.</AppText>
          <AppText>• Suggested tasks are never added without your confirmation.</AppText>
        </Stack>
      </Card>
      <ToggleRow
        label="Let Adu see my upcoming items"
        helper="Only titles and due dates for the next 14 days (and documents expiring soon), and only when you ask about your schedule. Never amounts, notes or reference numbers."
        value={records}
        onChange={setRecords}
      />
      <AppText variant="caption" color="textMuted">You can change these choices in Settings → Privacy and security. See the Privacy Policy for details on AI processing.</AppText>
      <Button label="Read the Privacy Policy" variant="ghost" compact onPress={() => router.push('/settings/legal?doc=privacy')} />
    </Screen>
  );
}
