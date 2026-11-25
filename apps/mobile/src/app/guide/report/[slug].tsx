import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { reportGuide, type GuideReportReason } from '@/features/reports';
import { AppText, Button, Stack } from '@/ui/primitives';
import { SelectField, TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';

export default function ReportGuide() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [reason, setReason] = useState<GuideReportReason>('outdated');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Report a problem" footer={<Button label="Send report" full loading={busy} onPress={async () => {
      setBusy(true);
      const res = await reportGuide(slug, reason, details);
      setBusy(false);
      toast(res === 'sent' ? 'Thanks! Our editors will review it.' : 'Your e-mail app opened with the report.', 'success');
      router.back();
    }} />}>
      <AppText color="textMuted">Tell us what's wrong. Reports go to our editors, who check them against official sources.</AppText>
      <Stack gap={16}>
        <SelectField label="What's the problem?" value={reason} onChange={setReason} options={[
          { value: 'outdated', label: 'Information is outdated' }, { value: 'incorrect', label: 'Information is wrong' }, { value: 'broken_link', label: 'A link is broken' },
          { value: 'unclear', label: "It's confusing" }, { value: 'other', label: 'Something else' },
        ]} />
        <TextField label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} helper="Please don't include personal information or ID numbers." />
      </Stack>
    </Screen>
  );
}
