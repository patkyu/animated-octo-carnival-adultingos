import { router, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { AuthError, handleAuthCallbackUrl } from '@/sync/auth';
import { supabase } from '@/sync/supabase';
import { continueAfterSignIn } from '@/sync/authFlow';
import { Screen } from '@/ui/layout';
import { ErrorState, LoadingList } from '@/ui/states';

/** Landing route for e-mail verification and OAuth deep links (adultingos://auth-callback?code=…). */
export default function AuthCallback() {
  const params = useGlobalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const url = (await Linking.getInitialURL()) ?? `adultingos://auth-callback?code=${params.code ?? ''}`;
        await handleAuthCallbackUrl(url.includes('code=') ? url : `adultingos://auth-callback?code=${params.code ?? ''}`);
        const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
        if (data.session) await continueAfterSignIn(data.session.user.id, () => router.replace('/auth/sign-in'));
        else router.replace('/auth/sign-in');
      } catch (e) {
        setError(e instanceof AuthError ? e.message : 'This link could not be used.');
      }
    })();
  }, [params.code]);
  return (
    <Screen title="Signing you in" back={false}>
      {error ? <ErrorState title="Link didn't work" body={error} onRetry={() => router.replace('/auth/sign-in')} /> : <LoadingList rows={2} label="Signing you in" />}
    </Screen>
  );
}
