import { router } from 'expo-router';
import { getAppState } from '@/db/settings';
import { adoptSession } from './auth';

export async function continueAfterSignIn(userId: string, onConflict: () => void) {
  const res = await adoptSession(userId);
  if (res === 'conflict') return onConflict();
  const app = await getAppState();
  router.replace(app.onboardingComplete ? '/(tabs)' : '/onboarding/personalize');
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use both letters and numbers.';
  return null;
}
