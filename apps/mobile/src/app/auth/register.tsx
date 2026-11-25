import { router } from 'expo-router';
import { useState } from 'react';
import { AuthError, signUpWithEmail } from '@/sync/auth';
import { AppText, Button, Stack } from '@/ui/primitives';
import { TextField, ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { continueAfterSignIn, passwordProblem } from '@/sync/authFlow';
import { supabase } from '@/sync/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const submit = async () => {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid e-mail address.';
    const pw = passwordProblem(password);
    if (pw) next.password = pw;
    if (!agree) next.form = 'Please accept the Terms and Privacy Policy to create an account.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const { needsVerification } = await signUpWithEmail(email, password);
      if (needsVerification) router.replace({ pathname: '/auth/verify', params: { email: email.trim() } });
      else {
        const { data } = await supabase()!.auth.getSession();
        if (data.session) await continueAfterSignIn(data.session.user.id, () => router.replace('/auth/sign-in'));
      }
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Create account" largeTitle subtitle="Back up your plans and use Ask Adu.">
      <Stack gap={16}>
        <TextField label="E-mail" required value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" icon="mail" error={errors.email} />
        <TextField label="Password" required helper="At least 8 characters, with letters and numbers." value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" icon="lock" error={errors.password} />
        <ToggleRow label="I accept the Terms of Use and Privacy Policy" value={agree} onChange={setAgree} />
        <Stack gap={0}>
          <Button label="Read the Terms of Use" variant="ghost" compact onPress={() => router.push('/settings/legal?doc=terms')} />
          <Button label="Read the Privacy Policy" variant="ghost" compact onPress={() => router.push('/settings/legal?doc=privacy')} />
        </Stack>
        {errors.form ? <AppText color="danger" accessibilityLiveRegion="polite">{errors.form}</AppText> : null}
        <Button label="Create account" onPress={submit} loading={busy} full />
        <AppText variant="caption" color="textMuted">
          We only ask for an e-mail and password. AdultingOS never asks for government ID numbers, bank credentials or income details.
        </AppText>
      </Stack>
    </Screen>
  );
}
