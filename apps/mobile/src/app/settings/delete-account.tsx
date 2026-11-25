import { router } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { DELETION_URL } from '@/config/env';
import { AuthError, deleteAccount, useAuthStore } from '@/sync/auth';
import { cancelAllReminders } from '@/notifications/scheduler';
import { AppText, Button, Card, Stack } from '@/ui/primitives';
import { TextField } from '@/ui/forms';
import { Screen } from '@/ui/layout';
import { Mascot } from '@/ui/Mascot';
import { toast } from '@/ui/overlays';
import { Notice } from '@/ui/states';

/** Real, permanent deletion — not deactivation. */
export default function DeleteAccount() {
  const session = useAuthStore((s) => s.session);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen title="Delete account">
      <Mascot id="sunny" expression="concern" size={96} style={{ alignSelf: 'center' }} />
      <Card>
        <Stack gap={8}>
          <AppText variant="section">What will be deleted</AppText>
          <AppText>• Your account and sign-in details</AppText>
          <AppText>• All tasks, bills, payments, documents and subscriptions</AppText>
          <AppText>• Your profile, settings, achievements and consent history</AppText>
          <AppText>• All conversations with Ask Adu</AppText>
          <AppText>• All AdultingOS data on this phone</AppText>
        </Stack>
      </Card>
      <Notice title="What we keep">
        A record that a deletion happened (without your identity), and the text of any feedback or reports you sent, with your identity removed. Backups are overwritten within 30 days. See the Privacy Policy for details.
      </Notice>
      <Notice tone="warning">Consider exporting your data first. Deletion can't be undone.</Notice>
      {session ? (
        <>
          <TextField label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" error={error} />
          <Button label="Delete my account permanently" variant="danger" full disabled={typed !== 'DELETE'} loading={busy} onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await cancelAllReminders();
              await deleteAccount();
              toast('Your account was deleted.');
              router.replace('/welcome');
            } catch (e) {
              setError(e instanceof AuthError ? e.message : 'Could not delete your account.');
            } finally {
              setBusy(false);
            }
          }} />
        </>
      ) : (
        <AppText color="textMuted">You're not signed in. To delete an account you can't access, use the web form.</AppText>
      )}
      <Button label="Delete an account on the web" variant="ghost" full onPress={() => Linking.openURL(DELETION_URL)} />
    </Screen>
  );
}
