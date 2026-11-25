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
| Database: export scope, full account deletion cascade, anonymised remnants, retention job | `50_privacy_lifecycle.sql` | ✅ |
| Edge Functions type check (strict, against real Anthropic/Supabase SDK types) | `deno check …` | ✅ |
| AI gateway logic (redaction, prompt-injection neutralisation, citation enforcement, uncertainty note, phishing filter, record-access intent) | `deno test ask-adu/adu_test.ts` | ✅ 6/6 |
| App route crawl — 44 screens in the real app (web renderer, demo data), fails on any page error or React error screen; deleted-item fallback | `node tests/web-smoke/crawl.cjs` | ✅ 44 routes, 0 errors |
| User journeys in the real UI (fresh profile): onboarding as guest; add monthly bill → pay → **exactly one** next occurrence (Dec 25); paid occurrence listed once; guide → 5 tasks; task create/complete/reopen/delete with confirmation; expired document flagged | `node tests/web-smoke/journeys.cjs` | ✅ 8/8 |
| Admin portal production build | `next build` | ✅ |
| Dependency audit (production deps) | `npm audit --omit=dev --audit-level=high` | ✅ no high/critical (3 moderate in `minimatch`, a build-time glob library) |
| Android release build (APK + AAB) | `./gradlew assembleRelease bundleRelease` | ✅ BUILD SUCCESSFUL |
| 16 KB page size (54 native libs ELF alignment + `zipalign -c -P 16`) | `scripts/check-16kb-alignment.sh` | ✅ compatible |

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
