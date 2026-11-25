# Implementation checklist (against the master prompt)

✅ implemented and verified here · 🟢 implemented, not verifiable in this environment · 🟡 partial · ⬜ not done (with reason)

| § | Area | Status | Notes / evidence |
|---|---|---|---|
| 3 | Brand palette, semantic light/dark tokens, typography | ✅ | `src/theme/tokens.ts`; WCAG ratios measured (`docs/branding/brand-system.md`) |
| 3 | Logo system (primary, horizontal, stacked, symbol, mono, light/dark, adaptive, themed mono, Play icon, splash) | ✅ | `assets/branding`, `apps/mobile/assets`, `store/icons` |
| 4 | Six mascots × 8 expressions × 3 poses × 3 views, scenes, transparent PNG/SVG | ✅ | 186 SVGs + PNGs; contact sheet |
| 4 | Mascot animations | 🟡 | Reanimated idle/celebrate in app; Lottie/Rive files not produced (documented) |
| 4 | Favorite companion, disable animations, reduced motion, hide mascots | ✅ | Settings → Appearance / Mascots |
| 5 | Five tabs, contextual Add, state kept per tab, safe deep-link fallback | ✅ | Route crawl (44 routes) + journeys |
| 6 | Splash (no artificial delay), 3 welcome screens with Skip/Next/Get started | ✅ | |
| 6 | Email sign-up/sign-in, verification, reset, Google (PKCE), session restore, logout, deletion | 🟢 | Code complete; needs a Supabase project to exercise |
| 6 | Guest mode + transfer without duplicates | ✅/🟢 | Guest verified in journeys; transfer = re-upload by stable ids (needs backend) |
| 6 | Optional questionnaire, companion, notification preferences; no sensitive data | ✅ | |
| 7 | Home: greeting, date, bell, avatar, companion message from data, priorities with one-tap complete & reschedule, category cards with real data, 7-day timeline, quick actions, real progress | ✅ | Screenshot 1 |
| 8 | Tasks: all fields, CRUD, complete/reopen, archive/restore, search/filter/sort, calendar & list, recurrence (daily→yearly, custom), subtasks, bulk, custom categories, snooze, reschedule | ✅ | Recurrence edge cases unit-tested; exactly-once next occurrence (unit, SQL, UI journey) |
| 9 | Document tracker: 15 templates, statuses, masked last-4 reference, renewal reminders, history, official link | ✅ | Vault deliberately not built (spec) |
| 10 | Bills: categories, fields, variable amounts, history, by category, mark paid → next | ✅ | Integer centavos; disclaimer |
| 11 | Subscriptions: equivalents, trials, renewals, recorded cancellation | ✅ | |
| 12 | Savings goals | ⬜ | Phase 4 — schema + RLS exist; screens behind `savings_goals` flag |
| 13 | Guides library, structure, governance workflow, reports, disclaimer | 🟡 | All mechanics ✅ (DB-enforced publishing). **No government guide verified** — official sites unreachable from the build environment; drafts hidden in production |
| 14 | Life milestones | ⬜ | Phase 2/4 — schema only |
| 15 | Household | ⬜ | Phase 4 — schema + member-scoped RLS |
| 16 | Wellness routines | ⬜ | Phase 4 — schema only |
| 17 | Calendar month/week/agenda, filters, indicators | ✅ | |
| 17 | Local notifications: categories, quiet hours, weekly summary, private lock screen, snooze & done actions, deep links, reboot (RECEIVE_BOOT_COMPLETED), TZ changes, dedupe, permission at meaningful point | 🟢 | Logic unit-tested; on-device behaviour needs hardware (Maestro flows written) |
| 17 | Remote push | ⬜ | Not needed for v1 reminders; `user_devices`/`reminders` tables prepared |
| 18 | Ask Adu: RAG over approved content, citations, uncertainty, proposals + confirmation, provider abstraction, keys server-side, rate limit, timeouts, structured output, moderation filter, reporting, history delete, consent, offline handling | 🟢 | Gateway logic unit-tested (Deno), DB confirmation exactly-once tested (SQL); live model call not exercised (no key) |
| 19 | Milestones (optional, no streaks) | ✅ | |
| 20 | Profile & settings incl. export, AI history deletion, account deletion, policies, support, licenses, rate app | ✅ | Change password/sign-out-all 🟢 |
| 22 | Design system components, 8dp grid, 48dp targets, system states, accessibility labels, dynamic type | ✅ | TalkBack pass on device ⬜ |
| 23 | Expo SDK 58 / RN 0.88 / TS strict / Expo Router / Reanimated / SVG / TanStack Query / Zustand / RHF / Zod / SQLite / SecureStore | ✅ | Lottie/Rive not used |
| 23 | Android target API 36, arm64, 16 KB, edge-to-edge, minimal permissions | ✅ | See test report for build + 16 KB result |
| 24 | Normalized schema, UUIDs, tz-aware timestamps, local dates, RLS everywhere, idempotent ops, migrations, seeds, dictionary, ERD | ✅ | 5 SQL suites pass on Postgres 16 |
| 25 | Offline: local-first, durable outbox, sync states, conflict handling (LWW), AI disabled offline | ✅/🟢 | Sync against a live server not exercised |
| 26 | Security & privacy controls, data rights, retention, public deletion page, accurate policy draft | 🟡 | Policy needs legal/DPO review; no external security test yet |
| 27 | Admin portal: guides, sources, review/approval, versions, outdated alerts, reports, flags, aggregate analytics, audit, roles | ✅ | Builds; needs a backend to use. Publication *scheduling* ⬜ (publish is manual) |
| 28 | Monetization | ⬜ | Premium flag off; Play Billing not integrated (spec: keep disabled) |
| 29 | Analytics | 🟡 | Aggregate server metrics only; no SDK (privacy-first) |
| 30 | Unit / integration / E2E / performance tests | 🟡 | Unit ✅, DB ✅, Edge ✅, web E2E ✅; Android E2E written not run; performance not measured |
| 31–32 | Store assets, descriptions, compliance docs | 🟡 | 7/8 screenshots; promo video concept only |
| 33 | Monorepo structure | ✅ | |
| 35 | Signed production AAB | ⬜ | Needs the owner's upload key |
