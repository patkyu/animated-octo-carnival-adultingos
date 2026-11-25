/**
 * POST /functions/v1/ask-adu
 * Body: { conversationId?, message, includeRecords?, timezone? }
 *
 * Flow: authenticate → validate → consent + quota → redact → retrieve approved
 * guide excerpts → (optionally) minimal user records → generate structured
 * answer → enforce grounding contract → store → return answer + optional
 * task proposal (never executed here; the user confirms via
 * confirm_ai_proposal()).
 */
import { json, fail, corsHeaders, logEvent } from '../_shared/http.ts';
import { requireUser, serviceClient, userClient } from '../_shared/supabase.ts';
import { askRequestSchema, modelOutputSchema, MODEL_OUTPUT_JSON_SCHEMA } from '../_shared/schemas.ts';
import { getProvider, ProviderUnavailableError } from '../_shared/providers.ts';
import {
  ADU_SYSTEM_PROMPT, AI_DISCLAIMER, addDaysIso, buildUserTurn, conversationTitle, finalizeAnswer, redactSensitive,
  todayIn, wantsPersonalRecords, type Citation, type Excerpt, type RecordLine,
} from '../_shared/adu.ts';

const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_MESSAGE_LIMIT') ?? '30');
const TIMEOUT_MS = Number(Deno.env.get('AI_TIMEOUT_MS') ?? '30000');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Use POST.');

  const auth = await requireUser(req);
  if (!auth) return fail(req, 401, 'unauthorized', 'Please sign in to use Ask Adu.');
  const uid = auth.user.id;

  let body;
  try {
    body = askRequestSchema.parse(await req.json());
  } catch {
    return fail(req, 400, 'invalid_request', 'Your message could not be read. Keep it under 1,000 characters.');
  }

  const db = userClient(auth.authHeader);
  const admin = serviceClient();

  const { data: consent } = await db.rpc('has_consent', { p_user: uid, p_type: 'ai_processing' });
  if (!consent) return fail(req, 403, 'consent_required', 'Please review and accept how Ask Adu processes your messages first.');

  const { data: used } = await admin.rpc('ai_messages_today', { p_user: uid });
  if ((used ?? 0) >= DAILY_LIMIT) {
    return fail(req, 429, 'quota_exceeded', `You've reached today's limit of ${DAILY_LIMIT} questions. Your tasks and guides still work as usual.`);
  }

  const provider = getProvider();
  if (!provider) return fail(req, 503, 'ai_unavailable', 'Ask Adu is not available right now. Your tasks and guides still work.');

  const { text: message, redacted } = redactSensitive(body.message);
  const today = todayIn(body.timezone);

  // Conversation (create or verify ownership via RLS).
  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const { data } = await db.from('ai_conversations').select('id').eq('id', conversationId).maybeSingle();
    if (!data) return fail(req, 404, 'not_found', 'Conversation not found.');
  } else {
    const { data, error } = await admin.from('ai_conversations').insert({ user_id: uid, title: conversationTitle(message) }).select('id').single();
    if (error || !data) return fail(req, 500, 'storage_error', 'Could not start a conversation. Please try again.');
    conversationId = data.id as string;
  }

  // Short history for context (own messages only, via RLS).
  const { data: history } = await db
    .from('ai_messages').select('role, content').eq('conversation_id', conversationId)
    .order('created_at', { ascending: false }).limit(6);

  // Retrieval: published guide chunks only (enforced in SQL).
  const { data: hits } = await db.rpc('search_knowledge', { p_query: message, p_limit: 6 });
  const excerpts: Excerpt[] = (hits ?? []).map((h: Record<string, unknown>, i: number) => ({
    id: `e${i + 1}`, guideId: String(h.guide_id), slug: String(h.slug), guideTitle: String(h.guide_title),
    heading: String(h.heading), content: String(h.content), lastVerifiedOn: (h.last_verified_on as string | null) ?? null,
  }));

  // Minimal personal context: titles + dates only, and only with explicit consent and intent.
  let records: RecordLine[] | null = null;
  if (body.includeRecords && wantsPersonalRecords(message)) {
    const { data: recConsent } = await db.rpc('has_consent', { p_user: uid, p_type: 'ai_record_access' });
    if (recConsent) {
      const { data: occ } = await db
        .from('obligation_occurrences')
        .select('due_date, obligations!inner(title, kind)')
        .eq('status', 'open').is('deleted_at', null)
        .gte('due_date', addDaysIso(today, -30)).lte('due_date', addDaysIso(today, 14))
        .order('due_date').limit(20);
      const { data: docs } = await db
        .from('documents').select('name, expiry_date').is('deleted_at', null).is('archived_at', null)
        .not('expiry_date', 'is', null).lte('expiry_date', addDaysIso(today, 90)).order('expiry_date').limit(10);
      records = [
        ...(occ ?? []).map((o: Record<string, unknown>) => {
          const ob = o.obligations as { title: string; kind: string };
          return { kind: ob.kind, title: redactSensitive(ob.title).text, dueDate: String(o.due_date) };
        }),
        ...(docs ?? []).map((d: Record<string, unknown>) => ({ kind: 'document expiry', title: String(d.name), dueDate: String(d.expiry_date) })),
      ];
    }
  }

  // The model API requires the conversation to start with a user turn; trim a leading
  // assistant message that the 6-message window may have cut its question from.
  const prior = (history ?? []).reverse().map((m: Record<string, unknown>) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }));
  while (prior.length && prior[0]!.role !== 'user') prior.shift();
  const messages = [
    ...prior,
    { role: 'user' as const, content: buildUserTurn(message, excerpts, records, today) },
  ];

  let generated;
  try {
    generated = await provider.generateStructured({
      system: ADU_SYSTEM_PROMPT, messages, jsonSchema: MODEL_OUTPUT_JSON_SCHEMA, maxTokens: 4000, timeoutMs: TIMEOUT_MS,
    });
  } catch (err) {
    logEvent('ai.error', { provider: provider.name, reason: err instanceof ProviderUnavailableError ? err.message : 'unexpected' });
    return fail(req, 503, 'ai_unavailable', "Adu couldn't answer right now. Please try again in a moment.");
  }

  const parsed = generated.refused ? null : modelOutputSchema.safeParse(generated.data);
  if (!generated.refused && !parsed?.success) {
    logEvent('ai.invalid_output', { provider: provider.name });
    return fail(req, 503, 'ai_unavailable', "Adu couldn't answer right now. Please try again in a moment.");
  }
  const final = parsed?.success
    ? finalizeAnswer(parsed.data, excerpts, message)
    : { answer: "I can't help with that request. If you need advice for your situation, please contact a licensed professional or the relevant official office.", grounding: 'refused' as const, citedGuideIds: [], tasks: [], flagged: false };
  const answerText = redacted ? `I removed a long number from your message — please don't share full ID, card or account numbers.\n\n${final.answer}` : final.answer;

  // Citations come from our own source table, never from model text.
  let citations: Citation[] = [];
  if (final.citedGuideIds.length) {
    // Live source rows are staff-only; read them with the service client, limited to
    // guides that were actually retrieved from published chunks above.
    const { data: srcs } = await admin.from('guide_sources')
      .select('guide_id, title, url, verified_on, guides!inner(title)')
      .in('guide_id', final.citedGuideIds).eq('is_official', true).not('verified_on', 'is', null);
    citations = (srcs ?? []).map((s: Record<string, unknown>) => ({
      guideId: String(s.guide_id), guideTitle: (s.guides as { title: string }).title, sourceTitle: String(s.title),
      url: String(s.url), verifiedOn: (s.verified_on as string | null) ?? null,
    }));
    // General (non-government) guides have no official source; cite the guide itself.
    for (const gid of final.citedGuideIds) {
      if (!citations.some((c) => c.guideId === gid)) {
        const ex = excerpts.find((e) => e.guideId === gid);
        if (ex) citations.push({ guideId: gid, guideTitle: ex.guideTitle, sourceTitle: 'AdultingOS guide', url: `https://adultingos.app/guides/${ex.slug}`, verifiedOn: ex.lastVerifiedOn });
      }
    }
  }

  // Store both turns (service role: users cannot forge assistant messages).
  const { error: e1 } = await admin.from('ai_messages').insert({ conversation_id: conversationId, user_id: uid, role: 'user', content: message });
  const { data: assistantMsg, error: e2 } = await admin.from('ai_messages').insert({
    conversation_id: conversationId, user_id: uid, role: 'assistant', content: answerText, grounding: final.grounding,
    citations, model: generated.model, input_tokens: generated.inputTokens, output_tokens: generated.outputTokens,
  }).select('id').single();
  if (e1 || e2 || !assistantMsg) return fail(req, 500, 'storage_error', 'Could not save the conversation. Please try again.');

  let proposal = null;
  if (final.tasks.length) {
    const tasks = final.tasks.map((t) => ({
      title: t.title, category: t.category, notes: t.notes, dueDate: t.due_in_days === null ? null : addDaysIso(today, t.due_in_days),
    }));
    const { data: p } = await admin.from('ai_action_proposals').insert({
      user_id: uid, conversation_id: conversationId, message_id: assistantMsg.id, kind: 'create_tasks', payload: { tasks },
    }).select('id').single();
    if (p) proposal = { id: p.id as string, kind: 'create_tasks' as const, tasks };
  }
  await admin.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  await admin.rpc('log_audit', {
    p_action: 'ai.answer', p_target_type: 'ai_conversation', p_target_id: conversationId,
    p_metadata: { grounding: final.grounding, citations: citations.length, proposal: !!proposal, flagged: final.flagged, records: records !== null },
    p_kind: 'ai',
  });
  logEvent('ai.answer', { grounding: final.grounding, citations: citations.length, tokens_in: generated.inputTokens, tokens_out: generated.outputTokens });

  return json(req, {
    conversationId, messageId: assistantMsg.id, answer: answerText, grounding: final.grounding,
    citations, proposal, disclaimer: AI_DISCLAIMER,
  });
});
