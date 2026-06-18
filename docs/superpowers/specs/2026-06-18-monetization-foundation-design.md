# Monetization Foundation — Design Spec

**Date:** 2026-06-18
**Status:** Approved (brainstorming complete)
**Sub-project:** #1 of 5 in the monetization + growth roadmap

---

## Context

Flying Ace Exams (flyingaceexams.com) is an FAA Private Pilot written-exam prep
app. It currently sells a single **$7.99/month subscription**, gated by an
`is_subscriber` boolean on the `profiles` table, flipped by the Stripe webhook.

FAA written-exam prep has a **cram-and-leave** usage pattern: students buy a few
weeks before their test, study hard, pass, and leave. A monthly subscription is
the wrong model for this behavior — it under-monetizes motivated buyers (who'd
pay more once) and churns the casual ones. Competitors (Sporty's, King, Gleim,
Sheppard) all sell one-time course purchases.

This spec replaces the subscription with **tiered one-time pricing** and adds a
"What's Included" sales page, laying the entitlement + payment foundation the
rest of the roadmap builds on.

## Roadmap position

This is sub-project **#1 of 5**. The full sequence:

1. **Monetization foundation** ← this spec
2. Exam simulator + readiness prediction + demo-exam teaser
3. Retention: missed-question review, weak-area drill, spaced repetition
4. SEO explainer pages
5. Multiple exam tracks (IFR/Commercial/CFI) — generalizes entitlement to a
   `purchases` table

Each gets its own spec → plan → build cycle.

## Goal

Replace the monthly subscription with a tiered one-time purchase model
(Free / Basic / Pro), build the entitlement system and gating, and build a
"What's Included" page — **soft-launched** (not linked in nav). The public
pricing goes live at the end of sub-project #2, when Pro has a demonstrable
differentiator (the simulator).

## Key decisions (locked during brainstorming)

- **Pricing model:** Tiered one-time. Basic ~$29, Pro ~$59. No subscription.
- **Launch timing:** Build the plumbing + `/course` page now, but keep tiers
  unexposed. Flip public pricing live at the end of sub-project #2.
- **Existing subscribers:** None real (test accounts only). Clean replacement —
  grandfather any `is_subscriber=true` account into `pro`, retire the monthly
  price.
- **Downloads:** Pro-only. Basic streams audio in-app with no download buttons.
  Pro unlocks per-section downloads **and** a full-course bundle (zip).
- **Entitlement model:** A single `tier` column on `profiles` (option A), not a
  `purchases` table. Sub-project #5 migrates to the table when multiple exams
  exist.

## Tier model

| Capability | Free | Basic (~$29) | Pro (~$59) |
|---|---|---|---|
| Study mode + audio (streaming) | First 2 chapters | Full | Full |
| Full question bank + quizzes | — | ✅ | ✅ |
| 10-question demo exam | ✅ | ✅ | ✅ |
| Exam simulator + readiness *(spec #2)* | — | — | ✅ |
| Missed-question review + weak-area drill *(spec #3)* | — | — | ✅ |
| MP3 downloads (per-section + full bundle) | — | — | ✅ |
| Pass guarantee | — | — | ✅ |

The "first 2 chapters" free sample is determined by `chapters.display_order`
(the two lowest). The 10-question demo exam ships in spec #2; its gating slot is
reserved here.

## Architecture

### Data model

`profiles` table:

- **Add** `tier text not null default 'free'` with a check constraint
  `tier in ('free', 'basic', 'pro')`.
- **Keep** `stripe_customer_id`.
- **Migration:** set `tier = 'pro'` for every row where `is_subscriber = true`,
  then drop (or stop reading) `is_subscriber`, `subscription_id`,
  `subscription_status`. Columns may be left in place but unused to avoid a
  destructive migration; application code stops referencing them.

### Entitlement helper — `src/lib/entitlement.ts`

Replaces `src/lib/subscription.ts`. Pure rank logic is unit-tested.

```ts
export type Tier = "free" | "basic" | "pro";

const RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };

/** True if `owned` meets or exceeds `required`. */
export function hasAccess(owned: Tier, required: Tier): boolean {
  return RANK[owned] >= RANK[required];
}

/** Reads the current user's tier from profiles. Returns "free" if no user. */
export async function getTier(): Promise<Tier> { /* Supabase read */ }
```

### Stripe

- Create two **one-time** Prices: Basic (~$29) and Pro (~$59). The monthly Price
  is retired (no new checkouts; not deleted in Stripe).
- **Checkout** (`/api/stripe/checkout`): switch from `mode: "subscription"` to
  `mode: "payment"`. Accept which tier is being purchased, select the matching
  Price, and stamp `metadata.tier` on the session.
- **Webhook** (`/api/stripe/webhook`): on `checkout.session.completed`, read
  `session.metadata.tier` and set `profiles.tier`. Remove the
  `customer.subscription.updated` / `.deleted` cases.
- **Retire** the billing-portal route (`/api/stripe/portal`) and
  `ManageBillingButton` — one-time purchases have nothing to manage. The
  account page links to a simple "contact for a refund" note instead.
- New env vars: `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO` (replacing the single
  subscription price var).

### Gating enforcement (server-side only)

Three enforcement points, each redirecting to `/course` on insufficient tier:

1. **Study mode** (`/study/[chapterSlug]`): free tier may open only the two
   lowest-`display_order` chapters; Basic/Pro open all.
2. **Quiz mode** (`/quiz/[chapterSlug]`): same chapter rule as study.
3. **Downloads** (`/api/download` + new bundle route): Pro only.

Gating is always checked on the server (route handlers / server components).
The client never decides access.

### Full-course download (new, Pro)

- New route `/api/download/all`: verifies `pro`, streams a zip of all published
  chapter audio. Implementation approach (zip-on-the-fly vs. pre-built manifest)
  is decided in the implementation plan; the spec requires only that it is
  Pro-gated and returns the complete audio set.
- Per-file `/api/download` stays, re-gated from `is_subscriber` to `pro`.

### "What's Included" page — `/course`

A server-rendered marketing page:

- Three-column tier comparison (the table above).
- Prices (~$29 / ~$59) and a checkout CTA per paid tier.
- Pass-guarantee blurb.
- **Not linked from the nav or hero.** Reachable by direct URL only until
  sub-project #2 wires it in. Gated routes redirect here, so the page must read
  correctly even pre-launch.

### Pass guarantee

Display-only copy ("Pass or your money back"). Refunds are issued manually by
the owner in the Stripe dashboard. No code beyond the page text.

## Components / files

- **Create:** `src/lib/entitlement.ts`, `src/app/course/page.tsx`,
  `src/app/api/download/all/route.ts`, the DB migration, and tests.
- **Modify:** `src/app/api/stripe/checkout/route.ts`,
  `src/app/api/stripe/webhook/route.ts`, `src/app/api/download/route.ts`,
  `src/app/study/[chapterSlug]/page.tsx`,
  `src/app/quiz/[chapterSlug]/page.tsx`, `src/app/account/page.tsx`,
  `src/components/NavDrawer.tsx` (remove subscriber-specific links as needed),
  `src/components/LessonCard.tsx` (download button → Pro gate).
- **Remove / retire:** `src/lib/subscription.ts`,
  `src/app/api/stripe/portal/route.ts`, `ManageBillingButton`, the
  `/subscribe` pages (superseded by `/course`).

## Error handling

- Checkout with a missing/invalid tier → 400, no Stripe session created.
- Webhook with an unknown `metadata.tier` → log and no-op (don't crash the
  endpoint; Stripe retries are harmless).
- Gated route for a logged-out user → redirect to login, then to the
  destination; for a logged-in under-tier user → redirect to `/course`.
- Bundle download for a non-Pro user → 403.

## Testing

- **TDD unit tests:** `hasAccess` rank logic (all 9 tier pairs), and the
  webhook's tier-from-metadata mapping (basic/pro/unknown).
- **Manual verification:** a real Stripe **test-mode** checkout for each paid
  tier flips the profile to the correct tier and unlocks the matching gates;
  free user is correctly limited to 2 chapters and blocked from downloads.

## Out of scope (deferred to later sub-projects)

- The exam simulator, readiness prediction, demo exam (spec #2).
- Missed-question review, weak-area drill, spaced repetition (spec #3).
- Wiring `/course` into nav/hero and going public (end of spec #2).
- Multiple exam tracks and the `purchases` table (spec #5).
- Automated refund handling.
