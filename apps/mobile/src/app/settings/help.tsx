import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { FAQ } from '@/content/legal';
import { SUPPORT_EMAIL } from '@/config/env';
import { openEmail } from '@/features/reports';
import { AppText, Button, Card, Icon, Row, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';

export default function Help() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen title="Help center">
      <Row gap={12}>
        <Mascot id="adu" expression="happy" size={64} />
        <AppText style={{ flex: 1 }}>Common questions, answered. One step at a time.</AppText>
      </Row>
      <Stack gap={8}>
        {FAQ.map((f, i) => (
          <Card key={f.q}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Row gap={10}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>{f.q}</AppText>
                <Icon name={open === i ? 'chevron-up' : 'chevron-down'} color="textMuted" />
              </Row>
            </Pressable>
            {open === i ? <AppText style={{ marginTop: 8 }}>{f.a}</AppText> : null}
          </Card>
        ))}
      </Stack>
      <Button label="Contact support" icon="mail" variant="secondary" full onPress={() => openEmail('AdultingOS support', '')} />
      <AppText variant="caption" color="textMuted" align="center">{SUPPORT_EMAIL}</AppText>
      <Button label="Report a bug or suggest a feature" variant="ghost" full onPress={() => router.push('/settings/feedback')} />
    </Screen>
  );
}
