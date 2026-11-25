# Data export format (`adultingos-export`, formatVersion 1)

Settings → Export my data → **Export JSON** writes one UTF-8 JSON file:

```jsonc
{
  "format": "adultingos-export",
  "formatVersion": 1,
  "exportedAt": "2026-11-25T10:00:00.000Z",
  "source": "device",
  "data": {
    "profile": { "preferredName": "…", "timezone": "Asia/Manila", … },
    "preferences": { … },
    "notification_preferences": { … },
    "categories": [ … ],
    "obligations": [ { "id": "uuid", "kind": "task|bill|subscription", "title": "…", "recurrence": { "freq": "monthly", "interval": 1, "anchorDay": 31 }, … } ],
    "obligation_occurrences": [ { "id": "uuid", "obligation_id": "uuid", "scheduled_date": "YYYY-MM-DD", "due_date": "YYYY-MM-DD", "status": "open|done|skipped", "completed_on": null, "amount_minor": 123450 } ],
    "task_checklist_items": [ … ],
    "documents": [ { "template_key": "passport", "expiry_date": "YYYY-MM-DD", "reference_last4": "4821", … } ],
    "document_renewals": [ … ],
    "bills": [ { "amount_minor": 169900, "currency": "PHP", … } ],
    "bill_payments": [ { "paid_on": "YYYY-MM-DD", "amount_minor": 169900, … } ],
    "subscriptions": [ … ],
    "user_achievements": [ … ]
  },
  "account": null | { "format": "adultingos-export", "formatVersion": 1, "exportedAt": "…", "data": { /* same tables from the server + consent_records, ai_conversations, ai_messages, ai_action_proposals, feedback_reports, content_reports, ai_content_reports */ } }
}
```

Conventions:
- Dates are local calendar dates `YYYY-MM-DD`; instants are ISO-8601 UTC.
- **Amounts are integer minor units** (`amount_minor: 123450` = ₱1,234.50).
- Internal sync columns (`server_seq`, `client_updated_at`, `sync_state`, `user_id`) are omitted; deleted records are excluded.

CSV exports: `adultingos-tasks-YYYY-MM-DD.csv` (title, type, category, priority, due_date, due_time, status, completed_on, repeats, notes) and `adultingos-bills-YYYY-MM-DD.csv` (bill, provider, category, due_date, status, amount, currency, paid_on, amount_paid). Amounts in CSV are decimal strings; cells beginning with `= + - @` are prefixed with `'` to prevent formula injection.
