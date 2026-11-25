import { DEFAULT_QUIET_HOURS, DEFAULT_TIMEZONE, type EmploymentStatus, type LivingArrangement, type MascotId, type ResponsibilityArea } from '@adultingos/shared';
import { kvGet, kvSet } from './database';
import { dataChanged } from '@/lib/events';

export interface Profile {
  preferredName: string;
  country: string;
  language: 'en' | 'fil';
  timezone: string;
  employmentStatus: EmploymentStatus | null;
  livingArrangement: LivingArrangement | null;
  responsibilityAreas: ResponsibilityArea[];
  favoriteMascot: MascotId;
  avatar: MascotId;
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
  showMascots: boolean;
  mascotAnimations: boolean;
  gamificationEnabled: boolean;
  aiIncludeRecords: boolean;
}

export interface NotificationPrefs {
  enabled: boolean;
  categories: { task: boolean; bill: boolean; document: boolean; subscription: boolean; weekly_summary: boolean };
  reminderTime: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  weeklySummaryDay: number;
  showDetailsOnLockScreen: boolean;
  mascotNotifications: boolean;
  /** Set once we've asked for OS permission, so we never nag. */
  permissionAsked: boolean;
}

export interface AppState {
  onboardingComplete: boolean;
  introSeen: boolean;
  mode: 'guest' | 'account' | null;
  /** Account id whose data is on this device; used to avoid mixing accounts. */
  ownerUserId: string | null;
  lastSyncAt: string | null;
}

export const DEFAULT_PROFILE: Profile = {
  preferredName: '',
  country: 'PH',
  language: 'en',
  timezone: DEFAULT_TIMEZONE,
  employmentStatus: null,
  livingArrangement: null,
  responsibilityAreas: [],
  favoriteMascot: 'adu',
  avatar: 'adu',
};

export const DEFAULT_PREFS: Preferences = {
  theme: 'system',
  reducedMotion: false,
  showMascots: true,
  mascotAnimations: true,
  gamificationEnabled: true,
  aiIncludeRecords: false,
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  categories: { task: true, bill: true, document: true, subscription: true, weekly_summary: true },
  reminderTime: '09:00',
  quietHoursEnabled: DEFAULT_QUIET_HOURS.enabled,
  quietStart: DEFAULT_QUIET_HOURS.start,
  quietEnd: DEFAULT_QUIET_HOURS.end,
  weeklySummaryDay: 0,
  showDetailsOnLockScreen: false,
  mascotNotifications: true,
  permissionAsked: false,
};

export const DEFAULT_APP_STATE: AppState = { onboardingComplete: false, introSeen: false, mode: null, ownerUserId: null, lastSyncAt: null };

export const getProfile = async () => ({ ...DEFAULT_PROFILE, ...(await kvGet<Partial<Profile>>('profile', {})) });
export const getPreferences = async () => ({ ...DEFAULT_PREFS, ...(await kvGet<Partial<Preferences>>('preferences', {})) });
export const getNotificationPrefs = async () => {
  const stored = await kvGet<Partial<NotificationPrefs>>('notification_prefs', {});
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored, categories: { ...DEFAULT_NOTIFICATION_PREFS.categories, ...(stored.categories ?? {}) } };
};
export const getAppState = async () => ({ ...DEFAULT_APP_STATE, ...(await kvGet<Partial<AppState>>('app_state', {})) });

export async function updateProfile(patch: Partial<Profile>) {
  await kvSet('profile', { ...(await getProfile()), ...patch });
  await kvSet('profile_dirty', true);
  dataChanged('profile');
}
export async function updatePreferences(patch: Partial<Preferences>) {
  await kvSet('preferences', { ...(await getPreferences()), ...patch });
  await kvSet('profile_dirty', true);
  dataChanged('preferences');
}
export async function updateNotificationPrefs(patch: Partial<NotificationPrefs>) {
  await kvSet('notification_prefs', { ...(await getNotificationPrefs()), ...patch });
  await kvSet('profile_dirty', true);
  dataChanged('notifications');
}
export async function updateAppState(patch: Partial<AppState>) {
  await kvSet('app_state', { ...(await getAppState()), ...patch });
  dataChanged('app_state');
}
