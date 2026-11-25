import { Redirect } from 'expo-router';
import { useAppStore } from '@/state/appStore';

/** Entry: first-run users see the welcome flow; everyone else lands on Home. */
export default function Index() {
  const app = useAppStore((s) => s.app);
  if (!app.introSeen) return <Redirect href="/welcome" />;
  if (!app.mode) return <Redirect href="/auth/sign-in" />;
  if (!app.onboardingComplete) return <Redirect href="/onboarding/personalize" />;
  return <Redirect href="/(tabs)" />;
}
