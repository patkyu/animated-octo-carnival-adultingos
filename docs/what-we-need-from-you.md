# What's needed from the owner to launch AdultingOS

Everything the code can do without your accounts, keys or decisions is done and tested (`docs/testing/test-report.md`). These items need you. Order = what unblocks the most.

## 1. Accounts and keys (unblocks sign-in, sync, Ask Adu)
| # | Item | Why | Where it goes |
|---|---|---|---|
| 1 | ✅ **Development Supabase project** — done (`vmjinibzebnzaplbqjgb`, Tokyo): schema, seed, functions, auth settings deployed and tested. Still needed: a separate **production** project (choose Singapore) before launch | Accounts, sync, Ask Adu | — |
| 2 | ✅ **Anthropic API key** — done (Supabase secret), verified with live answers | Ask Adu | — |
| 3a | **Custom SMTP for e-mail** (Resend, Postmark or SES on your domain) → Supabase Auth → Emails → SMTP | Without it real users get **no verification or password-reset e-mails** (built-in sender only reaches your team, a few per hour) | Supabase dashboard |
| 3 | **Google OAuth web client** (Google Cloud console) | "Continue with Google" | Client ID + secret into Supabase Auth → Providers → Google |
| 4 | **Support e-mail address** | In-app contact, store listing, privacy policy | `EXPO_PUBLIC_SUPPORT_EMAIL` |
| 5 | **Domain** (e.g. adultingos.app) + static hosting | Play requires a public privacy policy URL and an account-deletion URL | Host `apps/web-public/dist` |

## 2. Google Play
| # | Item | Why |
|---|---|---|
| 6 | **Play Console developer account** with identity verification | Required to publish |
| 7 | Confirm package name **com.adultingos.app** (or choose another) | Reserved on first upload; can never change |
| 8 | **Upload signing key** — create it yourself (`docs/deployment/mobile-release.md`) and keep it out of git | Current APK/AAB are debug-signed and can't be uploaded |
| 9 | **12+ real testers** for 14 continuous days (if your account is a personal account created after Nov 2023) | Required before production access |
| 10 | Answers for the content rating, target audience and Data safety forms (draft answers in `docs/privacy/data-safety-worksheet.md`) | Console declarations |

## 3. People and reviews
| # | Item | Why |
|---|---|---|
| 11 | **A content reviewer** to verify the 9 government guides against official sites and publish them in the admin portal | I couldn't reach any .gov.ph site; unverified guides stay hidden in production. Without this, launch with general guides only |
| 12 | **Lawyer / Data Protection Officer** review of the privacy policy and terms; fill the bracketed placeholders (legal entity, address, DPO contact, hosting region, backup retention) | Data Privacy Act compliance |
| 13 | **Native Filipino speaker** — or decide to launch English-only | Filipino currently covers navigation/onboarding only |
| 14 | Name/trademark/domain availability check for "AdultingOS" | Brand guidelines require it before launch |

## 4. Testing on hardware
| # | Item | Why |
|---|---|---|
| 15 | **An Android phone** (or let me attach a computer with an emulator via Remote Control) | Notifications, reboot persistence, TalkBack, back gestures and the Maestro flows can't run here |
| 16 | Re-capture store screenshots on a device; screenshot #6 (Ask Adu) once the backend + AI key exist | Store must show the real Android app |

## 5. Decisions
| # | Decision | Default if you don't decide |
|---|---|---|
| 17 | GitHub repo visibility (currently **public**) | Recommend private until launch |
| 18 | Launch with or without Ask Adu | Can ship with `AI_PROVIDER=disabled` and turn it on later |
| 19 | Crash reporting (e.g. Sentry) | None in v1.0 — recommended; needs a privacy-policy/Data safety update |
| 20 | Premium (AdultingOS Plus) pricing and timing | Stays off; Play Billing not integrated |
| 21 | Mascot animation files (Lottie) — hire an animator? | In-app code animation only |

## Optional: let me do more here
- Allow the `.gov.ph` domains in this environment's network settings and I can pre-check official pages and prepare reviewer notes (a human must still verify and publish).
- Share the Supabase URL + anon key and I can run the full sync/auth/Ask Adu flows against staging.
