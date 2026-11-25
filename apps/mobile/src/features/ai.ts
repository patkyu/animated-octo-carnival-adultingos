import { aiAnswerSchema, type AiAnswer } from '@adultingos/shared';
import NetInfo from '@react-native-community/netinfo';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/sync/supabase';
import { syncNow } from '@/sync/engine';
import { getPreferences, getProfile } from '@/db/settings';
import { dataChanged } from '@/lib/events';

export type AiErrorCode =
  | 'not_configured' | 'signed_out' | 'offline' | 'consent_required' | 'quota_exceeded' | 'ai_unavailable' | 'invalid_response' | 'unknown';

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
  }
}

export const AI_POLICY_VERSION = '2026-11';

async function client() {
  const sb = supabase();
  if (!sb) throw new AiError('not_configured', 'Ask Adu needs the AdultingOS cloud service, which is not set up in this build.');
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new AiError('signed_out', 'Ask Adu needs your private account to connect. Check your internet connection and try again.');
  const net = await NetInfo.fetch();
  if (net.isConnected === false) throw new AiError('offline', "You're offline. Ask Adu needs a connection — your tasks and saved guides still work.");
  return sb;
}

/** Sends a question. Never fabricates an answer: every failure surfaces as an AiError. */
export async function askAdu(message: string, conversationId: string | null): Promise<AiAnswer> {
  const sb = await client();
  const [{ timezone }, prefs] = await Promise.all([getProfile(), getPreferences()]);
  const { data, error } = await sb.functions.invoke('ask-adu', { body: { message, conversationId, includeRecords: prefs.aiIncludeRecords, timezone } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      const code = (body?.error?.code ?? 'unknown') as AiErrorCode;
      throw new AiError(code, body?.error?.message ?? 'Adu could not answer right now.');
    }
    throw new AiError('ai_unavailable', 'Adu could not answer right now. Please try again.');
  }
  const parsed = aiAnswerSchema.safeParse(data);
  if (!parsed.success) throw new AiError('invalid_response', 'Adu sent an answer we could not read. Please try again.');
  return parsed.data;
}

export async function hasAiConsent(): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { data: s } = await sb.auth.getSession();
  if (!s.session) return false;
  const { data } = await sb.rpc('has_consent', { p_user: s.session.user.id, p_type: 'ai_processing' });
  return !!data;
}

export async function recordConsent(type: 'ai_processing' | 'ai_record_access' | 'terms' | 'privacy_policy', granted: boolean): Promise<void> {
  const sb = await client();
  const { data: s } = await sb.auth.getSession();
  const { error } = await sb.from('consent_records').insert({ user_id: s.session!.user.id, consent_type: type, granted, policy_version: AI_POLICY_VERSION });
  if (error) throw new AiError('unknown', 'Could not save your choice. Please try again.');
}

/** Confirms selected tasks from a proposal (exactly-once on the server), then pulls them down. */
export async function confirmProposal(proposalId: string, selected: number[], dueDates: Record<number, string | null>): Promise<string[]> {
  const sb = await client();
  const { data, error } = await sb.rpc('confirm_ai_proposal', { p_proposal: proposalId, p_selected: selected, p_due_dates: dueDates });
  if (error) throw new AiError('unknown', error.message.includes('expired') ? 'This suggestion has expired. Ask Adu again for a fresh one.' : 'Could not add the tasks. Please try again.');
  await syncNow();
  dataChanged('tasks');
  return ((data as { obligationIds?: string[] })?.obligationIds ?? []) as string[];
}

export async function cancelProposal(proposalId: string): Promise<void> {
  const sb = supabase();
  if (sb) await sb.rpc('cancel_ai_proposal', { p_proposal: proposalId });
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}
export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  grounding: AiAnswer['grounding'] | null;
  citations: AiAnswer['citations'];
  createdAt: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const sb = await client();
  const { data, error } = await sb.from('ai_conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50);
  if (error) throw new AiError('unknown', 'Could not load your conversations.');
  return (data ?? []).map((c) => ({ id: c.id as string, title: c.title as string, updatedAt: c.updated_at as string }));
}

export async function loadConversation(id: string): Promise<StoredMessage[]> {
  const sb = await client();
  const { data, error } = await sb.from('ai_messages').select('id, role, content, grounding, citations, created_at').eq('conversation_id', id).order('created_at');
  if (error) throw new AiError('unknown', 'Could not load this conversation.');
  return (data ?? []).map((m) => ({
    id: m.id as string, role: m.role as 'user' | 'assistant', content: m.content as string, grounding: (m.grounding as AiAnswer['grounding']) ?? null,
    citations: (m.citations as AiAnswer['citations']) ?? [], createdAt: m.created_at as string,
  }));
}

export async function deleteConversation(id: string): Promise<void> {
  const sb = await client();
  const { error } = await sb.from('ai_conversations').delete().eq('id', id);
  if (error) throw new AiError('unknown', 'Could not delete this conversation.');
}

export async function deleteAllConversations(): Promise<number> {
  const sb = await client();
  const { data, error } = await sb.rpc('delete_my_ai_history');
  if (error) throw new AiError('unknown', 'Could not delete your AI history.');
  return Number(data ?? 0);
}

export async function reportAiMessage(messageId: string, reason: 'inaccurate' | 'offensive' | 'unsafe' | 'privacy' | 'other', details: string, excerpt: string): Promise<void> {
  const sb = await client();
  const { data: s } = await sb.auth.getSession();
  const { error } = await sb.from('ai_content_reports').insert({
    user_id: s.session!.user.id, message_id: messageId, reason, details: details.slice(0, 1000), shared_excerpt: excerpt.slice(0, 4000),
  });
  if (error) throw new AiError('unknown', 'Could not send your report. Please try again.');
}
