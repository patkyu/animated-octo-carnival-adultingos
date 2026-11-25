import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AI_DISCLAIMER, GOVERNMENT_DISCLAIMER, uuidv4 } from '@adultingos/shared';
import { BACKEND_CONFIGURED } from '@/config/env';
import { AiError, askAdu, hasAiConsent } from '@/features/ai';
import { useChat, type ChatMessage } from '@/features/chatStore';
import { useAuthStore } from '@/sync/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button, Card, Chip, Icon, IconButton, Row, Stack, StatusBadge } from '@/ui/primitives';
import { Mascot } from '@/ui/Mascot';
import { Notice, OfflineBanner, useOnline } from '@/ui/states';

const SUGGESTIONS = [
  'What documents do I need for my first job?',
  'How do I prepare for moving out?',
  'Which bills are due this week?',
  'What should I do before my passport expires?',
  'How do I organize my government contributions?',
];

const GROUNDING: Record<NonNullable<ChatMessage['grounding']>, { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }> = {
  verified_guides: { label: 'Based on verified guides', tone: 'success' },
  unverified: { label: "Couldn't verify — check official sources", tone: 'warning' },
  user_records: { label: 'From your own records', tone: 'info' },
  refused: { label: "Adu can't help with this", tone: 'neutral' },
};

function AssistantBubble({ m }: { m: ChatMessage }) {
  const t = useTheme();
  return (
    <Stack gap={8} style={{ alignSelf: 'stretch' }}>
      <Row gap={8}>
        <Mascot id="adu" expression={m.failed ? 'concern' : m.grounding === 'unverified' ? 'thoughtful' : 'happy'} size={32} animation="none" />
        <AppText variant="caption" color="textMuted">Adu · AI-generated</AppText>
      </Row>
      <View style={{ backgroundColor: m.failed ? t.c.dangerSoft : t.c.surface, borderRadius: 18, borderTopLeftRadius: 6, padding: 14, gap: 10, borderWidth: 1, borderColor: t.c.border }}>
        {m.grounding ? <StatusBadge label={GROUNDING[m.grounding].label} tone={GROUNDING[m.grounding].tone} /> : null}
        <AppText selectable>{m.content}</AppText>
        {m.citations?.length ? (
          <Stack gap={4}>
            <AppText variant="caption" color="textMuted">Sources</AppText>
            {m.citations.map((c, i) => (
              <Pressable key={i} accessibilityRole="link" accessibilityLabel={`Source: ${c.sourceTitle}`} onPress={() => Linking.openURL(c.url)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 36 }}>
                <Icon name="external-link" size={14} color="primary" />
                <AppText variant="support" color="primary" style={{ flex: 1 }}>{c.sourceTitle} — {c.guideTitle}{c.verifiedOn ? ` (verified ${c.verifiedOn})` : ''}</AppText>
              </Pressable>
            ))}
          </Stack>
        ) : null}
        {m.proposal ? (
          <Card tone="catPositive">
            <Stack gap={8}>
              <AppText variant="supportStrong" color="onCategory">Adu suggests {m.proposal.tasks.length} task{m.proposal.tasks.length === 1 ? '' : 's'}</AppText>
              {m.proposal.tasks.slice(0, 3).map((tk, i) => <AppText key={i} variant="support" color="onCategory">• {tk.title}</AppText>)}
              {m.proposal.tasks.length > 3 ? <AppText variant="caption" color="onCategory">and {m.proposal.tasks.length - 3} more…</AppText> : null}
              <Button label="Review and choose" icon="list" compact onPress={() => router.push({ pathname: '/assistant/confirm', params: { messageId: m.id } })} />
              <AppText variant="caption" color="onCategory">Nothing is added until you confirm.</AppText>
            </Stack>
          </Card>
        ) : null}
        {!m.failed ? (
          <Button label="Report this answer" icon="flag" variant="ghost" compact style={{ alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/assistant/report', params: { messageId: m.id } })} />
        ) : null}
      </View>
    </Stack>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 16 }}>
        <AppText variant="title">Ask Adu</AppText>
        <Mascot id="adu" expression="happy" pose="wave" size={120} style={{ alignSelf: 'center' }} />
        {children}
        <Button label="Browse guides instead" icon="book-open" variant="ghost" onPress={() => router.push('/guides')} />
      </ScrollView>
    </View>
  );
}

export default function Assistant() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const online = useOnline();
  const { messages, conversationId, draft, set, reset } = useChat();
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (session) void hasAiConsent().then(setConsent).catch(() => setConsent(false));
  }, [session]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    set({ draft: '', messages: [...useChat.getState().messages, { id: uuidv4(), role: 'user', content: q }] });
    setBusy(true);
    try {
      const a = await askAdu(q, useChat.getState().conversationId);
      set({
        conversationId: a.conversationId,
        messages: [...useChat.getState().messages, { id: a.messageId, role: 'assistant', content: a.answer, grounding: a.grounding, citations: a.citations, proposal: a.proposal, question: q }],
      });
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError('unknown', 'Adu could not answer right now.');
      if (err.code === 'consent_required') setConsent(false);
      // Restore the question so nothing typed is lost; show the failure honestly.
      set({ draft: q, messages: [...useChat.getState().messages, { id: uuidv4(), role: 'assistant', content: err.message, failed: true }] });
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (!BACKEND_CONFIGURED) {
    return <Gate><Notice title="Ask Adu isn't available in this build">Adu answers on AdultingOS servers, which aren't set up in this version of the app. Your tasks, bills, documents and guides all work without it.</Notice></Gate>;
  }
  if (!session) {
    return (
      <Gate>
          <AppText align="center">Adu can explain procedures, build checklists from verified guides and summarize what's coming up.</AppText>
          <Notice icon="shield">Ask Adu needs an account because answers are generated on our servers.</Notice>
          <Button label="Sign in or create an account" full onPress={() => router.push('/auth/sign-in')} />
      </Gate>
    );
  }
  if (consent === false) {
    return (
      <Gate>
          <AppText align="center">Before your first question, please review how Ask Adu handles your messages.</AppText>
          <Button label="Review and continue" full onPress={() => router.push('/assistant/consent')} />
      </Gate>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.c.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Row style={{ paddingTop: insets.top + 4, paddingHorizontal: 12, minHeight: 56 + insets.top }} gap={4}>
        <AppText variant="section" style={{ flex: 1, paddingLeft: 4 }}>Ask Adu</AppText>
        <IconButton icon="clock" label="Conversation history" onPress={() => router.push('/assistant/history')} />
        <IconButton icon="edit" label="New conversation" onPress={() => reset()} />
      </Row>
      <ScrollView ref={scroll} contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' as const, padding: 16, gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <OfflineBanner message="You're offline. Adu needs a connection — your saved guides and tasks still work." />
        {!messages.length ? (
          <Stack gap={14}>
            <Card tone="catPositive">
              <Row gap={12}>
                <Mascot id="adu" expression="happy" pose="wave" size={72} />
                <AppText color="onCategory" style={{ flex: 1 }}>Hi! I can explain adulting procedures, turn verified guides into checklists, and help you see what's coming up. One step at a time.</AppText>
              </Row>
            </Card>
            <AppText variant="supportStrong">Try asking</AppText>
            <Row wrap>{SUGGESTIONS.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}</Row>
            <AppText variant="caption" color="textMuted">{AI_DISCLAIMER} {GOVERNMENT_DISCLAIMER}</AppText>
          </Stack>
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: t.c.primary, borderRadius: 18, borderTopRightRadius: 6, padding: 12 }}>
                <AppText color="onPrimary">{m.content}</AppText>
              </View>
            ) : <AssistantBubble key={m.id} m={m} />,
          )
        )}
        {busy ? (
          <Row gap={8} accessibilityLiveRegion="polite" accessible accessibilityLabel="Adu is thinking">
            <Mascot id="adu" expression="thoughtful" size={32} />
            <AppText color="textMuted">Adu is checking the guides…</AppText>
          </Row>
        ) : null}
        {conversationId ? <AppText variant="caption" color="textMuted" align="center">AI-generated answers can be wrong. Check official sources before acting.</AppText> : null}
      </ScrollView>
      <Row style={{ padding: 12, borderTopWidth: 1, borderColor: t.c.border, backgroundColor: t.c.surface }} gap={8}>
        <TextInput
          accessibilityLabel="Your question for Adu"
          value={draft}
          onChangeText={(d) => set({ draft: d })}
          placeholder={online ? 'Ask about bills, documents, guides…' : 'Offline'}
          placeholderTextColor={t.c.textMuted}
          editable={!busy}
          multiline
          maxLength={1000}
          style={[t.type.body, { flex: 1, color: t.c.text, backgroundColor: t.c.background, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 120, minHeight: 48 }]}
        />
        <IconButton icon="send" label="Send" tone={draft.trim() && online ? 'primary' : 'textMuted'} onPress={() => send(draft)} />
      </Row>
    </KeyboardAvoidingView>
  );
}
