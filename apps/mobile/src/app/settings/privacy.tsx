import { router } from 'expo-router';
import { useState } from 'react';
import { BACKEND_CONFIGURED } from '@/config/env';
import { updatePreferences } from '@/db/settings';
import { wipeAllUserData } from '@/db/database';
import { AiError, deleteAllConversations, recordConsent } from '@/features/ai';
import { useChat } from '@/features/chatStore';
import { cancelAllReminders } from '@/notifications/scheduler';
import { useAppStore } from '@/state/appStore';
import { supabase } from '@/sync/supabase';
import { isAnonymousSession, useAuthStore } from '@/sync/auth';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { ToggleRow } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { ConfirmDialog, toast } from '@/ui/overlays';

export default function Privacy() {
  const prefs = useAppStore((s) => s.prefs);
  const session = useAuthStore((s) => s.session);
  const [confirm, setConfirm] = useState<'ai' | 'local' | 'sessions' | null>(null);
  return (
    <Screen title="Privacy and security">
      <AppText color="textMuted">AdultingOS collects only what it needs to organize your responsibilities. We never sell your data or show ads.</AppText>
      {session && !isAnonymousSession(session) ? (
        <Card>
          <Stack gap={8}>
            <AppText variant="section">Account</AppText>
            <Button label="Change password" icon="lock" variant="secondary" full onPress={() => router.push('/reset-password')} />
            <Button label="Sign out of all devices" icon="log-out" variant="secondary" full onPress={() => setConfirm('sessions')} />
          </Stack>
        </Card>
      ) : null}
      {BACKEND_CONFIGURED && session ? (
        <Card>
          <Stack gap={8}>
            <AppText variant="section">Ask Adu</AppText>
            <ToggleRow label="Let Adu see my upcoming items" helper="Titles and due dates only, when you ask about your schedule." value={prefs.aiIncludeRecords}
              onChange={async (v) => { await updatePreferences({ aiIncludeRecords: v }); await recordConsent('ai_record_access', v).catch(() => undefined); }} />
            <Button label="Withdraw AI consent" variant="ghost" full onPress={async () => { await recordConsent('ai_processing', false).catch(() => undefined); toast('Consent withdrawn. Ask Adu will ask again before use.'); }} />
            <Button label="Delete all AI conversations" icon="trash-2" variant="secondary" full onPress={() => setConfirm('ai')} />
          </Stack>
        </Card>
      ) : null}
      <Card>
        <Stack gap={8}>
          <AppText variant="section">Your data</AppText>
          <Button label="Export my data" icon="download" variant="secondary" full onPress={() => router.push('/settings/export')} />
          {session ? <Button label="Delete my account" icon="user-x" variant="danger" full onPress={() => router.push('/settings/delete-account')} /> : (
            <Button label="Delete all data on this device" icon="trash-2" variant="danger" full onPress={() => setConfirm('local')} />
          )}
        </Stack>
      </Card>
      <Card>
        <Stack gap={4}>
          <Button label="Privacy Policy" variant="ghost" full onPress={() => router.push('/settings/legal?doc=privacy')} />
          <Button label="Terms of Use" variant="ghost" full onPress={() => router.push('/settings/legal?doc=terms')} />
        </Stack>
      </Card>
      <ConfirmDialog visible={confirm === 'ai'} title="Delete all AI conversations?" message="Every conversation with Adu is permanently deleted from your account. Tasks you added from suggestions stay." confirmLabel="Delete" destructive
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          try {
            const n = await deleteAllConversations();
            useChat.getState().reset();
            toast(`Deleted ${n} conversation${n === 1 ? '' : 's'}.`, 'success');
          } catch (e) {
            toast(e instanceof AiError ? e.message : 'Could not delete.', 'error');
          }
        }} />
      <ConfirmDialog visible={confirm === 'local'} title="Delete everything on this device?" message="All tasks, bills, documents and settings on this phone will be erased. This can't be undone." confirmLabel="Delete everything" destructive
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { setConfirm(null); await cancelAllReminders(); await wipeAllUserData(); toast('All local data deleted.'); router.replace('/welcome'); }} />
      <ConfirmDialog visible={confirm === 'sessions'} title="Sign out everywhere?" message="You'll be signed out on all devices, including this one. Data on this phone is removed for privacy; your backup stays in your account." confirmLabel="Sign out everywhere"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await supabase()?.auth.signOut({ scope: 'global' }).catch(() => undefined);
          await cancelAllReminders();
          await wipeAllUserData();
          router.replace('/welcome');
        }} />
    </Screen>
  );
}
