# Localization

- English is the complete source language (`apps/mobile/src/i18n/index.ts`).
- Filipino (`fil`) currently covers tabs, onboarding slides, greetings and common actions; everything else falls back to English. It is labelled "Filipino (beta)" in the app and **must be reviewed by a native speaker** before being advertised.
- Dates/amounts are formatted by locale-independent helpers (`formatDateLong`, `formatMinor`) so output is identical on every device.
- Next steps: move remaining strings into the dictionary (screen by screen), add `fil` translations for guides as separate guide versions, and add a pseudo-locale test for truncation at 200% font scale.
