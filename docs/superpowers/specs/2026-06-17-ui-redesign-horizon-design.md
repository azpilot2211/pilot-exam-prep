# Flying Ace Exams — "Horizon" UI/UX Redesign

**Date:** 2026-06-17
**Status:** Approved design — ready for implementation plan

## Goal

Replace the current generic, default-Tailwind look with a polished, distinctive "Horizon" design system: a light, readable app for sustained study, a dramatic dark hero for first impressions, per-chapter visual identity, a slide-out navigation drawer, and a personalized `/account` hub.

## Design Direction

**Horizon + dark hero.** Light, airy study surfaces (sky-blue → indigo accents) for the bulk of the app where users read a lot, paired with a dramatic dark hero on the logged-out landing page. Trustworthy and readable, with a premium first impression.

## Design Tokens

Defined once and inherited everywhere. Mostly existing Tailwind palette classes; a few CSS variables for custom surfaces.

- **Colors:**
  - Ink / foreground: `#0F172A` (slate-900)
  - Page background: `#F8FAFC` (slate-50)
  - Primary: sky — `#0EA5E9` (sky-500) fills, `#0284C7` (sky-600) buttons, `#0369A1` (sky-700) hover
  - Secondary accent: indigo `#4F46E5`
  - Highlight: amber `#F59E0B` / `#FBBF24` (hero badge, PRO badge, focus-area warnings only)
  - Dark hero surface: `#0B1120`; dark elevated: `#1E293B` (slate-800)
  - Neutrals: slate-200 borders, slate-400/500 muted text
- **Typography:** Keep Geist. Tighter heading tracking (`tracking-tight`), larger display sizes for hierarchy. Headline weight 600–800, body 400, captions in slate-400. Two-to-three weight steps max per screen.
- **Surfaces:** white cards, `border border-slate-200`, `rounded-2xl`, a soft shadow that lifts on hover (`hover:shadow-md transition-shadow`). Cards feel tactile, not flat.
- **Custom CSS variables** added to `globals.css`:
  ```css
  :root {
    --background: #f8fafc;
    --foreground: #0f172a;
    --hero-bg: #0b1120;
    --hero-elevated: #1e293b;
  }
  ```

## Per-Chapter Identity

The single biggest "feels designed" upgrade: each of the 12 chapters gets its own icon + tinted icon-chip so the grid stops being 12 identical boxes.

**New file:** `src/lib/chapterMeta.ts` — maps `chapterSlug` → `{ icon: LucideIcon; tintBg: string; tintFg: string }` (Tailwind classes). Used by `ChapterCard`, the study page header, the drawer's section list, and the account page's focus areas.

| Slug | Icon (lucide-react) | Tint |
|---|---|---|
| weather | `CloudSun` | sky |
| regulations | `Scale` | indigo |
| navigation | `Compass` | cyan |
| aerodynamics | `Plane` | violet |
| airspace | `Layers` | blue |
| airport-operations | `TowerControl` | teal |
| aircraft-systems | `Gauge` | slate |
| weight-and-balance | `Scale3d` | amber |
| performance | `TrendingUp` | emerald |
| emergency-procedures | `TriangleAlert` | red |
| preflight-planning | `ClipboardList` | indigo |
| night-operations | `Moon` | slate |

Tints use a 50-level background + 600/700-level icon foreground (muted, not loud). A fallback meta (`Plane`, slate) covers any unmapped slug so new chapters never crash the UI.

## Dependencies

- **`lucide-react`** — crisp, tree-shakeable icon set for chapter icons, nav, buttons, and the drawer. `npm install lucide-react`.
- **Runway hero image** — one royalty-free runway/aviation photo saved to `public/hero-runway.jpg`. Sourced from Unsplash (or equivalent) during implementation; the file is swappable by dropping in a replacement at the same path. Served via `next/image` with `fill`.

## Components & Pages

### `src/components/Logo.tsx` (new)
Reusable SVG mark replacing the ✈️ emoji: navy roundel with a sky-blue upward chevron (reads as a wing / "ace"). Props: `size` (default 26), optional `showWordmark` to render "Flying Ace Exams" beside it. Used in NavBar, drawer, login, signup, forgot-password, update-password.

### `src/components/NavBar.tsx` (modify)
Server component. Fetches `user` and `chapters`. Renders the `Logo` (left) and a hamburger button (right) that opens the slide-out drawer. Passes `user` + `chapters` to the client `NavDrawer`. Logged-out: show a "Sign in" link instead of the hamburger (or hamburger with a reduced menu — see drawer).

### `src/components/NavDrawer.tsx` (new, client)
Slide-out drawer triggered by the hamburger:
- Full-height panel sliding in from the right with a dimmed backdrop.
- Opens/closes via local state; closes on backdrop click, `Esc`, or selecting any link.
- Contents (logged-in): Logo header; **Sections** list — all 12 chapters with their icon + name, linking to `/study/[slug]`; divider; **Account** (`/account`), **Progress** (`/progress`), **Pro** (`/subscribe`); divider; **Log out** (reuses sign-out action).
- Contents (logged-out): **Sign in** (`/login`), **Create account** (`/signup`), and the sections list (links still go to study pages, which gate as they already do).
- Body scroll lock while open. Accessible: `role="dialog"`, `aria-label`, focus moves into the panel, hamburger has `aria-label`.

### `src/app/page.tsx` (modify) — Home
- **Logged-out hero:** dark section over `public/hero-runway.jpg` (`next/image` fill) — a golden-hour runway photo — with a navy gradient overlay (`from-[#0B1120]/55 via-[#0B1120]/35 to-[#0B1120]/92`) for text contrast. Amber pill badge **"FAA Written Test Prep"** (brand-level, exam-agnostic — must NOT hard-code "Private Pilot" since IFR/Commercial tracks are planned), headline **"Cleared for takeoff on your written exam."**, subhead, dual CTA (Start studying free / Sign in), and a "No credit card to start" trust line.
- **Frosted stat strip:** anchored to the bottom of the hero, a translucent bar (`bg-slate-900/55`, hairline top border) with three stats: `{totalQuestions} questions` · `{chapters} chapters` · `Audio every lesson`. Gives the hero a confident, dashboard-like footing.
- **Hero proportions:** generous height (≈400px on desktop, taller on mobile via `min-h`) so the CTA cluster + trust line have clear breathing room above the stat strip — they must never crowd it. The runway artwork fills the full hero height.
- **Logged-in header + readiness widget:** restyled; the overall % rendered with the new `ReadinessRing` instead of plain text.
- **"Choose a topic" section header** with chapter count above the grid.
- **Chapter grid:** uses the upgraded `ChapterCard` (icons + tints).

> If a suitable royalty-free runway photo cannot be sourced, the hero falls back to a flat `--hero-bg` navy surface with the same overlay/copy — the layout does not depend on the image.

### `src/components/ChapterCard.tsx` (modify)
A **3px tint accent stripe** across the top of the card in the chapter's color (from `chapterMeta`) — the detail that makes the grid read as designed. Below it: the chapter icon chip beside the title + lesson count, cleaner Ready ✓ / In-progress badges, smoother `MasteryBar`, paired Study/Quiz buttons, and a subtle `hover:shadow-md` lift. Same props (icon + tint derived from `slug`).

### `src/components/ReadinessRing.tsx` (new)
Small SVG donut showing a percentage in the center. Props: `percent`, `size` (default 74), `stroke`. Sky fill on a slate-100 track. Used on the home readiness widget and the account page.

### `src/app/account/page.tsx` (new) — Account hub
Server component (`force-dynamic`). Redirects to `/login` if no user. Fetches `user`, subscription (`getSubscription`), all mastery (`getUserAllMastery`), and chapters.
- **Header:** initials avatar, email, member-since (from `user.created_at`), PRO badge if subscriber.
- **Readiness:** `ReadinessRing` with overall percent + "X of Y questions correct" copy.
- **Focus areas:** up to 3 weakest chapters via `getFocusAreas` (below), each with icon chip, mastery %, mini bar, and a **Study** button. A "View full progress →" link to `/progress`.
- **Footer actions:** **Manage billing** (`ManageBillingButton`, subscribers only) and **Sign out** (`SignOutButton`).

### `src/lib/focusAreas.ts` (new, pure, unit-tested)
`getFocusAreas(masteryMap, chapters, limit = 3)`:
- Among chapters with attempts (`total > 0`), sort ascending by mastery percent; take the lowest `limit`.
- If fewer than `limit` chapters have been attempted, fill the remainder with not-yet-started chapters (marked `started: false`) as "Start here" suggestions.
- Returns `{ chapter, percent, started }[]`. Pure function → TDD with unit tests.

### `src/components/ManageBillingButton.tsx` (new, client)
POSTs to `/api/stripe/portal`, redirects to the returned Stripe billing-portal URL. Mirrors `SubscribeButton`'s try/catch + alert error handling.

### `src/app/api/stripe/portal/route.ts` (new)
POST. Auth-gates the user, reads `stripe_customer_id` from `profiles`, creates a Stripe billing-portal session (`stripe.billingPortal.sessions.create`) with `return_url` of `${APP_URL}/account`, returns `{ url }`. Returns JSON errors (no HTML 500s), matching the checkout route's pattern.

### Inherited restyling (tokens only, no new behavior)
`LessonCard`, quiz pages, `login`, `signup`, `forgot-password`, `auth/update-password`, `subscribe`, `subscribe/success`, and `progress` adopt the shared tokens: consistent sky buttons, badge styles, card surfaces, spacing, and the new `Logo`. No data-flow changes.

## Out of Scope

- No backend/schema changes beyond the new Stripe portal route.
- No new question content or pipeline changes.
- No theme toggle / user-selectable dark mode (the dark hero is fixed, not a mode).
- No change to auth, quiz scoring, or subscription gating logic.
- **Multiple exam tracks** (IFR, Commercial, etc.) are a planned future feature, NOT part of this redesign. No exam selector or exam data dimension is built now.

## Future Considerations

The product will eventually offer multiple exam tracks (Private Pilot, IFR, Commercial…). This redesign keeps all top-level branding exam-agnostic so that work doesn't force a rebrand:
- Hero badge and copy say "FAA Written Test Prep" / "your written exam," never "Private Pilot."
- The logo, nav, and `/account` page are exam-neutral.
- When tracks are added, the likely shape is an **exam selector** (in the drawer and/or a landing picker) plus an **exam dimension** in the data model (`exams → chapters → questions`), with the drawer's "Sections" list and the home grid scoped to the selected exam. The current per-chapter `chapterMeta` map and components carry over unchanged.

## Testing

- **`getFocusAreas`** — unit tests (TDD): weakest-3 ordering, tie handling, fill-with-unstarted when too few attempts, empty mastery, limit larger than chapter count.
- **Everything else is presentational** — verified by running the app and visually checking: hero over the runway image with readable text, drawer open/close + links, chapter icons render, account page ring + focus areas + billing button, and consistent styling across login/signup/subscribe/progress.
- Existing pipeline/scoring tests must still pass (`npm test`).

## Implementation Notes

- Tailwind v4 (`@import "tailwindcss"`) — use existing palette utilities; add only the few CSS variables above.
- NavBar stays a server component for data fetching; interactivity lives in the client `NavDrawer`.
- Keep changes measured: no architectural churn, every page keeps its current data flow.
