import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthError, resendVerification } from '@/sync/auth';
import { AppText, Button, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { toast } from '@/ui/overlays';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Check your e-mail" largeTitle>
      <Stack gap={16} style={{ alignItems: 'center' }}>
        <Mascot id="doki" expression="happy" pose="hold" size={140} />
        <AppText align="center">We sent a verification link to</AppText>
        <AppText variant="bodyStrong" align="center">{email ?? 'your e-mail address'}</AppText>
        <AppText color="textMuted" align="center">Open the link on this phone to finish creating your account. It may take a minute to arrive — check your spam folder too.</AppText>
        <Button
          label="Resend e-mail"
          variant="secondary"
          loading={busy}
          onPress={async () => {
            if (!email) return;
            setBusy(true);
            try {
              await resendVerification(email);
              toast('Verification e-mail sent again.', 'success');
            } catch (e) {
              toast(e instanceof AuthError ? e.message : 'Could not resend right now.', 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button label="Back to sign in" variant="ghost" onPress={() => router.replace('/auth/sign-in')} />
      </Stack>
    </Screen>
  );
}
