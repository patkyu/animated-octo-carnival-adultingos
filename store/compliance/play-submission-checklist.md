# Google Play submission checklist — AdultingOS 1.0.0

Legend: ✅ done in this repository · 🟡 prepared, needs a human/credential · ⬜ not started. **The app is not published.** Verify every Google Play policy immediately before submission — policies change.

## Account and store setup
- 🟡 Developer account identity verification and contact details (owner action)
- 🟡 Confirm package name `com.adultingos.app` is available (first upload reserves it)
- ✅ Store listing text — `store/descriptions/en.md`
- ✅ App icon 512×512 — `store/icons/play-store-icon-512.png`
- ✅ Feature graphic 1024×500 — `store/feature-graphic/feature-graphic-1024x500.png` (key art kept away from edges)
- 🟡 Phone screenshots — 7 of 8 in `store/screenshots/phone/` (captured from the working app's web renderer with synthetic data). Re-capture on an Android device from the demo build; add #6 "Meet your AI adulting buddy" from a staging build with a real grounded answer.
- ⬜ Tablet screenshots — only if tablet distribution is enabled (layout is responsive but not yet tablet-tested)
- ⬜ Promotional video (concept in `store/descriptions/promo-video.md`)
- 🟡 Content rating questionnaire (answer from the final build)
- 🟡 Target audience: 18+
- 🟡 App access: reviewer test account on the production backend (or note that only Ask Adu needs an account)
- 🟡 Ads declaration: **No ads**
- 🟡 Financial features declaration: tracking only, no financial services
- 🟡 Government-information disclosure: independent, not affiliated; official sources linked
- 🟡 AI-generated content: in-app reporting ✅ (Report this answer), labelling ✅, moderation ✅ (provider safeguards + output filter) — declare in Console

## Privacy and user data
- ✅ Public HTTPS privacy policy — https://patkyu.github.io/animated-octo-carnival-adultingos/privacy/ (GitHub Pages); account deletion page https://patkyu.github.io/animated-octo-carnival-adultingos/delete-account/ — 🟡 still recommended: lawyer review before public launch
- ✅ In-app privacy policy and terms (Settings → Privacy)
- ✅ Data safety mapping — `docs/privacy/data-safety-worksheet.md`
- 🟡 Public account deletion URL — page built (`apps/web-public/dist/delete-account`), needs hosting + `config.js`
- ✅ In-app account deletion (real deletion via `delete-account` function; tested in SQL)
- ✅ Data inventory, SDK inventory, retention schedule — `docs/privacy/`
- ✅ AI processing disclosure and consent screen
- ✅ Minimal permissions (POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, INTERNET); no exact alarms, no location/contacts/media/mic, AD_ID removed

## Government information
- ✅ Disclaimer in Guides, Ask Adu, About, listing
- ✅ No government logos or seals; original artwork only
- ⬜ **Verify every government guide against official sources in the admin portal and publish** (none verified — see `docs/privacy/government-source-inventory.md`)
- ⬜ Append verified official URLs to the listing

## Technical release
- ✅ targetSdk 36 / compileSdk 37 (Expo SDK 58 modules require compiling against API 37) / minSdk 24 (`app.config.ts` → expo-build-properties)
- ✅ arm64-v8a (+ x86_64 for emulators); Hermes; New Architecture
- ✅ 16 KB page size — verified on the release APK (`scripts/check-16kb-alignment.sh`)
- ✅ Release APK and AAB build successfully (debug-signed); permissions trimmed to 7
- ✅ Edge-to-edge enabled; safe-area insets respected
- 🟡 Signed AAB — build pipeline ready; **upload key not created** (see `docs/deployment/mobile-release.md`)
- 🟡 Google Play App Signing enrollment (on first upload)
- 🟡 Production backend: Supabase project, secrets, migrations, Google OAuth client, AI key
- ⬜ Pre-launch report reviewed
- ⬜ Accessibility pass with TalkBack on a device; crash testing on 3+ devices

## Testing tracks
1. ⬜ Internal testing (team)
2. ⬜ Closed testing — **if this is a personal developer account created after Nov 2023: 12+ real testers opted in for 14 continuous days** before applying for production. Use `store/compliance/tester-onboarding.md` and `feedback-template.md`; record fixes in `store/release-notes/`.
3. ⬜ Open testing (optional)
4. ⬜ Production

Do not use fake testers or any method to bypass production access requirements.
