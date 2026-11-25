/**
 * Live end-to-end test of the deployed ask-adu and delete-account Edge
 * Functions (real model call — costs a few cents). Same env vars as
 * supabase-live.mjs. Uses no-sign-in (anonymous) accounts like the app and
 * deletes both at the end.
 */
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
const results = [];
const check = (name, cond, detail = '') => {
  results.push(!!cond);
  console.log(`${cond ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const client = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ask = async (sb, message, conversationId = null) => {
  const t0 = Date.now();
  const { data, error } = await sb.functions.invoke('ask-adu', { body: { message, conversationId, includeRecords: false, timezone: 'Asia/Manila' } });
  let errBody = null;
  if (error?.context?.json) errBody = await error.context.json().catch(() => null);
  return { data, error: errBody ?? (error ? { message: error.message } : null), ms: Date.now() - t0 };
};

const a = client();
const { data: sa, error: ea } = await a.auth.signInAnonymously();
check('user A has a no-sign-in account', !ea && sa.user?.is_anonymous === true, ea?.message);
const uidA = sa.user.id;

// Consent gate (fresh consent row; history is append-only).
await a.from('consent_records').insert({ user_id: uidA, consent_type: 'ai_processing', granted: true, policy_version: 'qa' });

// 1. Grounded question
const r1 = await ask(a, 'How do I prepare for moving out? Give me a short checklist.');
check('grounded answer returned', !r1.error && r1.data?.answer, r1.error ? JSON.stringify(r1.error) : `${r1.ms} ms`);
if (r1.data) {
  console.log(`    grounding=${r1.data.grounding} citations=${r1.data.citations.length} proposal=${r1.data.proposal ? r1.data.proposal.tasks.length + ' tasks' : 'none'}`);
  console.log(`    answer: ${r1.data.answer.replace(/\s+/g, ' ').slice(0, 220)}…`);
  check('answer is grounded in verified guides', r1.data.grounding === 'verified_guides', r1.data.grounding);
  check('citations come from our guide records', r1.data.citations.length >= 1 && r1.data.citations.every((c) => c.url.startsWith('https://')));
  check('AI disclaimer attached', /AI-generated/.test(r1.data.disclaimer));
}

// 2. Unverifiable government question
const r2 = await ask(a, 'What are the exact requirements and fees for an NBI clearance?', r1.data?.conversationId ?? null);
check('government question answered', !r2.error && r2.data?.answer, r2.error ? JSON.stringify(r2.error) : `${r2.ms} ms`);
if (r2.data) {
  console.log(`    grounding=${r2.data.grounding}`);
  console.log(`    answer: ${r2.data.answer.replace(/\s+/g, ' ').slice(0, 260)}…`);
  check('does not claim verified government info', r2.data.grounding !== 'verified_guides', r2.data.grounding);
  check("says it couldn't verify", /couldn't verify|could not verify|official/i.test(r2.data.answer));
}

// 3. Sensitive number redaction
const r3 = await ask(a, 'My SSS number is 34-1234567-8, can you remember it for me?', r1.data?.conversationId ?? null);
check('long numbers removed before processing', !r3.error && /removed a long number/i.test(r3.data?.answer ?? ''), r3.error ? JSON.stringify(r3.error) : '');
const msgs = await a.from('ai_messages').select('content').eq('role', 'user');
check('stored question has no ID number', !JSON.stringify(msgs.data).includes('1234567'));

// 4. Confirm proposal exactly once
const proposal = r1.data?.proposal;
if (proposal) {
  const sel = proposal.tasks.map((_, i) => i).slice(0, 2);
  const c1 = await a.rpc('confirm_ai_proposal', { p_proposal: proposal.id, p_selected: sel, p_due_dates: {} });
  const c2 = await a.rpc('confirm_ai_proposal', { p_proposal: proposal.id, p_selected: sel, p_due_dates: {} });
  const created = await a.from('obligations').select('id').eq('source', 'ai').eq('source_ref', proposal.id);
  check('proposal confirmed exactly once', !c1.error && JSON.stringify(c1.data) === JSON.stringify(c2.data) && created.data.length === sel.length, `${created.data?.length} tasks`);
} else {
  check('model offered a checklist proposal', false, 'no proposal in answer 1');
}

// 5. Report an answer
const rep = await a.from('ai_content_reports').insert({ user_id: uidA, message_id: r1.data?.messageId, reason: 'other', details: 'QA test report', shared_excerpt: '' });
check('AI answer can be reported', !rep.error, rep.error?.message);

// 6. AI history deletion
const del = await a.rpc('delete_my_ai_history');
const left = await a.from('ai_messages').select('id');
check('AI history deleted', !del.error && left.data.length === 0, `${del.data} conversation(s)`);

// 7. Account deletion via the Edge Function (user B)
const b = client();
const { data: sb, error: eb } = await b.auth.signInAnonymously();
check('user B has a no-sign-in account', !eb, eb?.message);
const noConfirm = await b.functions.invoke('delete-account', { body: {} });
check('deletion requires typed confirmation', !!noConfirm.error);
const d = await b.functions.invoke('delete-account', { body: { confirm: 'DELETE', source: 'in_app' } });
check('delete-account succeeded', !d.error && d.data?.deleted === true, d.error?.message);
const again = await client().auth.getUser(sb.session.access_token);
check("deleted account's token no longer works", !!again.error, again.error?.message);
const refresh = await client().auth.refreshSession({ refresh_token: sb.session.refresh_token });
check("deleted account can't be refreshed", !!refresh.error, refresh.error?.message);

// Clean up user A the same way.
const dA = await a.functions.invoke('delete-account', { body: { confirm: 'DELETE', source: 'in_app' } });
check('cleanup: user A deleted', !dA.error && dA.data?.deleted === true, dA.error?.message);

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} live AI/deletion checks passed`);
process.exit(failed ? 1 : 0);
