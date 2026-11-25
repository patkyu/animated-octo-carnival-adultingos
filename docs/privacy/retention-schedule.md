# Data retention schedule

| Data | Retention | Mechanism |
|---|---|---|
| Account records (profile, tasks, bills, documents, subscriptions, preferences, achievements) | While the account exists | Deleted with the account (FK cascade from `auth.users`) |
| Deleted records (tombstones) | 90 days after deletion, then purged | `run_retention()` (pg_cron, daily 03:17) |
| AI conversations and messages | Until deleted by the user, or 12 months after last activity | `delete_my_ai_history()`, per-conversation delete, `run_retention()` |
| Pending AI proposals | Expire after 7 days | `expires_at`; `run_retention()` marks expired |
| Consent records | While the account exists (needed to prove consent) | Cascade on account deletion |
| Content / AI / feedback reports | Kept for content-quality purposes; reporter identity removed on account deletion | `user_id ON DELETE SET NULL` |
| Account deletion requests | Indefinitely, without identity (proof of deletion); web e-mail hash cleared on completion | `run_retention()` |
| Audit events (no content) | 24 months | `run_retention()` |
| Server notification logs (no content) | 90 days | `run_retention()` |
| Database backups | Provider-managed (Supabase PITR/daily) — **set to ≤30 days** and state the value in the privacy policy | Supabase project settings |
| Guest / on-device data | Until the user deletes it, signs out, or uninstalls | `wipeAllUserData()`; Android backup disabled (`allowBackup=false`) |
