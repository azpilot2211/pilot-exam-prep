# Monetization Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monthly Stripe subscription with tiered one-time pricing (Free/Basic/Pro), add an entitlement system + server-side gating, and build a soft-launched `/course` "What's Included" page.

**Architecture:** A single `tier` column on `profiles` (`free`/`basic`/`pro`) is the source of truth, set by the Stripe webhook on one-time `checkout.session.completed`. A pure `lib/entitlement.ts` module provides `hasAccess(owned, required)` rank logic and `parseTier()` validation (both unit-tested) plus a `getTier()` Supabase read. Gating is enforced server-side in study/quiz/download routes. The full-course download is a Pro-gated `/downloads` page that reuses the existing per-file streaming route (no zip dependency).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + RLS), Stripe (one-time payments), Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-18-monetization-foundation-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/0003_profile_tier.sql` — add `tier` column + grandfather subscribers
- `src/lib/entitlement.ts` — `Tier`, `hasAccess`, `parseTier`, `getTier`
- `src/lib/entitlement.test.ts` — unit tests for `hasAccess` + `parseTier`
- `src/app/course/page.tsx` — "What's Included" page (soft-launched)
- `src/components/CheckoutButton.tsx` — client button that POSTs a tier to checkout
- `src/app/downloads/page.tsx` — Pro-gated full-course download page
- `src/components/DownloadAllButton.tsx` — client sequential "download all" button

**Modify:**
- `src/lib/stripe.ts` — add `PRICE_BASIC`, `PRICE_PRO`
- `src/app/api/stripe/checkout/route.ts` — `mode: "payment"`, accept tier, stamp `metadata.tier`
- `src/app/api/stripe/webhook/route.ts` — set `tier` from metadata; drop subscription cases
- `src/app/api/download/route.ts` — gate to Pro via `getTier`
- `src/app/study/[chapterSlug]/page.tsx` — free-tier chapter gate; pass `isPro` to LessonCard
- `src/app/quiz/[chapterSlug]/page.tsx` — free-tier chapter gate
- `src/components/LessonCard.tsx` — `isSubscriber` → `isPro`; upgrade link → `/course`
- `src/app/account/page.tsx` — use `getTier`; remove ManageBillingButton; link to `/downloads` or `/course`
- `src/components/NavDrawer.tsx` — remove the `/subscribe` "Pro" link
- `src/lib/queries.ts` — add `getFreeChapterSlugs()`

**Retire (delete):**
- `src/lib/subscription.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/components/ManageBillingButton.tsx`
- `src/app/subscribe/page.tsx`
- `src/app/subscribe/success/page.tsx`

---

## Manual prerequisites (owner — do before Task 4 verification)

These are billing actions only the owner can perform; the code reads the resulting IDs from env vars.

1. In the Stripe Dashboard (test mode first), create two **one-time** Prices:
   - "Flying Ace — Basic" (e.g. $29.00, one-time)
   - "Flying Ace — Pro" (e.g. $59.00, one-time)
2. Copy the two price IDs (`price_...`) into `.env.local`:
   ```
   STRIPE_PRICE_BASIC=price_xxxxxxxxBasic
   STRIPE_PRICE_PRO=price_xxxxxxxxPro
   ```
3. Leave the old `NEXT_PUBLIC_STRIPE_PRICE_ID` in place for now; it is simply no longer referenced.

`.env.local` is gitignored — never commit it or paste real keys into chat.

---

## Task 1: Database migration — `tier` column

**Files:**
- Create: `supabase/migrations/0003_profile_tier.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0003_profile_tier.sql`:

```sql
-- Add a one-time-purchase entitlement tier to profiles.
-- free (default) | basic | pro. Replaces the is_subscriber boolean model.

alter table profiles add column if not exists tier text not null default 'free';

do $$
begin
  -- add the check constraint once
  if not exists (select 1 from pg_constraint where conname = 'profiles_tier_check') then
    alter table profiles
      add constraint profiles_tier_check check (tier in ('free', 'basic', 'pro'));
  end if;

  -- grandfather any existing subscribers into pro, if the legacy column exists
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'is_subscriber'
  ) then
    update profiles set tier = 'pro' where is_subscriber = true;
  end if;
end $$;
```

- [ ] **Step 2: Apply it in Supabase**

Run the SQL above in the Supabase Dashboard → SQL Editor (this project applies
migrations manually; the committed file is the record of truth). Then verify:

Run in SQL Editor:
```sql
select tier, count(*) from profiles group by tier;
```
Expected: rows return without error; any previously-subscribed account shows `pro`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_profile_tier.sql
git commit -m "feat(db): add tier column to profiles for one-time pricing"
```

---

## Task 2: Entitlement pure logic (TDD)

**Files:**
- Create: `src/lib/entitlement.ts`
- Test: `src/lib/entitlement.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/entitlement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hasAccess, parseTier } from "./entitlement";

describe("hasAccess", () => {
  it("grants when owned tier equals required", () => {
    expect(hasAccess("basic", "basic")).toBe(true);
    expect(hasAccess("pro", "pro")).toBe(true);
    expect(hasAccess("free", "free")).toBe(true);
  });

  it("grants when owned tier outranks required", () => {
    expect(hasAccess("pro", "basic")).toBe(true);
    expect(hasAccess("pro", "free")).toBe(true);
    expect(hasAccess("basic", "free")).toBe(true);
  });

  it("denies when owned tier is below required", () => {
    expect(hasAccess("free", "basic")).toBe(false);
    expect(hasAccess("free", "pro")).toBe(false);
    expect(hasAccess("basic", "pro")).toBe(false);
  });
});

describe("parseTier", () => {
  it("accepts the three valid tiers", () => {
    expect(parseTier("free")).toBe("free");
    expect(parseTier("basic")).toBe("basic");
    expect(parseTier("pro")).toBe("pro");
  });

  it("returns null for unknown or missing values", () => {
    expect(parseTier("gold")).toBeNull();
    expect(parseTier(undefined)).toBeNull();
    expect(parseTier("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/entitlement.test.ts`
Expected: FAIL — `entitlement.ts` does not exist / exports undefined.

- [ ] **Step 3: Implement the pure logic**

Create `src/lib/entitlement.ts`:

```ts
import { createClient } from "./supabase/server";

export type Tier = "free" | "basic" | "pro";

const RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };

/** True if `owned` meets or exceeds `required`. */
export function hasAccess(owned: Tier, required: Tier): boolean {
  return RANK[owned] >= RANK[required];
}

/** Narrow an arbitrary string to a Tier, or null if invalid. */
export function parseTier(value: string | undefined | null): Tier | null {
  if (value === "free" || value === "basic" || value === "pro") return value;
  return null;
}

/** Read the current user's tier. Returns "free" when logged out or unset. */
export async function getTier(): Promise<Tier> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  return parseTier(data?.tier) ?? "free";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/entitlement.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/entitlement.ts src/lib/entitlement.test.ts
git commit -m "feat: add entitlement tier logic (hasAccess, parseTier, getTier)"
```

---

## Task 3: Free-chapter helper

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add the helper**

Append to `src/lib/queries.ts` (after `getChapters`):

```ts
/** Slugs of the two lowest-display_order chapters — the free sample set. */
export async function getFreeChapterSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("slug")
    .order("display_order")
    .limit(2);
  return (data ?? []).map((c) => c.slug);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add getFreeChapterSlugs for free-tier gating"
```

---

## Task 4: Stripe price constants + checkout route

**Files:**
- Modify: `src/lib/stripe.ts`
- Modify: `src/app/api/stripe/checkout/route.ts`

- [ ] **Step 1: Add price constants**

Replace the last line of `src/lib/stripe.ts` (`export const PRICE_ID = ...`) with:

```ts
export const PRICE_BASIC = process.env.STRIPE_PRICE_BASIC ?? "";
export const PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "";
```

- [ ] **Step 2: Rewrite the checkout route for one-time payments**

Replace the entire contents of `src/app/api/stripe/checkout/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_BASIC, PRICE_PRO } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { parseTier } from "@/lib/entitlement";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tier = parseTier(body?.tier);
  if (tier !== "basic" && tier !== "pro") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const price = tier === "basic" ? PRICE_BASIC : PRICE_PRO;
  if (!price) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: profile } = await supabaseAny
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAny.from("profiles").upsert({ id: user.id, stripe_customer_id: customerId });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://flyingaceexams.com";

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/account?purchased=${tier}`,
      cancel_url: `${origin}/course`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id, tier },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. (The old `PRICE_ID` import is gone; if tsc flags another file still importing it, that file is handled in a later task — re-run after Task 9 for the full green.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe.ts src/app/api/stripe/checkout/route.ts
git commit -m "feat(stripe): one-time tiered checkout (basic/pro)"
```

---

## Task 5: Webhook sets tier from metadata

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Rewrite the webhook handler**

Replace the entire contents of `src/app/api/stripe/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { parseTier } from "@/lib/entitlement";
import type Stripe from "stripe";

// Use the service role key to bypass RLS in webhook handler
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function setTier(supabaseUserId: string, tier: "basic" | "pro") {
  const admin = adminClient();
  await admin.from("profiles").upsert({
    id: supabaseUserId,
    tier,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const tier = parseTier(session.metadata?.tier);
    if (userId && (tier === "basic" || tier === "pro")) {
      await setTier(userId, tier);
    }
    // unknown/missing tier: log and no-op (Stripe retries are harmless)
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat(stripe): webhook sets profile tier on one-time purchase"
```

---

## Task 6: Gate downloads to Pro + LessonCard

**Files:**
- Modify: `src/app/api/download/route.ts`
- Modify: `src/components/LessonCard.tsx`

- [ ] **Step 1: Gate the download route to Pro**

Replace the subscription check block (lines ~12-25) in `src/app/api/download/route.ts`.
Replace:

```ts
  // Check subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("is_subscriber")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_subscriber) {
    return NextResponse.json(
      { error: "Pro subscription required" },
      { status: 403 }
    );
  }
```

with:

```ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.tier !== "pro") {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }
```

- [ ] **Step 2: Update LessonCard prop and upgrade link**

In `src/components/LessonCard.tsx`:

Change the prop in the `Props` interface from `isSubscriber: boolean;` to `isPro: boolean;`.

Change the destructured param `isSubscriber,` to `isPro,`.

Change the conditional `isSubscriber ? (` to `isPro ? (`.

Change the upgrade `<Link href="/subscribe" ...>` to `<Link href="/course" ...>` (leave the rest of that link's markup unchanged).

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: an error in `src/app/study/[chapterSlug]/page.tsx` because it still passes `isSubscriber` — fixed in Task 7. No errors in the two files edited here.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/download/route.ts src/components/LessonCard.tsx
git commit -m "feat: gate MP3 downloads to Pro tier"
```

---

## Task 7: Free-tier gating on study + quiz

**Files:**
- Modify: `src/app/study/[chapterSlug]/page.tsx`
- Modify: `src/app/quiz/[chapterSlug]/page.tsx`

- [ ] **Step 1: Gate the study page**

Replace the entire contents of `src/app/study/[chapterSlug]/page.tsx`:

```tsx
import { getChapterBySlug, getPublishedLessons, getFreeChapterSlugs } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LessonCard } from "@/components/LessonCard";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function StudyGuidePage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const [lessons, tier, freeSlugs] = await Promise.all([
    getPublishedLessons(chapter.id),
    getTier(),
    getFreeChapterSlugs(),
  ]);

  // Free tier may only open the sample chapters; Basic+ opens all.
  if (!hasAccess(tier, "basic") && !freeSlugs.includes(chapterSlug)) {
    redirect("/course");
  }

  const isPro = hasAccess(tier, "pro");

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-28">
      <div className="mb-8">
        <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">
          Study Guide
        </p>
        <h1 className="text-2xl font-bold text-slate-900">{chapter.title}</h1>
        {chapter.description && (
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            {chapter.description}
          </p>
        )}
        {lessons.length > 0 && (
          <p className="text-xs text-slate-400 mt-3">
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} in this chapter
          </p>
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">
            No lessons published in this chapter yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {lessons.map((lesson, i) => (
            <LessonCard
              key={lesson.questionId}
              index={i}
              questionId={lesson.questionId}
              chapterSlug={chapterSlug}
              explanation={lesson.explanation}
              illustrationSvg={lesson.illustrationSvg}
              audioUrl={lesson.audioUrl}
              isPro={isPro}
            />
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200 px-4 py-4 flex justify-center">
          <Link
            href={`/quiz/${chapterSlug}`}
            className="w-full max-w-sm text-center py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors"
          >
            Take Quiz →
          </Link>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Gate the quiz page**

Replace the entire contents of `src/app/quiz/[chapterSlug]/page.tsx`:

```tsx
import { getChapterBySlug, getPublishedQuestions, getQuestion, getFreeChapterSlugs } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { QuizView } from "@/components/QuizView";
import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const [tier, freeSlugs] = await Promise.all([getTier(), getFreeChapterSlugs()]);
  if (!hasAccess(tier, "basic") && !freeSlugs.includes(chapterSlug)) {
    redirect("/course");
  }

  const questions = await getPublishedQuestions(chapter.id);
  if (questions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 text-sm">No published questions in this chapter yet.</p>
      </main>
    );
  }

  const items = (
    await Promise.all(questions.map((q) => getQuestion(q.id)))
  ).filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <QuizView
      chapterSlug={chapterSlug}
      chapterTitle={chapter.title}
      items={items}
    />
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors in study/quiz pages. (`account/page.tsx` may still error on `getSubscription` — fixed in Task 9.)

- [ ] **Step 4: Commit**

```bash
git add src/app/study/[chapterSlug]/page.tsx src/app/quiz/[chapterSlug]/page.tsx
git commit -m "feat: free tier limited to sample chapters on study + quiz"
```

---

## Task 8: "What's Included" page + checkout button

**Files:**
- Create: `src/components/CheckoutButton.tsx`
- Create: `src/app/course/page.tsx`

- [ ] **Step 1: Create the checkout button**

Create `src/components/CheckoutButton.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tier: "basic" | "pro";
  label: string;
  className?: string;
}

export function CheckoutButton({ tier, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/course`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        alert(data.error ?? "Could not start checkout.");
      }
    } catch {
      setLoading(false);
      alert("Could not start checkout.");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${className} disabled:opacity-60`}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
```

- [ ] **Step 2: Create the course page**

Create `src/app/course/page.tsx`:

```tsx
import { getTier } from "@/lib/entitlement";
import { CheckoutButton } from "@/components/CheckoutButton";
import Link from "next/link";

const FEATURES: { label: string; free: boolean; basic: boolean; pro: boolean }[] = [
  { label: "Study mode + audio (sample chapters)", free: true, basic: true, pro: true },
  { label: "Full question bank + quizzes", free: false, basic: true, pro: true },
  { label: "10-question demo exam", free: true, basic: true, pro: true },
  { label: "Exam simulator + readiness score", free: false, basic: false, pro: true },
  { label: "Missed-question review + weak-area drill", free: false, basic: false, pro: true },
  { label: "MP3 downloads (full course)", free: false, basic: false, pro: true },
  { label: "Pass guarantee", free: false, basic: false, pro: true },
];

function Check({ on }: { on: boolean }) {
  return on ? (
    <span className="text-green-600 font-bold">✓</span>
  ) : (
    <span className="text-slate-300">—</span>
  );
}

export default async function CoursePage() {
  const tier = await getTier();

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pass your FAA written exam</h1>
        <p className="text-slate-500 mt-2 text-sm">
          One-time purchase. Lifetime access. No subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Free */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <h2 className="font-bold text-slate-900">Free</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$0</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Try before you buy</p>
          {tier === "free" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">Current plan</span>
          ) : (
            <span className="mt-auto" />
          )}
        </div>

        {/* Basic */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <h2 className="font-bold text-slate-900">Basic</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$29</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Full question bank</p>
          {tier === "basic" || tier === "pro" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">
              {tier === "basic" ? "Current plan" : "Included in Pro"}
            </span>
          ) : (
            <CheckoutButton
              tier="basic"
              label="Get Basic"
              className="mt-auto bg-slate-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors"
            />
          )}
        </div>

        {/* Pro */}
        <div className="bg-white border-2 border-sky-500 rounded-2xl p-5 flex flex-col relative">
          <span className="absolute -top-2.5 left-5 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            BEST VALUE
          </span>
          <h2 className="font-bold text-slate-900">Pro</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$59</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Everything + pass guarantee</p>
          {tier === "pro" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">Current plan</span>
          ) : (
            <CheckoutButton
              tier="pro"
              label="Get Pro"
              className="mt-auto bg-sky-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="text-left font-medium px-4 py-3">What's included</th>
              <th className="font-medium px-2 py-3">Free</th>
              <th className="font-medium px-2 py-3">Basic</th>
              <th className="font-medium px-2 py-3">Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-slate-700">{f.label}</td>
                <td className="text-center px-2 py-3"><Check on={f.free} /></td>
                <td className="text-center px-2 py-3"><Check on={f.basic} /></td>
                <td className="text-center px-2 py-3"><Check on={f.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Pass guarantee: study the full Pro course and if you don&apos;t pass, email us for a
        full refund. <Link href="/account" className="text-sky-600 hover:underline">Your account →</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Verify build of the new page**

Run: `npx tsc --noEmit`
Expected: no errors in `course/page.tsx` or `CheckoutButton.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/CheckoutButton.tsx src/app/course/page.tsx
git commit -m "feat: add /course What's Included page (soft-launched)"
```

---

## Task 9: Full-course downloads page + retire subscription code

**Files:**
- Create: `src/components/DownloadAllButton.tsx`
- Create: `src/app/downloads/page.tsx`
- Modify: `src/app/account/page.tsx`
- Modify: `src/components/NavDrawer.tsx`
- Delete: `src/lib/subscription.ts`, `src/app/api/stripe/portal/route.ts`,
  `src/components/ManageBillingButton.tsx`, `src/app/subscribe/page.tsx`,
  `src/app/subscribe/success/page.tsx`

- [ ] **Step 1: Create the sequential "download all" button**

Create `src/components/DownloadAllButton.tsx`:

```tsx
"use client";

interface Item {
  url: string;
  filename: string;
}

export function DownloadAllButton({ items }: { items: Item[] }) {
  const handleClick = async () => {
    for (const item of items) {
      const href = `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.filename)}`;
      const a = document.createElement("a");
      a.href = href;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // small gap so the browser queues each download
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-sky-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors"
    >
      Download all ({items.length})
    </button>
  );
}
```

- [ ] **Step 2: Create the Pro-gated downloads page**

Create `src/app/downloads/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
import { getChapters, getPublishedLessons } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { redirect } from "next/navigation";
import { DownloadAllButton } from "@/components/DownloadAllButton";

export default async function DownloadsPage() {
  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const chapters = await getChapters();
  const perChapter = await Promise.all(
    chapters.map(async (c) => ({
      chapter: c,
      lessons: await getPublishedLessons(c.id),
    }))
  );

  const allItems = perChapter.flatMap(({ chapter, lessons }) =>
    lessons
      .filter((l) => l.audioUrl)
      .map((l, i) => ({
        url: l.audioUrl as string,
        filename: `${chapter.slug}-lesson-${i + 1}.mp3`,
      }))
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course downloads</h1>
          <p className="text-slate-400 text-sm mt-1">{allItems.length} audio lessons</p>
        </div>
        {allItems.length > 0 && <DownloadAllButton items={allItems} />}
      </div>

      <div className="flex flex-col gap-4">
        {perChapter.map(({ chapter, lessons }) => {
          const items = lessons.filter((l) => l.audioUrl);
          if (items.length === 0) return null;
          return (
            <div key={chapter.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">{chapter.title}</p>
              <div className="flex flex-col gap-1">
                {items.map((l, i) => {
                  const filename = `${chapter.slug}-lesson-${i + 1}.mp3`;
                  const href = `/api/download?url=${encodeURIComponent(l.audioUrl as string)}&filename=${encodeURIComponent(filename)}`;
                  return (
                    <a
                      key={l.questionId}
                      href={href}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Lesson {i + 1}.mp3
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update the account page**

Replace the entire contents of `src/app/account/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getFocusAreas } from "@/lib/focusAreas";
import { masteryPercent } from "@/lib/scoring";
import { chapterMeta } from "@/lib/chapterMeta";
import { ReadinessRing } from "@/components/ReadinessRing";
import { SignOutButton } from "@/components/SignOutButton";
import Link from "next/link";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [chapters, masteryMap, tier] = await Promise.all([
    getChapters(),
    getUserAllMastery(user.id),
    getTier(),
  ]);

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const { correct, total } of masteryMap.values()) {
    totalCorrect += correct;
    totalAnswered += total;
  }
  const overall = totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  const focus = getFocusAreas(masteryMap, chapters, 3);
  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const isPro = hasAccess(tier, "pro");

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--hero-bg)] px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[var(--hero-elevated)] text-sky-300 flex items-center justify-center font-semibold text-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-slate-50 text-sm font-medium truncate">{user.email}</p>
              {memberSince && <p className="text-slate-400 text-xs mt-0.5">Member since {memberSince}</p>}
            </div>
          </div>
          {tier !== "free" && (
            <span className="flex-shrink-0 text-xs font-semibold text-[#0B1120] bg-amber-400 px-3 py-1 rounded-full uppercase">
              {tier}
            </span>
          )}
        </div>

        {/* Readiness */}
        <div className="px-5 py-5 flex items-center gap-5 border-b border-slate-100">
          <ReadinessRing percent={overall} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Overall readiness</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {totalAnswered > 0
                ? `${totalCorrect} of ${totalAnswered} questions correct.`
                : "Take a quiz to start tracking your readiness."}
            </p>
          </div>
        </div>

        {/* Focus areas */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-900">Focus areas</p>
            <Link href="/progress" className="text-xs text-sky-600 hover:underline">
              View full progress →
            </Link>
          </div>
          {focus.map(({ chapter, percent, started }) => {
            const meta = chapterMeta(chapter.slug);
            const Icon = meta.icon;
            return (
              <div key={chapter.id} className="flex items-center gap-3 py-2 border-t border-slate-100">
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{chapter.title}</p>
                  <div className="h-1 bg-slate-100 rounded mt-1 w-32 overflow-hidden">
                    <div
                      className={`h-full ${
                        percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-sky-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  {started ? `${percent}%` : "New"}
                </span>
                <Link
                  href={`/study/${chapter.slug}`}
                  className="text-xs font-semibold text-white bg-sky-600 px-3 py-1.5 rounded-md hover:bg-sky-700 transition-colors"
                >
                  Study
                </Link>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          {isPro ? (
            <Link
              href="/downloads"
              className="text-xs font-semibold text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
            >
              Course downloads
            </Link>
          ) : (
            <Link
              href="/course"
              className="text-xs font-semibold text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
            >
              {tier === "free" ? "Get the course" : "Upgrade to Pro"}
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Remove the `/subscribe` link from NavDrawer**

In `src/components/NavDrawer.tsx`, delete the `Pro` link block (around lines 117-118):

```tsx
                <Link href="/subscribe" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
                  Pro
                </Link>
```

Delete those lines entirely (the `/course` page stays unlinked from nav until sub-project #2).

- [ ] **Step 5: Delete the retired files**

```bash
git rm src/lib/subscription.ts src/app/api/stripe/portal/route.ts src/components/ManageBillingButton.tsx src/app/subscribe/page.tsx src/app/subscribe/success/page.tsx
```

- [ ] **Step 6: Confirm nothing still imports the retired modules**

Run: `npx tsc --noEmit`
Expected: **no errors anywhere.** If tsc reports an import of `getSubscription`, `ManageBillingButton`, `PRICE_ID`, or `/subscribe`, fix that reference, then re-run until clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: downloads page, account tier UI, retire subscription code"
```

---

## Task 10: Full verification + push

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: all suites pass (scoring, focusAreas, entitlement).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; route list includes `/course` and `/downloads`, and no
longer includes `/subscribe`, `/subscribe/success`, or `/api/stripe/portal`.

- [ ] **Step 3: Manual smoke test (dev server)**

Run: `npm run dev`, then with a logged-in **free** test account:
- Visit `/study/<a non-sample chapter slug>` → redirected to `/course`.
- Visit `/study/<one of the two sample chapter slugs>` → loads normally.
- Visit `/downloads` → redirected to `/course`.
- Visit `/course` → three tiers render; Basic/Pro show checkout buttons.

Then run a **Stripe test-mode** checkout for Pro (use card `4242 4242 4242 4242`):
- After success you land on `/account?purchased=pro`.
- The webhook (Stripe CLI `stripe listen --forward-to localhost:3000/api/stripe/webhook`, or the deployed endpoint) sets the profile to `pro`.
- `/account` shows the PRO badge and a "Course downloads" link; `/downloads` now loads; a lesson MP3 downloads.

Confirm in SQL Editor:
```sql
select email, tier from profiles join auth.users on users.id = profiles.id;
```
Expected: the test account shows `pro`.

- [ ] **Step 4: Commit any fixes and push**

```bash
git push
```

Vercel redeploys automatically. `/course` is live by URL but unlinked — public
launch happens at the end of sub-project #2.

---

## Self-Review

**Spec coverage:**
- Tiered one-time pricing (Basic/Pro) → Tasks 4, 8. ✓
- `tier` column replacing `is_subscriber`, grandfather → Task 1. ✓
- `lib/entitlement.ts` with `hasAccess` + `getTier` → Task 2. ✓
- One-time checkout (`mode: payment`), webhook sets tier from metadata → Tasks 4, 5. ✓
- Retire subscription/portal code → Task 9. ✓
- Server-side gating at study/quiz/download → Tasks 6, 7. ✓
- Free tier = first 2 chapters (by display_order) → Tasks 3, 7. ✓
- Full-course download (Pro) → Task 9 (`/downloads` page; zip deferred). ✓
- `/course` page built, not linked in nav → Tasks 8, 9 (NavDrawer link removed). ✓
- Pass guarantee = display copy → Task 8. ✓
- TDD on `hasAccess` + tier mapping → Task 2 (`parseTier`, used by webhook). ✓
- Manual test-mode checkout verification → Task 10. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. The
"zip vs manifest" decision is resolved (Pro `/downloads` page, sequential).

**Type consistency:** `Tier`, `hasAccess`, `parseTier`, `getTier` signatures
are defined in Task 2 and used identically in Tasks 4, 5, 6, 7, 8, 9.
`LessonCard` prop renamed `isSubscriber`→`isPro` in Task 6 and the only caller
(study page) is updated in Task 7. `getFreeChapterSlugs` defined in Task 3,
consumed in Task 7. Checkout `body.tier` (Task 4) matches `CheckoutButton`
payload (Task 8) and webhook `metadata.tier` (Task 5).
