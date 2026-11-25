# SDK and data processor inventory

| Component | Where | Data it touches | Leaves device? | Notes |
|---|---|---|---|---|
| expo-sqlite | App | All user records | No | On-device database; Android backup disabled |
| expo-secure-store | App | Auth session tokens | No | Android Keystore-backed |
| expo-notifications | App | Reminder title/body (generic by default) | No | Local notifications only in v1.0; no push token is registered |
| @supabase/supabase-js | App, portal, public site | Account e-mail, synced records, AI messages, reports | Yes → Supabase | Processor; region per project |
| Supabase (Postgres, Auth, Edge Functions) | Server | As above | — | Processor (DPA required) |
| Anthropic API (via `ask-adu`) | Server | AI question text (long numbers removed), retrieved guide excerpts, optionally titles + due dates of upcoming items | Yes → Anthropic | Only after `ai_processing` consent; record access needs `ai_record_access` consent too. Review the provider's data-retention terms and record them in the privacy policy |
| Google Sign-In (via Supabase OAuth) | System browser | Google account e-mail | Yes → Google | Optional |
| expo-web-browser / auth-session | App | OAuth redirect | — | |
| @react-native-community/netinfo | App | Connectivity state | No | |
| Fonts (Inter, Plus Jakarta Sans) | Bundled | — | No | OFL |
| Analytics SDK | — | — | — | **None in v1.0.** Product metrics in `docs/architecture/analytics.md` are computed from aggregate server counts (`admin_usage_summary`). Adding an SDK requires updating Data safety and the policy |
| Crash reporting SDK | — | — | — | **None in v1.0.** Recommended before production (e.g. Sentry with PII scrubbing); update this table |
| Advertising | — | — | — | None; `AD_ID` permission removed |
