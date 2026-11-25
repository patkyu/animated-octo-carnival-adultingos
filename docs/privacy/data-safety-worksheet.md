# Google Play Data safety — mapping worksheet

Prepared from the **current code**. Re-check before every release; if you add an SDK (crash reporting, analytics), update this sheet, the privacy policy and `docs/privacy/sdk-inventory.md`.

## Overview answers

| Question | Answer | Basis in code |
|---|---|---|
| Does the app collect or share any required user data types? | **Yes** — user-entered records sync to a private no-sign-in account once the app is online | `ensureAnonymousSession()` in `src/sync/auth.ts` |
| Is all collected data encrypted in transit? | **Yes** | HTTPS only; `usesCleartextTraffic=false` |
| Can users request that data be deleted? | **Yes** — in-app and via `https://adultingos.app/delete-account` | `settings/delete-account.tsx`, `delete-account` function, public page |
| Data shared with third parties? | **No sharing** in Play's sense; processors (Supabase, Anthropic) act on our behalf | Play treats service providers as not "sharing" |

## Data types

| Play category → type | Collected? | Optional? | Purpose(s) | Notes |
|---|---|---|---|---|
| Personal info → Email address | **No** | | | No e-mail/password sign-in (`account_sign_in` flag off; e-mail provider disabled on the server). Update this row if you turn on e-mail or Google sign-in |
| Personal info → Name | Yes | Optional | App functionality (greeting) | Preferred name/nickname only |
| Personal info → Other info | Yes | Optional | App functionality, personalization | Employment status, living arrangement (optional onboarding answers) |
| Financial info → Other financial info | Yes | Optional | App functionality | User-entered bill/subscription amounts and payment dates; no account or card numbers |
| App activity → Other user-generated content | Yes | Optional | App functionality | Tasks, notes, document metadata (dates, issuer, last 4 characters max) |
| App activity → In-app search history | No | | | Searches stay on device |
| Messages → Other in-app messages | Yes | Optional (Ask Adu) | App functionality | AI questions/answers; processed by AI provider |
| App info and performance → Diagnostics | No (v1.0) | | | Add if a crash reporter is enabled |
| Device or other IDs | **Yes** | Required (when online) | App functionality, account management | A random account ID generated per installation (Supabase anonymous user) — not a hardware or advertising ID. No advertising ID (`AD_ID` permission removed) |
| Location, Contacts, Photos, Audio, Calendar, Health, Web history | **No** | | | Permissions blocked in `app.config.ts`; final manifest verified with aapt2 (see test report) |

## Security practices

- Data encrypted in transit: Yes.
- Users can request deletion: Yes.
- Committed to the Families policy: Not applicable (18+).
- Independent security review: **Not yet** — answer "No" until one is completed.

## Other declarations to complete in Play Console

- **Ads**: No ads.
- **Target audience**: 18+.
- **Content rating**: answer from the final build (no violence, no user-to-user chat, AI text generation present → disclose).
- **Government apps / misleading claims**: AdultingOS is *not* a government app; listing and in-app disclaimers say so; no government logos.
- **AI-generated content**: Ask Adu generates text; in-app reporting exists (“Report this answer”); labels “AI-generated”.
- **Financial features**: Declare that the app does not provide financial services (tracking only).
- **App access**: No credentials needed — every feature, including Ask Adu, works without signing in (the app creates a private account automatically).
