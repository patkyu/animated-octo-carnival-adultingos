import { useState } from 'react';
import { requestPasswordReset } from '@/sync/auth';
import { AppText, Button, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Notice } from '@/ui/states';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen title="Reset password" largeTitle subtitle="We'll e-mail you a link to choose a new password.">
      <Stack gap={16}>
        {sent ? (
          <Notice tone="success" icon="check-circle" title="Check your inbox">
            If an account exists for that address, a reset link is on its way. Open it on this phone.
          </Notice>
        ) : (
          <>
            <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" icon="mail" error={error} />
            <Button
              label="Send reset link"
              loading={busy}
              full
              onPress={async () => {
                if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid e-mail address.');
                setError(null);
                setBusy(true);
                await requestPasswordReset(email);
                setBusy(false);
                setSent(true);
              }}
            />
          </>
        )}
        <AppText variant="caption" color="textMuted">For your security we never confirm whether an e-mail address has an account.</AppText>
      </Stack>
    </Screen>
  );
}
