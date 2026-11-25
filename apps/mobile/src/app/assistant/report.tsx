import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AiError, reportAiMessage } from '@/features/ai';
import { useChat } from '@/features/chatStore';
import { AppText, Button, Stack } from '@/ui/primitives';
import { SelectField, TextField, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

type Reason = 'inaccurate' | 'offensive' | 'unsafe' | 'privacy' | 'other';

/** In-app reporting of AI responses (Google Play AI-generated content policy). */
export default function ReportAi() {
  const { messageId } = useLocalSearchParams<{ messageId: string }>();
  const msg = useChat((s) => s.messages.find((m) => m.id === messageId));
  const [reason, setReason] = useState<Reason>('inaccurate');
  const [details, setDetails] = useState('');
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Report this answer" footer={<Button label="Send report" full loading={busy} onPress={async () => {
      setBusy(true);
      try {
        const excerpt = share && msg ? `Q: ${msg.question ?? ''}\n\nA: ${msg.content}` : '';
        await reportAiMessage(messageId, reason, details, excerpt);
        toast('Thanks — our team will review it.', 'success');
        router.back();
      } catch (e) {
        toast(e instanceof AiError ? e.message : 'Could not send the report.', 'error');
      } finally {
        setBusy(false);
      }
    }} />}>
      <AppText color="textMuted">Reports help us fix wrong or harmful answers.</AppText>
      <Stack gap={16}>
        <SelectField label="What's wrong?" value={reason} onChange={setReason} options={[
          { value: 'inaccurate', label: 'Inaccurate or outdated' }, { value: 'offensive', label: 'Offensive or inappropriate' }, { value: 'unsafe', label: 'Unsafe or harmful advice' },
          { value: 'privacy', label: 'Privacy concern' }, { value: 'other', label: 'Something else' },
        ]} />
        <TextField label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
        <ToggleRow label="Share this question and answer with reviewers" helper="Reviewers can't see your conversations otherwise. Turn off to send only the reason." value={share} onChange={setShare} />
      </Stack>
    </Screen>
  );
}
