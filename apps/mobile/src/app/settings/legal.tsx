import { useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '@/config/env';
import { PRIVACY_POLICY, TERMS } from '@/content/legal';
import { AppText, Button, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const d = doc === 'terms' ? TERMS : PRIVACY_POLICY;
  return (
    <Screen title={doc === 'terms' ? 'Terms of Use' : 'Privacy Policy'}>
      <AppText variant="title">{d.title}</AppText>
      <AppText variant="caption" color="textMuted">Version {d.version} · Effective {d.effective}</AppText>
      {d.sections.map((s) => (
        <Stack key={s.heading} gap={6}>
          <AppText variant="section">{s.heading}</AppText>
          {s.body.map((p, i) => <AppText key={i}>{p}</AppText>)}
        </Stack>
      ))}
      <Button label="Open the web version" variant="ghost" onPress={() => Linking.openURL(doc === 'terms' ? TERMS_URL : PRIVACY_URL)} />
    </Screen>
  );
}
