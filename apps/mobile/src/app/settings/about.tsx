import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { GOVERNMENT_DISCLAIMER } from '@adultingos/shared';
import { APP_ENV, APP_VERSION } from '@/config/env';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { LogoMark } from '@/ui/Mascot';

const LICENSES: { name: string; license: string }[] = [
  { name: 'React Native, React', license: 'MIT' },
  { name: 'Expo SDK and modules', license: 'MIT' },
  { name: 'Expo Router', license: 'MIT' },
  { name: 'React Native Reanimated, Gesture Handler, Screens, SVG, Safe Area Context', license: 'MIT' },
  { name: 'Supabase JS', license: 'MIT' },
  { name: 'TanStack Query', license: 'MIT' },
  { name: 'Zustand', license: 'MIT' },
  { name: 'React Hook Form, @hookform/resolvers', license: 'MIT' },
  { name: 'Zod', license: 'MIT' },
  { name: 'Feather icons (@expo/vector-icons)', license: 'MIT' },
  { name: 'Inter typeface', license: 'SIL Open Font License 1.1' },
  { name: 'Plus Jakarta Sans typeface', license: 'SIL Open Font License 1.1' },
  { name: 'NetInfo, DateTimePicker (React Native Community)', license: 'MIT' },
];

export default function About() {
  return (
    <Screen title="About">
      <Stack gap={8} style={{ alignItems: 'center' }}>
        <LogoMark size={72} />
        <AppText variant="title">AdultingOS</AppText>
        <AppText color="textMuted">Life is complicated. Adulting shouldn't be.</AppText>
        <AppText variant="caption" color="textMuted">Version {APP_VERSION} ({Platform.OS}{APP_ENV !== 'production' ? ` · ${APP_ENV}` : ''}) · runtime {Constants.expoConfig?.sdkVersion ?? ''}</AppText>
      </Stack>
      <AppText variant="support">{GOVERNMENT_DISCLAIMER}</AppText>
      <Button label="Rate AdultingOS on Google Play" icon="star" variant="secondary" full onPress={() => Linking.openURL('market://details?id=com.adultingos.app').catch(() => Linking.openURL('https://play.google.com/store/apps/details?id=com.adultingos.app'))} />
      <Card>
        <Stack gap={6}>
          <AppText variant="section">Open-source licenses</AppText>
          {LICENSES.map((l) => <AppText key={l.name} variant="support">{l.name} — {l.license}</AppText>)}
          <AppText variant="caption" color="textMuted">Full license texts are included in the release notes package (docs/legal/third-party-licenses.md).</AppText>
        </Stack>
      </Card>
      <AppText variant="caption" color="textMuted" align="center">The Adulting Buddies, logo and illustrations are original AdultingOS artwork.</AppText>
    </Screen>
  );
}
