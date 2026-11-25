import { router } from 'expo-router';
import { useState } from 'react';
import { AiError, deleteConversation, listConversations, loadConversation } from '@/features/ai';
import { useChat } from '@/features/chatStore';
import { useData } from '@/lib/useData';
import { AppText, Card, IconButton, Row, Stack } from '@/ui/primitives';
import { Screen } from '@/ui/layout';
import { ConfirmDialog, toast } from '@/ui/overlays';
import { EmptyState, ErrorState, LoadingList } from '@/ui/states';

export default function AiHistory() {
  const { data, isLoading, error, refetch } = useData(['ai-history'], listConversations);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const open = async (id: string) => {
    try {
      const msgs = await loadConversation(id);
      useChat.getState().set({
        conversationId: id,
        messages: msgs.map((m, i) => ({ id: m.id, role: m.role, content: m.content, grounding: m.grounding, citations: m.citations, question: m.role === 'assistant' ? msgs[i - 1]?.content : undefined })),
      });
      router.back();
    } catch (e) {
      toast(e instanceof AiError ? e.message : 'Could not open this conversation.', 'error');
    }
  };
  return (
    <Screen title="Conversations">
      {isLoading ? <LoadingList /> : error ? <ErrorState body={(error as Error).message} onRetry={() => refetch()} /> : !data?.length ? (
        <EmptyState title="No conversations yet" body="Your questions to Adu will appear here. You can delete them any time." />
      ) : (
        <Stack gap={8}>
          {data.map((c) => (
            <Card key={c.id} onPress={() => open(c.id)} accessibilityLabel={`Open conversation: ${c.title}`}>
              <Row gap={8}>
                <Stack gap={2} style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={2}>{c.title}</AppText>
                  <AppText variant="caption" color="textMuted">{c.updatedAt.slice(0, 10)}</AppText>
                </Stack>
                <IconButton icon="trash-2" label={`Delete conversation ${c.title}`} tone="textMuted" onPress={() => setToDelete(c.id)} />
              </Row>
            </Card>
          ))}
        </Stack>
      )}
      <ConfirmDialog visible={!!toDelete} title="Delete this conversation?" message="It will be permanently removed from your account." confirmLabel="Delete" destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const id = toDelete!;
          setToDelete(null);
          await deleteConversation(id);
          if (useChat.getState().conversationId === id) useChat.getState().reset();
          toast('Conversation deleted.');
          void refetch();
        }} />
    </Screen>
  );
}
