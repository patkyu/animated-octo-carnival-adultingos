# Content portal and public site

## Admin portal (`apps/admin`)
Static Next.js export; every permission is enforced by Postgres (RLS + `set_guide_status`, `publish_guide`, role-checked policies), so the portal holds no secrets.
```bash
cd apps/admin
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npx next build   # → out/
```
Host `out/` on a separate domain (e.g. `admin.adultingos.app`) behind HTTPS with these headers:
```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://<project>.supabase.co; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```
Recommended: put it behind an access proxy (e.g. company SSO) in addition to Supabase Auth, and require MFA for staff accounts.

**Editorial workflow:** editor drafts → *Submit for review* → reviewer checks every requirement, step, fee and time against the official page → *I verified this today* on the source → *Approve* → *Publish* (creates a version snapshot and rebuilds the AI retrieval index). Mark *Needs update* when a user report or the 180-day alert indicates drift.

## Public site (`apps/web-public`)
`npx tsx scripts/build-public-site.ts` → `apps/web-public/dist/` (landing, `/privacy`, `/terms`, `/delete-account`). Copy `config.example.js` to `config.js` with the public Supabase URL/anon key. Host at `https://adultingos.app` with the same security headers (allow `https://cdn.jsdelivr.net` in `script-src` for supabase-js on the deletion page).
