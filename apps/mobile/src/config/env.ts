import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { FEATURE_FLAGS, type FeatureFlag } from './featureFlags';

interface Extra {
  appEnv?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleWebClientId?: string;
  supportEmail?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  accountDeletionUrl?: string;
}
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function webDemoParam(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    // Sticky for the browser session so deep links stay in the demo database.
    if (new URLSearchParams(window.location.search).get('demo') === '1') window.sessionStorage.setItem('aos_demo', '1');
    return window.sessionStorage.getItem('aos_demo') === '1';
  } catch {
    return false;
  }
}

export type AppEnv = 'development' | 'demo' | 'production';
export const APP_ENV: AppEnv = webDemoParam() ? 'demo' : ((extra.appEnv as AppEnv) ?? 'development');
export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_DEMO = APP_ENV === 'demo';

export const SUPABASE_URL = extra.supabaseUrl ?? '';
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? '';
/** False in builds without backend credentials: the app runs fully local and says so. */
export const BACKEND_CONFIGURED = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !IS_DEMO;
export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId ?? '';
export const SUPPORT_EMAIL = extra.supportEmail ?? 'support@adultingos.app';
export const PRIVACY_URL = extra.privacyPolicyUrl ?? 'https://adultingos.app/privacy';
export const TERMS_URL = extra.termsUrl ?? 'https://adultingos.app/terms';
export const DELETION_URL = extra.accountDeletionUrl ?? 'https://adultingos.app/delete-account';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Flags the server may switch on remotely. Safety-related flags are build-time only. */
const REMOTE_OVERRIDABLE: ReadonlySet<FeatureFlag> = new Set(['ai_assistant', 'subscriptions', 'achievements']);
let remoteFlags: Partial<Record<FeatureFlag, boolean>> = {};
export function setRemoteFlags(flags: Partial<Record<string, boolean>>) {
  const next: Partial<Record<FeatureFlag, boolean>> = {};
  for (const [k, v] of Object.entries(flags)) if (REMOTE_OVERRIDABLE.has(k as FeatureFlag) && typeof v === 'boolean') next[k as FeatureFlag] = v;
  remoteFlags = next;
}

export function isEnabled(flag: FeatureFlag): boolean {
  if (flag in remoteFlags) return !!remoteFlags[flag];
  const def = FEATURE_FLAGS[flag];
  return IS_PRODUCTION ? def.production : def.development;
}
