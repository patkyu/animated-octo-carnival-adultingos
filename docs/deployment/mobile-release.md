# Android release

## Environments
| APP_ENV | Package | Database | Notes |
|---|---|---|---|
| development | `com.adultingos.app.dev` | `adultingos.db` | Draft guides visible (labelled) |
| demo | `com.adultingos.app.demo` | `adultingos-demo.db` (synthetic data, auto-seeded) | Screenshots, reviewers |
| production | `com.adultingos.app` | `adultingos.db` | Unreleased features and unverified guides hidden |

Public config comes from env vars at build time: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPPORT_EMAIL`. Without them the app runs fully on-device and says accounts/Ask Adu are unavailable.

## Build locally
Requirements: Node 22, JDK 17 (the React Native Gradle plugin needs a Java 17 toolchain), Android SDK (platforms;android-37.0, build-tools 37).
```bash
cd apps/mobile
APP_ENV=production npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease     # APK for internal device testing
./gradlew bundleRelease       # AAB for Google Play
bash ../../../scripts/check-16kb-alignment.sh app/build/outputs/apk/release/app-release.apk
```
If Maven Central answers HTTP 429 (common behind shared egress/CI IPs), route it through Google's mirror for that build only: `./gradlew --init-script ../../../scripts/maven-central-mirror.gradle assembleRelease`.

Or with EAS: `npx eas-cli build -p android --profile production`.

## Signing (required before uploading to Play)
Release builds are signed with the **upload key** when these environment variables are set (config plugin `apps/mobile/plugins/withReleaseSigning.js`); otherwise they fall back to the debug key, which Play rejects.

| Variable | Value |
|---|---|
| `ADULTINGOS_UPLOAD_STORE_FILE` | absolute path to `adultingos-upload.keystore` |
| `ADULTINGOS_UPLOAD_STORE_PASSWORD` | keystore password |
| `ADULTINGOS_UPLOAD_KEY_ALIAS` | `upload` (default) |
| `ADULTINGOS_UPLOAD_KEY_PASSWORD` | defaults to the store password |

```bash
APP_ENV=production npx expo prebuild --platform android --clean --no-install
```
```bash
cd apps/mobile/android && ./gradlew bundleRelease --init-script ../../../scripts/maven-central-mirror.gradle
```
Output: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

The upload key was created on 2026-11-25 (alias `upload`, RSA 2048, valid until 2054; SHA-1 `89:F5:8B:E7:25:A9:23:8E:72:8F:38:89:A6:0E:03:71:25:86:99:9B`). **The keystore and its password are never committed.** Keep both in two safe places (e.g. a password manager + an offline drive). With **Play App Signing** (default for new apps) Google holds the app-signing key; if the upload key is lost, request an upload-key reset in Play Console → Setup → App signing.

Bump `version` and `android.versionCode` in `app.config.ts` for every upload — Play rejects a versionCode it has already seen.

## Release steps
1. Bump `version` and `android.versionCode` in `app.config.ts`.
2. CI green (typecheck, unit, DB, edge, web journeys, admin build, Android build, 16 KB check).
3. Build signed AAB → upload to **Internal testing** → install from Play on 3+ devices (Android 10, 13, 15+), TalkBack pass.
4. Closed testing (see `store/compliance/play-submission-checklist.md` for the 12 testers × 14 days rule).
5. Review the pre-launch report, fix, promote.

## Device test matrix (to do on hardware)
Notifications (permission grant/deny, reboot persistence, quiet hours, time-zone change, actions), back gesture/predictive back, edge-to-edge insets, dynamic font size 200 %, TalkBack order, dark mode, low-memory process death (state restore), offline then reconnect sync, deep links from notifications to deleted items.
