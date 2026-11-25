# Android end-to-end flows (Maestro)

These flows target the Android build on a device or emulator. They have **not** been executed in
the build environment (no emulator/KVM was available); the same journeys run against the web build
in `tests/web-smoke/journeys.cjs`, which passed.

```bash
maestro test tests/e2e
```
Install a development or demo build first (`APP_ENV=development npx expo run:android`).
Flows that need the backend (`*-account.yaml`) require `EXPO_PUBLIC_SUPABASE_*` and two test accounts.
