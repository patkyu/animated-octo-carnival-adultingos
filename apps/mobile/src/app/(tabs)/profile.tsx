import { router } from 'expo-router';
import { useState } from 'react';
import { MASCOTS } from '@adultingos/brand';
import { APP_VERSION, BACKEND_CONFIGURED, IS_DEMO, isEnabled } from '@/config/env';
import { useAppStore } from '@/state/appStore';
import { signOut, useAuthStore } from '@/sync/auth';
import { syncNow, useSyncStore } from '@/sync/engine';
import { AppText, Button, Card, Divider, Icon, Row, Stack, type IconName } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { ConfirmDialog, toast } from '@/ui/overlays';
import { Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { cancelAllReminders } from '@/notifications/scheduler';

function Item({ icon, label, to, detail }: { icon: IconName; label: string; to: string; detail?: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={detail ? `${label}, ${detail}` : label} onPress={() => router.push(to as never)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 4, backgroundColor: pressed ? t.c.surfaceSunken : 'transparent', borderRadius: 12 })}>
      <Icon name={icon} color="primary" />
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {detail ? <AppText variant="caption" color="textMuted">{detail}</AppText> : null}
      <Icon name="chevron-right" color="textMuted" />
    </Pressable>
  );
}

export default function Profile() {
  const profile = useAppStore((s) => s.profile);
  const app = useAppStore((s) => s.app);
  const prefs = useAppStore((s) => s.prefs);
  const session = useAuthStore((s) => s.session);
  const sync = useSyncStore();
  const [confirmOut, setConfirmOut] = useState(false);
  const m = MASCOTS[profile.favoriteMascot];
  const syncText =
    sync.status === 'syncing' ? 'Syncing…' : sync.status === 'offline' ? 'Offline — will sync later' : sync.status === 'error' ? 'Sync paused — will retry' :
    sync.pending ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to sync` : app.lastSyncAt ? `Backed up ${app.lastSyncAt.slice(0, 16).replace('T', ' ')}` : 'Backed up';

  return (
    <Screen title="Profile" back={false} largeTitle>
      <Card tone="catPositive">
        <Row gap={14}>
          <Mascot id={profile.avatar} expression="happy" size={72} force />
          <Stack gap={2} style={{ flex: 1 }}>
            <AppText variant="section" color="onCategory">{profile.preferredName || 'Hello there'}</AppText>
            <AppText variant="support" color="onCategory">{session?.user.email ?? (IS_DEMO ? 'Demo mode · sample data' : 'Using AdultingOS on this device')}</AppText>
            <AppText variant="caption" color="onCategory">Companion: {m.name} — “{m.phrase}”</AppText>
          </Stack>
        </Row>
      </Card>

      {session ? (
        <Card>
          <Row gap={12}>
            <Icon name={sync.status === 'error' || sync.status === 'offline' ? 'cloud-off' : 'cloud'} color={sync.status === 'error' ? 'warning' : 'success'} />
            <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">{syncText}</AppText>
            <Button label="Sync now" compact variant="ghost" onPress={() => void syncNow()} />
          </Row>
        </Card>
      ) : BACKEND_CONFIGURED && !IS_DEMO ? (
        <Card>
          <Stack gap={8}>
            <AppText variant="bodyStrong">Back up your plans</AppText>
            <AppText variant="support" color="textMuted">Your data is only on this phone. Create an account to back it up and use Ask Adu — your current items move over without duplicates.</AppText>
            <Button label="Create account or sign in" compact onPress={() => router.push('/auth/sign-in')} />
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={0}>
          <Item icon="user" label="Personal profile" to="/settings/profile" />
          <Item icon="smile" label="Companion & mascots" to="/mascots" detail={m.name} />
          {isEnabled('achievements') && prefs.gamificationEnabled ? <Item icon="award" label="Adulting Milestones" to="/achievements" /> : null}
          <Item icon="sun" label="Appearance" to="/settings/appearance" />
          <Item icon="bell" label="Notifications" to="/settings/notifications" />
          <Item icon="tag" label="Custom categories" to="/settings/categories" />
        </Stack>
      </Card>
      <Card>
        <Stack gap={0}>
          <Item icon="file-text" label="Documents" to="/documents" />
          <Item icon="credit-card" label="Bills" to="/bills" />
          {isEnabled('subscriptions') ? <Item icon="repeat" label="Subscriptions" to="/subscriptions" /> : null}
          <Item icon="calendar" label="Calendar" to="/calendar" />
          <Item icon="search" label="Search" to="/search" />
        </Stack>
      </Card>
      <Card>
        <Stack gap={0}>
          <Item icon="shield" label="Privacy and security" to="/settings/privacy" />
          <Item icon="download" label="Export my data" to="/settings/export" />
          <Item icon="help-circle" label="Help center" to="/settings/help" />
          <Item icon="message-square" label="Feedback and reports" to="/settings/feedback" />
          <Item icon="info" label="About AdultingOS" to="/settings/about" detail={`v${APP_VERSION}`} />
        </Stack>
      </Card>
      {session ? <Button label="Sign out" icon="log-out" variant="secondary" full onPress={() => setConfirmOut(true)} /> : null}
      <Divider />
      <AppText variant="caption" color="textMuted" align="center">AdultingOS is an independent app, not affiliated with any government agency.</AppText>

      <ConfirmDialog
        visible={confirmOut}
        title="Sign out?"
        message="For your privacy, signing out removes your data from this phone. Everything that's backed up stays in your account. Changes waiting to sync will be lost."
        confirmLabel="Sign out"
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setConfirmOut(false);
          await cancelAllReminders();
          await signOut({ keepLocalData: false });
          toast('Signed out.');
          router.replace('/welcome');
        }}
      />
    </Screen>
  );
}
