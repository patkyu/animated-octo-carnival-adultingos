# AdultingOS

**Life is complicated. Adulting shouldn't be.** A local-first Android app (Expo / React Native) that keeps bills, document renewals, deadlines and everyday responsibilities in one calm place — with curated guides, an AI companion (Ask Adu) and the Adulting Buddies.

> Status: Version 1.0 feature set implemented and tested in this repository. **Not published.** Before release you need a Supabase project, an AI key, an upload signing key, editorial verification of government guides, legal review of the privacy policy, device testing and Google Play's testing track. See `store/compliance/play-submission-checklist.md` and `docs/architecture/implementation-checklist.md`.

## Repository

```
apps/
  mobile/        Expo SDK 58 app (React Native 0.88, TS strict, Expo Router, SQLite, Reanimated)
  admin/         Content portal (Next.js 16 static export, staff-only)
  web-public/    Public site: privacy, terms, account deletion (generated)
packages/
  shared/        Pure domain logic: dates, recurrence, money, reminders, documents, validation, guides (unit-tested)
  brand/         Logo + mascot system as SVG data (renders in-app and exports assets)
supabase/
  migrations/    Postgres schema, RLS, functions     seeds/  generated reference data
  functions/     Edge Functions: ask-adu (AI gateway), delete-account
  tests/         SQL test suites (RLS isolation, sync/idempotency, AI proposals, publishing workflow, privacy lifecycle)
assets/          Brand, mascots (186 SVGs + PNGs), illustrations, icons
store/           Play icon, feature graphic, screenshots, listing text, compliance, release notes
docs/            Architecture, database, API, privacy, deployment, branding, testing
tests/           web-smoke (route crawl + user journeys), e2e (Maestro Android flows)
scripts/         Asset export, seed/site/license generators, screenshots, 16 KB check
```

## Quick start

```bash
npm install
npm run typecheck && npm test          # all workspaces + 44 unit tests
bash supabase/tests/run.sh             # needs a local PostgreSQL 15+ (superuser)

cd apps/mobile
npx expo start                         # dev server (use a development build, not Expo Go)
APP_ENV=demo npx expo run:android      # demo build with synthetic data
```
Without `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` the app runs fully on the device and says that accounts and Ask Adu are unavailable.

Web preview (used for automated tests and screenshots):
```bash
(cd apps/mobile && npx expo export --platform web --output-dir dist-web)
node scripts/serve-web.mjs apps/mobile/dist-web 8089   # open http://localhost:8089/?demo=1
node tests/web-smoke/crawl.cjs && node tests/web-smoke/journeys.cjs
```

Generators: `npm run brand:export` (all logo/mascot/icon/store art), `npx tsx scripts/build-seed.ts`, `npx tsx scripts/build-public-site.ts`, `node scripts/build-licenses.mjs`, `node scripts/capture-store-screenshots.cjs`.

## How it works (short)
- **Local-first**: SQLite on the phone is the source of truth; every write goes through a transaction that also enqueues a durable outbox entry. Sync pushes upserts and pulls by a server sequence; last-writer-wins on device timestamps.
- **Exactly-once recurrence**: next occurrences and payments use deterministic ids, backed by unique constraints in both databases.
- **Reminders** are reconciled from data after every change (no duplicates, deleted items cancel their reminders, private lock-screen text by default).
- **Ask Adu** runs only server-side, answers from editor-approved guides, cites our own source records, says when it can't verify, and only *proposes* tasks the user confirms.
- **Guides** can only be published by reviewers with a verified official source — enforced in Postgres.

Details: `docs/architecture/overview.md`. Test results: `docs/testing/test-report.md`.

## Documentation map
| Topic | File |
|---|---|
| Architecture & decisions | `docs/architecture/overview.md` |
| What's done vs. the brief | `docs/architecture/implementation-checklist.md` |
| Database ERD & dictionary | `docs/database/erd-and-dictionary.md` |
| API (AI gateway, RPCs, sync) | `docs/api/ai-gateway.md` |
| Privacy: data safety, retention, export format, SDKs, staff access, sources | `docs/privacy/` |
| Deployment: backend, Android release, portal | `docs/deployment/` |
| Brand system & mascots | `docs/branding/brand-system.md` |
| Test report | `docs/testing/test-report.md` |
| Store & Play submission | `store/` |

## Disclaimer
AdultingOS is an independent lifestyle and personal organization application. It is not affiliated with, endorsed by, or operated by the Philippine government or any government agency. Government-related information is provided for general guidance. Always verify requirements directly through official government sources.
