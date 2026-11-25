# API reference

## `POST /functions/v1/ask-adu`
Auth: user JWT. Body:
```json
{ "conversationId": "uuid | null", "message": "≤1000 chars", "includeRecords": false, "timezone": "Asia/Manila" }
```
200 response (validated in the app by `aiAnswerSchema`):
```json
{
  "conversationId": "uuid", "messageId": "uuid",
  "answer": "plain text",
  "grounding": "verified_guides | unverified | user_records | refused",
  "citations": [{ "guideId": "uuid", "guideTitle": "…", "sourceTitle": "…", "url": "https://…", "verifiedOn": "YYYY-MM-DD" }],
  "proposal": { "id": "uuid", "kind": "create_tasks", "tasks": [{ "title": "…", "category": "work", "dueDate": "YYYY-MM-DD|null", "notes": "" }] } | null,
  "disclaimer": "AI-generated…"
}
```
Errors: `{ "error": { "code", "message" } }` — `unauthorized` 401, `invalid_request` 400, `consent_required` 403, `not_found` 404, `quota_exceeded` 429, `ai_unavailable` 503, `storage_error` 500.

Server configuration: `AI_PROVIDER` (`anthropic`|`disabled`), `ANTHROPIC_API_KEY`, `AI_MODEL` (default `claude-opus-5-5`), `AI_EFFORT` (default `low`), `AI_DAILY_MESSAGE_LIMIT` (30), `AI_TIMEOUT_MS` (30000). Server-side refusal fallback is enabled (`fallbacks: "default"`). To add a provider, implement `LlmProvider` in `supabase/functions/_shared/providers.ts`.

## `POST /functions/v1/delete-account`
Auth: user JWT. Body `{ "confirm": "DELETE", "source": "in_app" | "web" }` → `{ "deleted": true, "requestId": "uuid" }`. Deletes the auth user; all personal rows cascade.

## RPCs (PostgREST `/rest/v1/rpc/<name>`)
`confirm_ai_proposal(p_proposal, p_selected int[], p_due_dates jsonb)`, `cancel_ai_proposal(p_proposal)`, `export_my_data()`, `delete_my_ai_history()`, `search_knowledge(p_query, p_limit)`, `has_consent(p_user, p_type)`; staff: `set_guide_status`, `publish_guide`, `admin_usage_summary`. See `docs/database/erd-and-dictionary.md`.

## Sync
Tables in `SYNC_TABLES` (`apps/mobile/src/db/schema.ts`) are pushed with `upsert(onConflict: id)` and pulled with `server_seq > cursor`. Server triggers enforce owner immutability, parent ownership and last-writer-wins.
