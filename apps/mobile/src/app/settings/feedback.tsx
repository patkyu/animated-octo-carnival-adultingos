import { router } from 'expo-router';
import { useState } from 'react';
import { submitFeedback, type FeedbackKind } from '@/features/reports';
import { AppText, Button, Stack } from '@/ui/primitives';
import { Segmented, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

export default function Feedback() {
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Feedback and reports" footer={<Button label="Send" full disabled={message.trim().length < 3} loading={busy} onPress={async () => {
      setBusy(true);
      const res = await submitFeedback(kind, message.trim());
      setBusy(false);
      toast(res === 'sent' ? 'Thank you! We read every message.' : 'Your e-mail app opened with your message.', 'success');
      router.back();
    }} />}>
      <Stack gap={16}>
        <Segmented label="Type" value={kind} onChange={setKind} options={[{ value: 'bug', label: 'Bug' }, { value: 'feature', label: 'Idea' }, { value: 'support', label: 'Help' }, { value: 'other', label: 'Other' }]} />
        <TextField label={kind === 'bug' ? 'What happened?' : kind === 'feature' ? 'What would help you?' : 'Your message'} value={message} onChangeText={setMessage} multiline maxLength={4000}
          helper="Please don't include ID numbers, passwords or financial details." />
        <AppText variant="caption" color="textMuted">To report wrong government information, open the guide and tap “Report outdated or wrong information”. To report an AI answer, use “Report this answer” under it.</AppText>
      </Stack>
    </Screen>
  );
}
