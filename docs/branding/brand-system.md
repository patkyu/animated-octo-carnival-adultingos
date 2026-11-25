# AdultingOS brand system

Visual review sheet: `docs/branding/contact-sheet.png` (every logo variant, every mascot × expression, poses, turnarounds, empty/error scenes). All artwork is original and generated from code in `packages/brand` — the same geometry renders in the app (react-native-svg) and exports to files (`npm run brand:export`).

## Logo

**Concept.** A rounded square (stability, a "home screen" for life admin) holding a checkmark (accomplishment), circled by an open orbit (an operating system that keeps things moving) with a small peach "planet" — your next step.

| File | Use |
|---|---|
| `assets/branding/logo-symbol.svg` / `-1024.png` | Primary symbol (teal tile) |
| `assets/branding/logo-symbol-on-dark.svg` | On teal or dark backgrounds (mint tile) |
| `assets/branding/logo-symbol-mono-{teal,black,white}.svg` | Single-colour (print, embossing, themed contexts) |
| `assets/branding/wordmark-horizontal-{light,dark}.svg/.png` | Horizontal lockup — "Adulting" in Plus Jakarta Sans ExtraBold, "OS" SemiBold in teal |
| `assets/branding/logo-stacked-{light,dark}.svg/.png` | Stacked lockup with tagline |
| `apps/mobile/assets/icon.png` | Launcher icon (full bleed) |
| `apps/mobile/assets/adaptive-icon.png` + background `#174B49` | Android adaptive icon (artwork inside the 66% safe zone) |
| `apps/mobile/assets/adaptive-icon-monochrome.png` | Android 13+ themed (monochrome) icon |
| `apps/mobile/assets/splash-icon.png` | Splash screen |
| `store/icons/play-store-icon-512.png` | Google Play icon (512×512) |

Rules: minimum symbol size 24 px (tested at 24/32/48 px on the contact sheet); clear space = ¼ of the symbol width; never recolour the checkmark red, rotate, or add effects; never combine with government seals or agency logos. SVG wordmarks use live text — use the PNGs (font embedded at render time) or outline the text before print.

## Colour tokens

Raw palette in `packages/brand/src/tokens.ts`; **semantic tokens** (light + dark) in `apps/mobile/src/theme/tokens.ts`. Components use semantic names only (`primary`, `textMuted`, `catDocuments`…). Pastels are surfaces; text on them uses `onCategory` (Ink in light mode).

| Pairing (light) | Ratio | Pairing (dark) | Ratio |
|---|---|---|---|
| Ink `#172B36` on Ivory `#FAF8F3` | 13.79 | Text `#EEF3F1` on `#0F1E22` | 15.24 |
| Slate `#526575` on Ivory | 5.69 | Muted `#A9BAC0` on background | 8.52 |
| Slate on White cards | 6.04 | Muted on surface `#16292E` | 7.53 |
| White on Deep Teal `#174B49` | 9.82 | `#0B2A27` on primary `#7FD3B8` | 8.67 |
| Ink on Mint / Lavender / Peach / Soft Blue / Soft Yellow | 11.37–12.97 | Warning `#F2C374` on `#3A2E17` | 8.11 |
| Teal on Mint | 7.95 | | |
| Amber on `#FDF0D9` · Red on `#FDE7E4` · Green on `#DDF3E8` · Info on `#DCEBFA` | 5.00 · 5.55 · 5.54 · 5.54 | | |

Ratios computed with the WCAG 2.x relative-luminance formula; all text pairings meet AA (≥ 4.5 : 1). Re-run the check after any token change. Status is always icon + text, never colour alone.

## Typography

Plus Jakarta Sans (ExtraBold/Bold) for display and section titles; Inter for UI, forms and numbers (tabular figures); system sans-serif fallback. Scale: display 32, title 24, section 18, body 16, support 14, caption 12 (sp). Text scales with the system font size (`maxFontSizeMultiplier` 2, display 1.6).

## The Adulting Buddies

Shared language: rounded silhouettes, 4 px outlines in a deeper tone of the body colour, dot or arc eyes with a highlight, blush cheeks, short stroke limbs, a soft ground shadow.

| Buddy | Form | Role | Signature |
|---|---|---|---|
| **Adu** | Mint sprout-bean with leaf pair and a checkmark emblem | Main companion, onboarding, Ask Adu | "One step at a time." |
| **Doki** | Lavender folder with a paper peeking out | Documents, guides | "Paperwork doesn't have to be painful." |
| **Piso** | Peach piggy bank with a gold coin in the slot | Bills, subscriptions | "Every little peso counts." |
| **Tiki** | Soft-blue alarm clock with bells | Calendar, reminders | "You've got time to get this done." |
| **Homi** | Cream house with an orange roof and round attic window | Household (Phase 4) | "A little care makes a happy home." |
| **Sunny** | Yellow sun with rounded rays | Wellness, milestones | "Rest is productive, too." |

Assets per buddy (`assets/mascots/<id>/`): 8 expressions (neutral, happy, excited, confused, thoughtful, sleepy, celebrating, gentle concern) × 3 poses (idle, wave, hold — each buddy holds a themed object), front/three-quarter/side turnaround, transparent PNGs, plus empty/error/offline/success scenes in `assets/illustrations/`.

**Turnarounds** are a consistent reference (horizontal compression + face shift), not hand-redrawn 3D turns — an illustrator should redraw true side views before merchandise production.

**Animation.** Implemented in-app with Reanimated: idle bob (2.8 s loop) and a celebrate pop; both disabled by reduced motion, "mascot animations off" or "hide mascots". **Lottie/Rive files have not been produced**; remaining animation design work: wave cycle, blink, confetti burst, Piso coin drop, Tiki bell ring (each ≤ 2 s, ≤ 60 kB Lottie).

**Behaviour rules.** Mascots support, never block: decorative by default (hidden from screen readers), never cry or scold, no guilt-based copy; overdue states use "gentle concern" with neutral wording ("needs attention — reschedule or mark it done").

## Voice

Calm, practical, warm, nonjudgmental. Prefer "needs attention" over "late"; never shame. Examples: "Let's get your life admin organized." · "Your ID renewal is coming up in 30 days." · "I couldn't verify this requirement. Check the official source before proceeding."
