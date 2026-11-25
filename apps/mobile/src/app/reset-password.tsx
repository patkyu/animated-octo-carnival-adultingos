import { router, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthError, handleAuthCallbackUrl, updatePassword } from '@/sync/auth';
import { Button, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { toast } from '@/ui/overlays';
import { ErrorState } from '@/ui/states';
import { passwordProblem } from '@/sync/authFlow';

/** Opened from the password-reset e-mail (adultingos://reset-password?code=…). */
export default function ResetPassword() {
  const { code } = useGlobalSearchParams<{ code?: string }>();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!code) return setReady(true); // already signed in (Settings → Change password)
    handleAuthCallbackUrl(`adultingos://reset-password?code=${code}`)
      .then(() => setReady(true))
      .catch((e) => setLinkError(e instanceof AuthError ? e.message : 'This link has expired.'));
  }, [code]);
  if (linkError) return <Screen title="Reset password"><ErrorState title="Link expired" body={linkError} onRetry={() => router.replace('/auth/forgot')} /></Screen>;
  return (
    <Screen title="Choose a new password" largeTitle>
      <Stack gap={16}>
        <TextField label="New password" helper="At least 8 characters, with letters and numbers." value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" error={error} />
        <Button
          label="Save password"
          disabled={!ready}
          loading={busy}
          full
          onPress={async () => {
            const p = passwordProblem(pw);
            if (p) return setError(p);
            setBusy(true);
            try {
              await updatePassword(pw);
              toast('Password updated.', 'success');
              router.replace('/(tabs)');
            } catch (e) {
              setError(e instanceof AuthError ? e.message : 'Could not update your password.');
            } finally {
              setBusy(false);
            }
          }}
        />
      </Stack>
    </Screen>
  );
}
