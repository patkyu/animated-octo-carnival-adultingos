import { create } from 'zustand';
import {
  DEFAULT_APP_STATE, DEFAULT_NOTIFICATION_PREFS, DEFAULT_PREFS, DEFAULT_PROFILE, getAppState, getNotificationPrefs, getPreferences, getProfile,
  type AppState, type NotificationPrefs, type Preferences, type Profile,
} from '@/db/settings';

interface Store {
  loaded: boolean;
  profile: Profile;
  prefs: Preferences;
  notif: NotificationPrefs;
  app: AppState;
  systemReduceMotion: boolean;
  reload: () => Promise<void>;
  setSystemReduceMotion: (v: boolean) => void;
}

/** Reactive mirror of on-device settings; reloaded whenever settings change. */
export const useAppStore = create<Store>((set) => ({
  loaded: false,
  profile: DEFAULT_PROFILE,
  prefs: DEFAULT_PREFS,
  notif: DEFAULT_NOTIFICATION_PREFS,
  app: DEFAULT_APP_STATE,
  systemReduceMotion: false,
  reload: async () => {
    const [profile, prefs, notif, app] = await Promise.all([getProfile(), getPreferences(), getNotificationPrefs(), getAppState()]);
    set({ profile, prefs, notif, app, loaded: true });
  },
  setSystemReduceMotion: (v) => set({ systemReduceMotion: v }),
}));

/** Motion is reduced if the OS asks for it or the user turned it on in AdultingOS. */
export function useReducedMotion(): boolean {
  return useAppStore((s) => s.systemReduceMotion || s.prefs.reducedMotion);
}
