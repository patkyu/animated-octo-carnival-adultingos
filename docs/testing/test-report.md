# Test report — AdultingOS 1.0.0

Run on 2026-11-25 in the build container (Linux, Node 22, PostgreSQL 16, Deno 2.9, Chromium via Playwright). Every result below was produced by actually running the command shown; nothing is estimated.

## Summary

| Suite | Command | Result |
|---|---|---|
| Type checking (shared, brand, mobile, admin — TS strict) | `npm run typecheck` | ✅ pass |
| Domain unit tests (dates/time zones, recurrence edge cases, money, reminders & quiet hours, documents, progress, achievements, validation, deterministic ids) | `npm test -w @adultingos/shared` | ✅ 35/35 |
| Brand tests (all 432 mascot combinations render valid SVG; logo variants; escaping) | `npm test -w @adultingos/brand` | ✅ 4/4 |
| App content & release-safety tests (legal coverage, disclaimer, flags off in prod, no unverified gov guide releasable) | `npm test -w @adultingos/mobile` | ✅ 5/5 |
| Database: RLS cross-user isolation, anon access, sensitive-number guard | `supabase/tests/10_rls_isolation.sql` | ✅ |
| Database: last-writer-wins, server_seq, immutable owner, exactly-one next occurrence, one payment per occurrence, cascades | `20_sync_and_idempotency.sql` | ✅ |
| Database: AI proposal exactly-once confirmation, cross-user refusal, users can't forge AI messages, history deletion | `30_ai_proposals.sql` | ✅ |
| Database: editorial workflow (editor can't approve/publish, publish requires verified official source, versioning, retrieval index, audit) | `40_guide_workflow.sql` | ✅ |
| Database: export scope, full account deletion cascade, anonymised remnants, retention job (incl. expiry of inactive no-sign-in accounts) | `50_privacy_lifecycle.sql` | ✅ |
| Edge Functions type check (strict, against real Anthropic/Supabase SDK types) | `deno check …` | ✅ |
| AI gateway logic (redaction, prompt-injection neutralisation, citation enforcement, uncertainty note, phishing filter, record-access intent) | `deno test ask-adu/adu_test.ts` | ✅ 6/6 |
| App route crawl — 45 screens in the real app (web renderer, demo data), fails on any page error or React error screen; deleted-item fallback | `node tests/web-smoke/crawl.cjs` | ✅ 45 routes, 0 errors |
| User journeys in the real UI (fresh profile): onboarding as guest; add monthly bill → pay → **exactly one** next occurrence (Dec 25); paid occurrence listed once; guide → 5 tasks; task create/complete/reopen/delete with confirmation; expired document flagged; auto-renewing subscription rolls forward | `node tests/web-smoke/journeys.cjs` | ✅ 9/9 |
| Lint (ESLint, expo config) | `npm run lint -w @adultingos/mobile` | ✅ 0 errors (7 intentional warnings) |
| Admin portal production build | `next build` | ✅ |
| Dependency audit (production deps) | `npm audit --omit=dev --audit-level=high` | ✅ no high/critical (3 moderate in `minimatch`, used only by Expo's build-time fingerprint tool; fix requires a breaking forced downgrade) |
| Android release build (APK + AAB) | `./gradlew assembleRelease bundleRelease` | ✅ BUILD SUCCESSFUL |
| 16 KB page size (54 native libs ELF alignment + `zipalign -c -P 16`) | `scripts/check-16kb-alignment.sh` | ✅ compatible |

## Live backend tests (2026-11-26, Supabase project `vmjinibzebnzaplbqjgb`, Tokyo)
Deployed with the Supabase Management API: 10 migrations, reference seed, `ask-adu` and `delete-account` Edge Functions, Auth redirect URLs and password policy. Tested through the public API with the publishable key, using two temporary test accounts (deleted afterwards; the project was left with 0 users and 0 personal rows).

| Suite | Command | Result |
|---|---|---|
| Database & sync over the real API: anonymous access limits, published snapshots, knowledge search, sign-in, sign-up trigger, sync upserts as the app sends them, exactly-once occurrences, last-writer-wins, cross-user isolation (read/write/spoof/export), data export, consent | `node tests/integration/supabase-live.mjs` | ✅ 22/22 |
| Ask Adu with the real model + deletion: grounded answer with guide citation; unverifiable government question → "couldn't verify" + official site; ID-number redaction (not stored); proposal confirmed exactly once; reporting; AI history deletion; `delete-account` requires confirmation, deletes the user, sign-in then fails | `node tests/integration/ask-adu-live.mjs` | ✅ 16/17 on the final run; the 1 failure was a test counting leftovers from the previous run (fixed); the database confirms each proposal created exactly its 2 tasks |

Bugs found only by testing against real Supabase (both fixed, with local regression tests):
- **Data export always failed** for signed-in users: `export_my_data()` was `STABLE` but writes an audit row; PostgREST runs stable functions read-only. → `VOLATILE` (migration `…0200`) + a test that flags any non-volatile function that writes.
- **Ask Adu missed relevant guides** for natural questions: full-text search required every word to match. → match any meaningful term, ranked (migration `…0300`); the moving-out question is now answered from the guide with a citation.

## No-sign-in accounts (2026-11-27)
No e-mail, password or SMTP: each installation gets a private Supabase **anonymous** account automatically. Server: anonymous sign-ins ON, e-mail provider OFF, manual linking ON; inactive anonymous accounts deleted after 12 months (migration `…20261127000100`). Every test account was deleted at the end; the project was left with 0 users.

| Suite | Command | Result |
|---|---|---|
| Database & sync over the real API with two no-sign-in accounts (e-mail sign-up refused, separate accounts, profile trigger, sync, exactly-once, LWW, isolation, export, consent, deletion of both) | `node tests/integration/supabase-live.mjs` | ✅ 25/25 |
| Ask Adu + deletion with no-sign-in accounts (grounded answer with citation, unverifiable government question, redaction, exactly-once proposal, report, history deletion, typed-confirmation deletion, deleted token and refresh rejected) | `node tests/integration/ask-adu-live.mjs` | ✅ 19/19 |
| Real app UI against the live backend: Get started has no e-mail/password; onboarding has no account step; private account created and synced automatically; no "Sign out"; Ask Adu reachable (consent first); after agreeing the chat opens; account deleted | `node tests/web-smoke/anonymous-account.cjs` | ✅ 7/7 |
| Local-only build (no backend): crawl + 9 journeys with the new Get started screen | `crawl.cjs`, `journeys.cjs` | ✅ |

Found on a real phone (owner, 2026-11-27): after "I understand — continue" the Ask Adu tab kept showing "Review and continue" — consent was saved, but the tab only checked it when first opened. → re-checked whenever the tab is shown; the UI journey reproduces the bug on the old code and passes on the fix.

Found while testing: web exports didn't receive the backend settings (Expo embeds `app.config` extras only in native builds) → `EXPO_PUBLIC_*` fallback in `src/config/env.ts`. Browser pages can't call the Edge Functions unless their origin is in `ALLOWED_WEB_ORIGINS` (by design; the Android app sends no origin).

## Second audit (2026-11-26) — defects found and fixed
| # | Defect | Impact | Fix | Verified by |
|---|---|---|---|---|
| 1 | Notification **Mark done / Snooze** buttons were set not to open the app, but their handlers are JavaScript that only runs in a live app | Tapping them with the app closed silently did nothing | Actions now bring the app up to apply them | Code review (needs device check) |
| 2 | The last notification tap was re-handled on every launch | App re-navigated to an old item each start | Each response handled once (persisted key) | Code review |
| 3 | Published guides were read from live tables | An editor's change to a published guide reached users without review | Users read reviewer-published **snapshots** only (`published_guides()`); live tables staff-only | SQL test 40 |
| 4 | Any editor could mark a source "verified" | Bypassed reviewer verification | Trigger: reviewer-only verification; editing a verified source clears it | SQL test 40 |
| 5 | That trigger first ran as owner and treated everyone as privileged | Found by the new test | Made `SECURITY INVOKER` | SQL test 40 |
| 6 | Auto-renewing subscriptions showed "Overdue" until tapped | Wrong status and reminders | Past renewals roll forward at launch/foreground (exactly-once) | Journey 9 |
| 7 | Time zone only refreshed at cold start | Mistimed reminders after travel | Re-checked whenever the app returns to the foreground | Code review |
| 8 | `Mascot` called a hook conditionally | Possible crash when toggling animations | Hooks called unconditionally | ESLint `rules-of-hooks` |
| 9 | Components declared inside render (Ask Adu gate, calendar day list) | Remounts, lost state | Moved to module level | ESLint |
| 10 | Auth links parsed with `new URL()` on custom schemes | Fragile on Hermes | expo-linking parser | Typecheck |
| 11 | AI history window could start with an assistant turn | Model API rejects the request | Leading assistant turns trimmed | Deno check |
| 12 | Four unused native dependencies (AsyncStorage, expo-application, expo-auth-session, expo-device) | Size, extra permission surface | Removed | Android rebuild |
| 13 | Content stretched edge-to-edge on tablets | Poor tablet layout | 720 dp centred column | Tablet screenshot |
| 14 | No linter configured | Brief requires lint | ESLint (expo config) in scripts + CI; 0 errors | `npm run lint` |

## Defects found and fixed during testing
- expo-sqlite on web lacks exclusive transactions → added a platform-aware `withTx` (Android keeps exclusive transactions).
- "Renews dec 6, 2026" casing bug → added `relativeDayPhrase()` with tests.
- Sync design review: achievement ids were deterministic per achievement and would have collided across users on the server's global primary key → switched to random ids plus natural-key conflict handling.
- Guest users saw a "waiting to sync" icon → hidden outside account mode.
- Footer button truncation ("Resched…") → equal-width compact buttons.

## Not covered here (honest gaps)
| Area | Why | Covered by |
|---|---|---|
| On-device Android behaviour: notification delivery, permission prompts, reboot persistence, actions, predictive back, TalkBack, font scaling 200%, process death | No emulator/KVM in this environment | Maestro flows in `tests/e2e/` (written, not executed) + manual matrix in `docs/deployment/mobile-release.md` |
| Live auth, sync against Supabase, Google Sign-In, Ask Adu with a real model, account deletion via the function | No Supabase project or AI key available | SQL suites cover the server rules; `tests/e2e/07-ai-and-deletion-account.yaml` for staging |
| Performance (cold start, 1k+ tasks, low-memory, battery) | Needs hardware | To do before closed testing |
| Security testing beyond automated checks (pen test) | Out of scope for this environment | Recommended before launch |

## Android build
**Upload-signed release (2026-11-25):** `release/adultingos-1.0.0-vc1-upload-signed.aab` (46.1 MB) — signed with the Play upload key (CN=Patricia Mae Quitoriano, O=AdultingOS; SHA-1 `89:F5:8B:E7:…:99:9B`), verified with `jarsigner`/`apksigner`; `com.adultingos.app` 1.0.0 (versionCode 1), targetSdk 36; connected to the Supabase project `vmjinibzebnzaplbqjgb`; 16 KB compatible; no secret keys in the bundle. The table below describes the earlier debug-signed build.

| Item | Result |
|---|---|
| Package / version | `com.adultingos.app` 1.0.0 (versionCode 1), APP_ENV=production, no backend configured (runs local-only) |
| SDK levels | compileSdk 37, **targetSdk 36**, minSdk 24 (verified with `aapt2 dump badging`) |
| ABIs | arm64-v8a, x86_64; Hermes; New Architecture |
| Permissions in merged manifest | INTERNET, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, WAKE_LOCK, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE (+ AndroidX's internal non-exported receiver permission) |
| 16 KB | ✅ all 54 native libraries LOAD-aligned ≥ 16 KB; zipalign -P 16 verified |
| Signing | APK Signature Scheme v2 with the **Android debug certificate** — installable for internal testing, **not uploadable** to Play |
| Sizes | APK 66.6 MB (both ABIs, universal); AAB 46.1 MB (Play serves per-ABI splits) |
| SHA-256 | APK `632b8486…bdf63a37`, AAB `fee2a574…6276b1df` |

Build issues found and fixed: (1) the React Native Gradle plugin needs a JDK 17 toolchain → install JDK 17; (2) Expo SDK 58 modules require compileSdk 37 → raised compileSdk (target stays 36); (3) libraries merged unused permissions (biometric, FCM receive, install referrer, 17 launcher-badge permissions) → blocked in `app.config.ts`; (4) Maven Central rate-limited the build host (HTTP 429) → `scripts/maven-central-mirror.gradle` passed with `--init-script`.

Not done: installing and running the APK on a device or emulator (none available).
