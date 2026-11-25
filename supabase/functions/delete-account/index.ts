/**
 * POST /functions/v1/delete-account   (Authorization: Bearer <user JWT>)
 * Body: { confirm: "DELETE" }
 *
 * Permanently deletes the caller's auth user. Every personal table references
 * auth.users ON DELETE CASCADE, so all records go with it. Kept afterwards,
 * without identity: the deletion request row (proof of deletion), anonymised
 * feedback/report text, and audit events with a null actor — see
 * docs/privacy/retention-schedule.md. Used by the app and by the public
 * web deletion page (after e-mail sign-in verification).
 */
import { fail, json, corsHeaders, logEvent } from '../_shared/http.ts';
import { requireUser, serviceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Use POST.');
  const auth = await requireUser(req);
  if (!auth) return fail(req, 401, 'unauthorized', 'Please sign in again to delete your account.');

  let confirm = '';
  let source: 'in_app' | 'web' = 'in_app';
  try {
    const body = await req.json();
    confirm = String(body?.confirm ?? '');
    if (body?.source === 'web') source = 'web';
  } catch { /* handled below */ }
  if (confirm !== 'DELETE') return fail(req, 400, 'confirmation_required', 'Type DELETE to confirm.');

  const admin = serviceClient();
  const uid = auth.user.id;
  const { data: request, error: reqErr } = await admin
    .from('account_deletion_requests').insert({ user_id: uid, source, status: 'pending' }).select('id').single();
  if (reqErr || !request) return fail(req, 500, 'deletion_failed', 'We could not start the deletion. Please try again.');

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    logEvent('account.delete_failed', { request: request.id });
    return fail(req, 500, 'deletion_failed', 'We could not delete your account. Please try again or contact support.');
  }
  await admin.from('account_deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', request.id);
  await admin.from('audit_events').insert({ actor_id: null, actor_kind: 'system', action: 'account.deleted', target_type: 'account_deletion_request', target_id: request.id, metadata: { source } });
  logEvent('account.deleted', { request: request.id, source });
  return json(req, { deleted: true, requestId: request.id });
});
