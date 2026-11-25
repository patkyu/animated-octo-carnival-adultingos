# Product metrics (privacy-conscious)

v1.0 ships **no analytics SDK**. Metrics are derived from aggregate counts in our own database (`admin_usage_summary()`), never from content.

| Metric | Definition | Source |
|---|---|---|
| Activation | % of new accounts that create a first obligation within 24 h | `profiles.created_at` vs first `obligations.created_at` (aggregate query) |
| Weekly active users | Accounts with any synced write in 7 days | `max(updated_at)` per user, counted |
| Four-week retention | Active in week 4 after sign-up | same, cohorted |
| Task completion rate | done / due occurrences per week | `obligation_occurrences` |
| Reminder-to-completion | Not measurable without notification analytics — **not tracked in v1.0** | — |
| Guide usefulness | Guide checklists added per published guide; outdated reports | `obligations.source='guide'`, `content_reports` |
| AI usefulness | Proposals confirmed / proposals offered; AI reports per 100 answers | `ai_action_proposals`, `ai_content_reports` |
| Crash-free sessions | Requires a crash reporter — **not available in v1.0** (use Play Console vitals) | Play Console |

Guest-mode usage is invisible to us by design. If an analytics SDK is added later: events only (`onboarding_completed`, `first_task_created`, …), no titles/amounts/notes/references/AI text, no advertising IDs; update the Data safety form and privacy policy first.
