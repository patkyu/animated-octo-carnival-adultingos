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
The generated project signs release builds with the **debug keystore** — fine for internal APK testing, **not uploadable** to Play.

1. Create an upload key (keep it out of git; back it up securely):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore adultingos-upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Provide credentials via `~/.gradle/gradle.properties` or CI secrets (`ADULTINGOS_UPLOAD_STORE_FILE`, `…_PASSWORD`, `…_KEY_ALIAS`, `…_KEY_PASSWORD`) and a small config plugin / EAS credentials to use them for `release`.
3. Enroll in **Play App Signing** on first upload (Google holds the app signing key; you keep the upload key).

## Release steps
1. Bump `version` and `android.versionCode` in `app.config.ts`.
2. CI green (typecheck, unit, DB, edge, web journeys, admin build, Android build, 16 KB check).
3. Build signed AAB → upload to **Internal testing** → install from Play on 3+ devices (Android 10, 13, 15+), TalkBack pass.
4. Closed testing (see `store/compliance/play-submission-checklist.md` for the 12 testers × 14 days rule).
5. Review the pre-launch report, fix, promote.

## Device test matrix (to do on hardware)
Notifications (permission grant/deny, reboot persistence, quiet hours, time-zone change, actions), back gesture/predictive back, edge-to-edge insets, dynamic font size 200 %, TalkBack order, dark mode, low-memory process death (state restore), offline then reconnect sync, deep links from notifications to deleted items.
