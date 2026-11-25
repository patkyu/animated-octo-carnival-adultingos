import { router } from 'expo-router';
import { useState } from 'react';
import { BACKEND_CONFIGURED } from '@/config/env';
import { getAppState, updateAppState } from '@/db/settings';
import { AuthError, signInWithEmail, signInWithGoogle } from '@/sync/auth';
import { continueAfterSignIn } from '@/sync/authFlow';
import { AppText, Button, Divider, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { ConfirmDialog } from '@/ui/overlays';
import { Notice } from '@/ui/states';
import { wipeAllUserData } from '@/db/database';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictUser, setConflictUser] = useState<string | null>(null);

  const done = (uid: string) => continueAfterSignIn(uid, () => setConflictUser(uid));

  const submit = async () => {
    setError(null);
    if (!email.includes('@') || password.length < 1) return setError('Enter your e-mail and password.');
    setBusy('email');
    try {
      const s = await signInWithEmail(email, password);
      await done(s.user.id);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      const s = await signInWithGoogle();
      if (s) await done(s.user.id);
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Google sign-in did not complete.');
    } finally {
      setBusy(null);
    }
  };

  const guest = async () => {
    await updateAppState({ mode: 'guest' });
    const app = await getAppState();
    router.replace(app.onboardingComplete ? '/(tabs)' : '/onboarding/personalize');
  };

  return (
    <Screen back={router.canGoBack()} title="Sign in" largeTitle subtitle="Use an existing AdultingOS account.">
      <Stack gap={16}>
        <Mascot id="adu" expression="happy" pose="wave" size={110} style={{ alignSelf: 'center' }} />
        {!BACKEND_CONFIGURED ? (
          <Notice title="Accounts aren't set up in this build">
            You can use AdultingOS fully on this device without an account. Cloud backup, sync and Ask Adu need an account.
          </Notice>
        ) : (
          <>
            <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" icon="mail" />
            <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" icon="lock" error={error} onSubmitEditing={submit} />
            <Button label="Sign in" onPress={submit} loading={busy === 'email'} disabled={!!busy} full />
            <Button label="Forgot password?" variant="ghost" onPress={() => router.push('/auth/forgot')} />
            <Divider />
            <Button label="Continue with Google" icon="globe" variant="secondary" onPress={google} loading={busy === 'google'} disabled={!!busy} full />
            <Button label="Create an account" variant="soft" onPress={() => router.push('/auth/register')} full />
          </>
        )}
        <Divider />
        <Stack gap={6}>
          <Button label={BACKEND_CONFIGURED ? 'Use without an account' : 'Continue on this device'} variant={BACKEND_CONFIGURED ? 'ghost' : 'primary'} onPress={guest} full />
          <AppText variant="caption" color="textMuted" align="center">
            Guest data stays only on this phone. You can create an account later and move it over without duplicates.
          </AppText>
        </Stack>
      </Stack>
      <ConfirmDialog
        visible={!!conflictUser}
        title="Another account's data is on this device"
        message="To protect privacy, data from a different account can't be mixed. Remove it from this device and continue? It stays safe in that account's cloud backup if it was synced."
        confirmLabel="Remove and continue"
        destructive
        onCancel={() => setConflictUser(null)}
        onConfirm={async () => {
          const uid = conflictUser!;
          setConflictUser(null);
          await wipeAllUserData();
          await updateAppState({ introSeen: true });
          await done(uid);
        }}
      />
    </Screen>
  );
}
