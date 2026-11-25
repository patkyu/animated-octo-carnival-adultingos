import { router } from 'expo-router';
import { useState } from 'react';
import { BACKEND_CONFIGURED, isEnabled } from '@/config/env';
import { getAppState, updateAppState } from '@/db/settings';
import { ensureAnonymousSession } from '@/sync/auth';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { Notice } from '@/ui/states';

/**
 * Get started — no sign-up. With a backend, the app quietly creates a private
 * account for this installation (no e-mail or password); without one, data
 * stays on the phone. E-mail/Google sign-in is behind the account_sign_in flag.
 */
export default function GetStarted() {
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      await updateAppState({ mode: 'guest' });
      void ensureAnonymousSession(); // upgrades to a synced account when online; never blocks
      const app = await getAppState();
      router.replace(app.onboardingComplete ? '/(tabs)' : '/onboarding/personalize');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back={router.canGoBack()} title="Get started" largeTitle subtitle="Let's get your life admin organized.">
      <Stack gap={16}>
        <Mascot id="adu" expression="happy" pose="wave" size={110} style={{ alignSelf: 'center' }} />
        <Card>
          <Stack gap={8}>
            <AppText variant="bodyStrong">No sign-up needed</AppText>
            <AppText color="textMuted">
              {BACKEND_CONFIGURED
                ? 'No e-mail, no password. AdultingOS sets up a private account just for this phone, so your items are saved to the cloud and Ask Adu works.'
                : 'No e-mail, no password. Everything you add is saved on this phone.'}
            </AppText>
          </Stack>
        </Card>
        {BACKEND_CONFIGURED ? (
          <Notice icon="shield" title="Keep a copy of your data">
            Because there's no sign-in, your account can't be recovered if you uninstall the app, clear its data or change phones. Use Profile → Export my data now and then.
          </Notice>
        ) : null}
        <Button label="Get started" onPress={start} loading={busy} full />
        {BACKEND_CONFIGURED && isEnabled('account_sign_in') ? (
          <Button label="I already have an account" variant="ghost" onPress={() => router.push('/auth/account')} full />
        ) : null}
      </Stack>
    </Screen>
  );
}
