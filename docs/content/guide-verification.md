# Guide verification procedure

1. **Editor** drafts or updates the guide in the portal. Never copy content from unofficial sites; never state fees, processing times, document counts or form numbers unless the official page states them.
2. **Editor** adds at least one *official* source (the agency's own page for the procedure, not a homepage if a specific page exists) and submits for review.
3. **Reviewer** opens every source, checks each requirement, step, fee and time against it, removes anything not on the page, then clicks **I verified this today** on each checked source.
4. **Reviewer** approves and publishes. `publish_guide()` refuses unless the guide is approved and has a verified official source; it snapshots a version and rebuilds the AI retrieval chunks.
5. Re-verify every published guide at least every **180 days** (the portal's Overview lists overdue ones) and whenever a user reports a problem. Mark **Needs update** while checking — the app shows a "being reviewed" notice.
6. Record each verification in `docs/privacy/government-source-inventory.md` for the release audit trail.

Current state: the nine government guides are drafts written without access to the official sites. They intentionally contain only general, low-risk statements and must still be fully checked before publication.
