# Staff access policy

- Staff roles (`admin_roles`) grant access to **content** (guides, sources, versions), **reports** users chose to send, **feature flags** and **aggregate** usage counts.
- **No role** has a policy on `obligations`, `documents`, `bills`, `bill_payments`, `subscriptions`, `ai_conversations`, `ai_messages` or other personal tables. The portal therefore cannot display them.
- AI reports contain only the excerpt the reporter explicitly chose to share (toggle on the report screen).
- Exceptional support access (e.g. investigating data corruption at a user's request) requires: written user request, DPO approval, a time-boxed database role created for the task, actions logged to `audit_events`, and removal of the role afterwards. Never use the service role key from a personal machine.
- Audit events never include content; they are retained 24 months and visible only to super administrators.
