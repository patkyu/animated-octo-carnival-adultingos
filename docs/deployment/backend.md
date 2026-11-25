# Backend deployment (Supabase)

Use three separate Supabase projects: **development**, **staging**, **production**. Never share keys between them.

## 1. Create the project
- Region: Singapore (`ap-southeast-1`) is closest to the Philippines. The current development project (`vmjinibzebnzaplbqjgb`) is in **Tokyo (`ap-northeast-1`)**, which the privacy policy now names. Region can't be changed later — pick it deliberately for production.
- Enable **Point-in-time recovery** (or daily backups) and set retention ≤ 30 days to match the privacy policy.
- Enable the `pg_cron` extension (Database → Extensions) so retention runs automatically.

## 2. Apply schema and reference data
```bash
supabase link --project-ref <ref>
supabase db push            # applies supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seeds/01_reference_data.sql   # mascots, achievements, flags, guide drafts
```
`seeds/01_reference_data.sql` is generated (`npx tsx scripts/build-seed.ts`) from the TypeScript sources. Government guides are inserted as **in_review** and unverified.

## 3. Auth
The app uses **no-sign-in accounts** (Supabase anonymous users): no e-mail, password or SMTP.
- Authentication → Sign In / Providers: **Allow anonymous sign-ins ON**; **Email provider OFF**; *Allow manual linking* ON (so e-mail/Google can be linked to an anonymous account later).
- Rate limit for anonymous users: default 30 per hour per IP (Authentication → Rate Limits). Turn on CAPTCHA (Turnstile/hCaptcha) if abuse appears.
- Inactive anonymous accounts (12 months without sign-in/refresh) are deleted by `run_retention()` (migration `20261127000100`).
- Optional later — e-mail/Google sign-in (flag `account_sign_in`): needs the Email provider ON with confirmations, minimum password length 8, and custom SMTP (see below).
- Redirect URLs: `adultingos://auth-callback`, `adultingos://reset-password`.
- Google: create an OAuth **Web** client in Google Cloud; add Supabase's callback URL; put client id/secret in Auth → Providers → Google. (The app uses Supabase's PKCE browser flow, so no Android OAuth client or SHA-1 is needed for this flow.)
- Rate limits: keep Supabase defaults or stricter for sign-up/OTP.

## 4. Edge Functions
```bash
supabase secrets set --env-file supabase/functions/.env   # from .env.example: AI_PROVIDER, ANTHROPIC_API_KEY, AI_MODEL, AI_EFFORT, AI_DAILY_MESSAGE_LIMIT, AI_TIMEOUT_MS, ALLOWED_WEB_ORIGINS
supabase functions deploy ask-adu
supabase functions deploy delete-account
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. **The service role key never leaves the server.** Set `AI_PROVIDER=disabled` to turn Ask Adu off without a release (the app shows "not available").

## 5. Staff roles
Create staff users in Auth, then (SQL editor, as owner):
```sql
insert into public.admin_roles (user_id, role) values ('<uuid>', 'super_admin');
```
Roles: `super_admin`, `content_editor`, `content_reviewer`, `support_operator`. None grants access to private records or AI conversations.

## Email delivery (only if you turn on e-mail sign-in)
Not needed for no-sign-in accounts. If you enable e-mail sign-in later: Supabase's built-in e-mail sender only delivers to your own team's addresses and is limited to a few messages per hour, so real users won't receive verification or password-reset e-mails until you add custom SMTP (Auth → Emails → SMTP settings) from a provider such as Resend, Postmark or Amazon SES, using a domain you own.

## Applying changes without the CLI
This repo was deployed through the Supabase Management API (SQL via `POST /v1/projects/{ref}/database/query`, functions via `POST /v1/projects/{ref}/functions/deploy`, applied versions recorded in `supabase_migrations.schema_migrations`), so `supabase db push` will treat them as applied.

## 6. Verify
```bash
bash supabase/tests/run.sh           # against a local Postgres (stubbed auth); CI does the same
```
Then on staging: sign up two test accounts and run `tests/e2e/07-ai-and-deletion-account.yaml`.

## Costs (planning figures — verify current pricing)
- Supabase: Free tier for development; Pro plan for production (monthly fee + usage).
- AI: per-token pricing of the configured model; the daily per-user cap (`AI_DAILY_MESSAGE_LIMIT`, default 30) and `AI_EFFORT=low` bound spend. Monitor tokens via the `ai.answer` log events.
- Google Play developer registration: one-time fee.
