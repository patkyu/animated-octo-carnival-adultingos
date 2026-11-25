import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { wipeAllUserData } from '@/db/database';
import { getAppState, updateAppState } from '@/db/settings';
import { enqueueEverything, resetCursors, syncNow } from './engine';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthStore {
  session: Session | null;
  ready: boolean;
  set: (p: Partial<AuthStore>) => void;
}
export const useAuthStore = create<AuthStore>((set) => ({ session: null, ready: false, set: (p) => set(p) }));

export class AuthError extends Error {}

/** Maps Supabase errors to friendly, non-revealing messages. */
function friendly(e: { message?: string; code?: string; status?: number } | null): string {
  const code = e?.code ?? '';
  if (code === 'invalid_credentials') return 'That e-mail and password combination did not work.';
  if (code === 'email_not_confirmed') return 'Please verify your e-mail first. Check your inbox for the link.';
  if (code === 'user_already_exists' || code === 'email_exists') return 'An account with this e-mail may already exist. Try signing in or resetting your password.';
  if (code === 'weak_password') return 'Choose a stronger password: at least 8 characters with letters and numbers.';
  if (code === 'over_email_send_rate_limit' || e?.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  return 'Something went wrong. Check your connection and try again.';
}

function client() {
  const sb = supabase();
  if (!sb) throw new AuthError('Accounts are not available in this build. You can keep using AdultingOS on this device.');
  return sb;
}

export const redirectUri = (path: string) => Linking.createURL(path);

export async function initAuth(): Promise<void> {
  const sb = supabase();
  if (!sb) {
    useAuthStore.getState().set({ ready: true });
    return;
  }
  const { data } = await sb.auth.getSession();
  useAuthStore.getState().set({ session: data.session, ready: true });
  sb.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().set({ session });
    if (session) void syncNow();
  });
}

export async function signUpWithEmail(email: string, password: string): Promise<{ needsVerification: boolean }> {
  const { data, error } = await client().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUri('auth-callback') } });
  if (error) throw new AuthError(friendly(error));
  return { needsVerification: !data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session) throw new AuthError(friendly(error));
  return data.session;
}

/** Google Sign-In through Supabase OAuth with PKCE in the system browser. */
export async function signInWithGoogle(): Promise<Session | null> {
  const sb = client();
  const redirectTo = redirectUri('auth-callback');
  const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) throw new AuthError(friendly(error));
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // user cancelled
  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new AuthError('Google sign-in did not complete. Please try again.');
  const { data: ex, error: exErr } = await sb.auth.exchangeCodeForSession(code);
  if (exErr || !ex.session) throw new AuthError(friendly(exErr));
  return ex.session;
}

/** Handles the e-mail verification / password-recovery deep link. */
export async function handleAuthCallbackUrl(url: string): Promise<'signed_in' | 'recovery' | 'none'> {
  const sb = supabase();
  if (!sb) return 'none';
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  if (!code) return 'none';
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) throw new AuthError('This link has expired. Please request a new one.');
  return parsed.pathname.includes('reset') ? 'recovery' : 'signed_in';
}

export async function resendVerification(email: string) {
  const { error } = await client().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUri('auth-callback') } });
  if (error) throw new AuthError(friendly(error));
}

export async function requestPasswordReset(email: string) {
  // Always reports success to avoid revealing whether an account exists.
  await client().auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUri('reset-password') }).catch(() => undefined);
}

export async function updatePassword(newPassword: string) {
  const { error } = await client().auth.updateUser({ password: newPassword });
  if (error) throw new AuthError(friendly(error));
}

/**
 * After sign-in: if this device holds guest data, it is adopted into the
 * account (re-uploaded by id — never duplicated). If it holds a *different*
 * account's data, the caller must have confirmed wiping it first.
 */
export async function adoptSession(userId: string): Promise<'adopted' | 'same' | 'conflict'> {
  const app = await getAppState();
  if (app.ownerUserId && app.ownerUserId !== userId) return 'conflict';
  if (app.ownerUserId === userId) return 'same';
  await enqueueEverything();
  await resetCursors();
  await updateAppState({ ownerUserId: userId, mode: 'account' });
  void syncNow();
  return 'adopted';
}

export async function signOut(opts: { keepLocalData: boolean }): Promise<void> {
  const sb = supabase();
  if (sb) await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
  if (!opts.keepLocalData) {
    await wipeAllUserData();
  } else {
    await updateAppState({ ownerUserId: null, mode: 'guest' });
  }
}

/** Server-side permanent deletion, then local wipe. */
export async function deleteAccount(): Promise<void> {
  const sb = client();
  const { error } = await sb.functions.invoke('delete-account', { body: { confirm: 'DELETE', source: 'in_app' } });
  if (error) throw new AuthError('We could not delete your account. Check your connection and try again.');
  await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
  await wipeAllUserData();
}

export async function currentUserEmail(): Promise<string | null> {
  return useAuthStore.getState().session?.user.email ?? null;
}
