import { create } from 'zustand';
import type { AiAnswer } from '@adultingos/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  grounding?: AiAnswer['grounding'] | null;
  citations?: AiAnswer['citations'];
  proposal?: AiAnswer['proposal'];
  question?: string; // for reports: the question that produced this answer
  failed?: boolean;
}

interface ChatStore {
  conversationId: string | null;
  messages: ChatMessage[];
  draft: string;
  set: (p: Partial<Omit<ChatStore, 'set' | 'reset'>>) => void;
  reset: () => void;
}

/** Conversation state survives tab switches (the draft too). */
export const useChat = create<ChatStore>((set) => ({
  conversationId: null,
  messages: [],
  draft: '',
  set: (p) => set(p),
  reset: () => set({ conversationId: null, messages: [], draft: '' }),
}));
