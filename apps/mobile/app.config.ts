import type { ExpoConfig } from 'expo/config';

/**
 * APP_ENV: development | demo | production
 *  - production: release builds. Unreleased features and unverified guides are hidden.
 *  - demo: separate on-device database seeded with synthetic data (screenshots, reviewers).
 */
const APP_ENV = process.env.APP_ENV ?? 'development';
const isProd = APP_ENV === 'production';

const config: ExpoConfig = {
  name: isProd ? 'AdultingOS' : APP_ENV === 'demo' ? 'AdultingOS Demo' : 'AdultingOS Dev',
  slug: 'adultingos',
  scheme: 'adultingos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#FAF8F3',
  ios: { supportsTablet: true, bundleIdentifier: 'com.adultingos.app' },
  android: {
    // Proposed id — confirm availability in Play Console before the first upload.
    package: isProd ? 'com.adultingos.app' : `com.adultingos.app.${APP_ENV === 'demo' ? 'demo' : 'dev'}`,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: '#174B49',
    },
    // Only what implemented features need: notifications (POST_NOTIFICATIONS),
    // re-arming reminders after a restart (RECEIVE_BOOT_COMPLETED) and vibration.
    permissions: ['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.VIBRATE'],
    blockedPermissions: [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_PHONE_STATE',
      'com.google.android.gms.permission.AD_ID',
      // Pulled in by libraries but unused in v1.0:
      'android.permission.USE_BIOMETRIC', // expo-secure-store (we don't require biometric unlock)
      'android.permission.USE_FINGERPRINT',
      'com.google.android.c2dm.permission.RECEIVE', // remote push (v1.0 uses local notifications only)
      'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE', // install referrer (no attribution)
      'android.permission.READ_APP_BADGE',
      'com.sec.android.provider.badge.permission.READ',
      'com.sec.android.provider.badge.permission.WRITE',
      'com.htc.launcher.permission.READ_SETTINGS',
      'com.htc.launcher.permission.UPDATE_SHORTCUT',
      'com.sonyericsson.home.permission.BROADCAST_BADGE',
      'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
      'com.anddoes.launcher.permission.UPDATE_COUNT',
      'com.majeur.launcher.permission.UPDATE_BADGE',
      'com.huawei.android.launcher.permission.CHANGE_BADGE',
      'com.huawei.android.launcher.permission.READ_SETTINGS',
      'com.huawei.android.launcher.permission.WRITE_SETTINGS',
      'com.oppo.launcher.permission.READ_SETTINGS',
      'com.oppo.launcher.permission.WRITE_SETTINGS',
      'me.everything.badger.permission.BADGE_COUNT_READ',
      'me.everything.badger.permission.BADGE_COUNT_WRITE',
    ],
    predictiveBackGestureEnabled: true,
    allowBackup: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 180, backgroundColor: '#FAF8F3', dark: { image: './assets/splash-icon.png', backgroundColor: '#0F1E22' } },
    ],
    'expo-sharing',
    'expo-localization',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    ['expo-notifications', { color: '#174B49', defaultChannel: 'reminders' }],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 37,
          targetSdkVersion: 36,
          minSdkVersion: 24,
          buildArchs: ['arm64-v8a', 'x86_64'],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          usesCleartextTraffic: false,
        },
      },
    ],
  ],
  experiments: { typedRoutes: false },
  extra: {
    appEnv: APP_ENV,
    // Public values only. The anon key is designed to be public; RLS protects data.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'work.patkyu@gmail.com',
    privacyPolicyUrl: 'https://patkyu.github.io/animated-octo-carnival-adultingos/privacy/',
    termsUrl: 'https://patkyu.github.io/animated-octo-carnival-adultingos/terms/',
    accountDeletionUrl: 'https://patkyu.github.io/animated-octo-carnival-adultingos/delete-account/',
  },
};

export default config;
