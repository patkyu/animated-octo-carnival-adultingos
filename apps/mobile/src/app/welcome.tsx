import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MASCOTS, MASCOT_IDS } from '@adultingos/brand';
import { useT, type TKey } from '@/i18n';
import { updateAppState } from '@/db/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Row, Stack } from '@/ui/primitives';
import { LogoMark, Mascot } from '@/ui/Mascot';

const SLIDES: { title: TKey; body: TKey }[] = [
  { title: 'onb.1.title', body: 'onb.1.body' },
  { title: 'onb.2.title', body: 'onb.2.body' },
  { title: 'onb.3.title', body: 'onb.3.body' },
];

export default function Welcome() {
  const t = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const finish = async () => {
    await updateAppState({ introSeen: true });
    router.replace('/auth/sign-in');
  };
  const slide = SLIDES[i]!;
  return (
    <View style={{ flex: 1, backgroundColor: t.c.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
      <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
        <Row gap={8}>
          <LogoMark size={32} />
          <AppText variant="section">AdultingOS</AppText>
        </Row>
        {!last ? <Button label={tr('common.skip')} variant="ghost" compact onPress={finish} /> : null}
      </Row>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 24 }}>
        <View style={{ backgroundColor: i === 0 ? t.c.catPositive : i === 1 ? t.c.catDocuments : t.c.catCelebrate, borderRadius: 120, padding: 24 }}>
          {i === 0 ? <Mascot id="adu" expression="happy" pose="wave" size={180} label="Adu waving hello" force /> : null}
          {i === 1 ? <Mascot id="doki" expression="thoughtful" pose="hold" size={180} label="Doki holding a document" force /> : null}
          {i === 2 ? (
            <Row wrap gap={0} style={{ width: 220, justifyContent: 'center' }}>
              {MASCOT_IDS.map((id) => <Mascot key={id} id={id} expression="happy" size={72} label={`${MASCOTS[id].name}, ${MASCOTS[id].role}`} force />)}
            </Row>
          ) : null}
        </View>
        <Stack gap={10} style={{ alignItems: 'center' }}>
          <AppText variant="display" align="center" accessibilityLiveRegion="polite">{tr(slide.title)}</AppText>
          <AppText color="textMuted" align="center" style={{ maxWidth: 340 }}>{tr(slide.body)}</AppText>
        </Stack>
      </View>
      <Row style={{ justifyContent: 'center', marginBottom: 16 }} gap={8} accessible accessibilityLabel={`Page ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, k) => <View key={k} style={{ width: k === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? t.c.primary : t.c.borderStrong }} />)}
      </Row>
      <Row gap={12}>
        {i > 0 ? <Button label={tr('common.back')} variant="secondary" onPress={() => setI(i - 1)} style={{ flex: 1 }} /> : null}
        <Button label={last ? tr('onb.getStarted') : tr('common.next')} onPress={() => (last ? finish() : setI(i + 1))} style={{ flex: 2 }} />
      </Row>
    </View>
  );
}
