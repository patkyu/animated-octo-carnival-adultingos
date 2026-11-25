/**
 * Live integration test against a real Supabase project, through the public
 * API with the publishable/anon key — the same path the app uses.
 *
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… node tests/integration/supabase-live.mjs
 *
 * Uses two no-sign-in (anonymous) accounts, exactly like the app, and deletes
 * them at the end through the delete-account function.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
const results = [];
const check = (name, cond, detail = '') => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const client = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- anonymous ----
const anon = client();
const pg = await anon.rpc('published_guides');
check('anon: published guide snapshots readable', !pg.error && pg.data.length >= 1, `${pg.data?.length ?? 0} guides`);
check('anon: no draft guides exposed', !pg.error && pg.data.every((g) => ['published', 'needs_update'].includes(g.status)));
const live = await anon.from('guides').select('slug').limit(1);
check('anon: live guide tables blocked', !!live.error || live.data.length === 0, live.error?.code ?? 'empty');
const ks = await anon.rpc('search_knowledge', { p_query: 'moving out budget', p_limit: 3 });
check('anon: knowledge search over published guides', !ks.error && ks.data.length >= 1, `${ks.data?.length ?? 0} chunks`);
const anonObl = await anon.from('obligations').select('id').limit(1);
check('anon: personal tables blocked', !!anonObl.error || anonObl.data.length === 0, anonObl.error?.code ?? 'empty');
const flags = await anon.from('feature_flags').select('key, enabled');
check('anon: feature flags readable', !flags.error && flags.data.length >= 10 && flags.data.some((f) => f.key === 'account_sign_in' && !f.enabled), `${flags.data?.length} flags`);

// ---- no-sign-in accounts ----
const emailSignUp = await client().auth.signUp({ email: `qa-${randomUUID().slice(0, 8)}@example.com`, password: 'Qa-test-12345' });
check('auth: e-mail sign-up is off (no SMTP needed)', !!emailSignUp.error, emailSignUp.error?.code ?? emailSignUp.error?.message);
const a = client();
const b = client();
const sa = await a.auth.signInAnonymously();
const sb = await b.auth.signInAnonymously();
check('auth: user A gets a no-sign-in account', !sa.error && sa.data.user?.is_anonymous === true && !sa.data.user.email, sa.error?.message);
check('auth: user B gets a separate account', !sb.error && sb.data.user?.id !== sa.data.user?.id, sb.error?.message);
const uidA = sa.data.user.id;

const prof = await a.from('profiles').select('id, timezone').single();
check('sign-up trigger created profile', !prof.error && prof.data.id === uidA, prof.data?.timezone);

// ---- sync payloads exactly as the app's sync engine sends them ----
const now = new Date().toISOString();
const ob = randomUUID();
const occ = randomUUID();
const up1 = await a.from('obligations').upsert([{
  id: ob, user_id: uidA, kind: 'bill', title: 'QA Electricity', description: '', category: 'bills', priority: 'medium', due_time: null,
  recurrence: { freq: 'monthly', interval: 1, anchorDay: 31 }, reminder_offsets: [3, 0], tags: [], notes: '', source: 'user', source_ref: null,
  archived_at: null, created_at: now, client_updated_at: now, deleted_at: null,
}], { onConflict: 'id' });
check('sync push: obligation upsert', !up1.error, up1.error?.message);
const up2 = await a.from('obligation_occurrences').upsert([{
  id: occ, user_id: uidA, obligation_id: ob, scheduled_date: '2027-01-31', due_date: '2027-01-31', status: 'open', completed_on: null,
  amount_minor: null, snoozed_until: null, created_at: now, client_updated_at: now, deleted_at: null,
}], { onConflict: 'id' });
check('sync push: occurrence upsert', !up2.error, up2.error?.message);
const dup = await a.from('obligation_occurrences').insert({ id: randomUUID(), user_id: uidA, obligation_id: ob, scheduled_date: '2027-01-31', due_date: '2027-01-31' });
check('exactly-once: duplicate occurrence rejected', dup.error?.code === '23505', dup.error?.code);

// Last-writer-wins: a stale edit is ignored.
const older = new Date(Date.now() - 60_000).toISOString();
await a.from('obligations').upsert([{ id: ob, user_id: uidA, kind: 'bill', title: 'STALE', client_updated_at: older }], { onConflict: 'id' });
const after = await a.from('obligations').select('title, server_seq').eq('id', ob).single();
check('sync: stale write ignored (LWW)', after.data?.title === 'QA Electricity', after.data?.title);
const pull = await a.from('obligations').select('id').gt('server_seq', 0).order('server_seq');
check('sync pull: server_seq cursor query', !pull.error && pull.data.some((r) => r.id === ob));

// ---- isolation ----
const bRead = await b.from('obligations').select('id').eq('id', ob);
check('isolation: B cannot read A rows', !bRead.error && bRead.data.length === 0);
const bUpd = await b.from('obligations').update({ title: 'hacked' }).eq('id', ob).select();
check('isolation: B cannot modify A rows', !bUpd.error ? bUpd.data.length === 0 : true);
const bSpoof = await b.from('obligations').insert({ id: randomUUID(), user_id: uidA, title: 'spoof' });
check('isolation: B cannot write as A', !!bSpoof.error, bSpoof.error?.code);
const bExport = await b.rpc('export_my_data');
check('isolation: B export excludes A data', !bExport.error && !JSON.stringify(bExport.data).includes('QA Electricity'));

// ---- privacy ----
const exp = await a.rpc('export_my_data');
check('privacy: export contains own data', !exp.error && JSON.stringify(exp.data).includes('QA Electricity'));
const consent = await a.from('consent_records').insert({ user_id: uidA, consent_type: 'ai_processing', granted: true, policy_version: 'qa' });
check('consent: record AI consent', !consent.error, consent.error?.message);
const hc = await a.rpc('has_consent', { p_user: uidA, p_type: 'ai_processing' });
check('consent: has_consent true', hc.data === true);

// ---- cleanup (A's rows) ----
await a.from('obligations').delete().eq('id', ob);
await a.from('consent_records').delete().eq('user_id', uidA); // append-only: expected to be refused
const left = await a.from('obligations').select('id').eq('id', ob);
check('cleanup: test obligation deleted (cascade)', left.data?.length === 0);

// ---- delete both test accounts (as the app's Delete account does) ----
for (const [name, c] of [['A', a], ['B', b]]) {
  const d = await c.functions.invoke('delete-account', { body: { confirm: 'DELETE', source: 'in_app' } });
  check(`cleanup: account ${name} deleted`, !d.error && d.data?.deleted === true, d.error?.message);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} live checks passed`);
process.exit(failed ? 1 : 0);
