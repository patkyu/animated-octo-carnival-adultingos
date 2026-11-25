# Public site (privacy policy, terms, account deletion)

Hosted free on **GitHub Pages** from the `gh-pages` branch of this repo (HTTPS by GitHub).

| Page | URL | Used in |
|---|---|---|
| Privacy policy | https://patkyu.github.io/animated-octo-carnival-adultingos/privacy/ | Play Console → App content → Privacy policy; store listing; in-app links |
| Account deletion | https://patkyu.github.io/animated-octo-carnival-adultingos/delete-account/ | Play Console → Data safety → "Delete account URL" |
| Terms | https://patkyu.github.io/animated-octo-carnival-adultingos/terms/ | In-app links |

## Republish after editing `apps/mobile/src/content/legal.ts`
```bash
npx tsx scripts/build-public-site.ts
```
```bash
git -C apps/web-public/dist init -q -b gh-pages && git -C apps/web-public/dist add -A && git -C apps/web-public/dist commit -qm "Publish public site" && git -C apps/web-public/dist push -f https://github.com/patkyu/animated-octo-carnival-adultingos.git gh-pages && rm -rf apps/web-public/dist/.git
```
GitHub Pages updates within a minute or two. Pages requires the repository to stay **public** on a free GitHub plan; if you make the repo private, move the site to another host (Netlify, Cloudflare Pages) or a paid GitHub plan first, or the privacy URL will stop working and Play will flag the app.
