# Horizon UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Horizon" design system — light readable app + dark golden-hour runway hero, per-chapter icons, slide-out drawer nav, new logo mark, and a personalized `/account` hub — across Flying Ace Exams.

**Architecture:** Add a small set of reusable primitives (`Logo`, `ReadinessRing`, `chapterMeta` map, `getFocusAreas` pure function), a client slide-out `NavDrawer`, a new `/account` page, and a Stripe billing-portal route. Restyle existing components in place using the token system. No data-flow or schema changes beyond the new portal route. Spec: `docs/superpowers/specs/2026-06-17-ui-redesign-horizon-design.md`.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Tailwind CSS v4, Supabase SSR, Stripe, lucide-react (new), Vitest.

**Conventions for this codebase:**
- Tests use Vitest (`import { describe, it, expect } from "vitest"`), node environment, files named `*.test.ts` under `src/`. Run with `npm test`.
- There is **no jsdom/testing-library** — only pure logic gets unit tests. Presentational components are verified with `npm run build` (compiles + type-checks) and manual run.
- Profiles table is not in generated Supabase types — access it via `(supabase as any).from("profiles")` (existing pattern).
- Commit messages end with a `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer (omitted from the short commands below for brevity — add it as the team already does).

---

## File Structure

**New files:**
- `src/components/Logo.tsx` — SVG logo mark (navy roundel + sky chevron), optional wordmark.
- `src/components/ReadinessRing.tsx` — SVG donut showing a percentage.
- `src/components/NavDrawer.tsx` — client slide-out drawer (hamburger + panel).
- `src/components/ManageBillingButton.tsx` — client button → Stripe billing portal.
- `src/lib/chapterMeta.ts` — slug → `{ icon, chipBg, accent }` map (+ fallback).
- `src/lib/focusAreas.ts` — pure `getFocusAreas()` (weakest chapters + fill).
- `src/lib/focusAreas.test.ts` — unit tests for `getFocusAreas`.
- `src/app/account/page.tsx` — account hub page.
- `src/app/api/stripe/portal/route.ts` — billing-portal session route.
- `public/hero-runway.jpg` — hero background photo (sourced).

**Modified files:**
- `src/app/globals.css` — add hero CSS variables.
- `src/components/NavBar.tsx` — render `Logo` + `NavDrawer`, fetch chapters.
- `src/components/ChapterCard.tsx` — accent stripe + icon chip.
- `src/app/page.tsx` — dark runway hero, stat strip, "Choose a topic" header, readiness ring.
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/auth/update-password/page.tsx` — swap emoji for `Logo`.

---

## Task 1: Dependencies + design tokens

**Files:**
- Modify: `package.json` (via npm), `src/app/globals.css`

- [ ] **Step 1: Install lucide-react**

Run: `npm install lucide-react`
Expected: adds `lucide-react` to `dependencies`, exits 0.

- [ ] **Step 2: Add hero CSS variables to `src/app/globals.css`**

Replace the `:root` block so the file reads:

```css
@import "tailwindcss";

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --hero-bg: #0b1120;
  --hero-elevated: #1e293b;
}

body {
  background: var(--background);
  color: var(--foreground);
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: build completes with exit 0 (no type errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/globals.css
git commit -m "chore: add lucide-react + hero design tokens"
```

---

## Task 2: Logo component

**Files:**
- Create: `src/components/Logo.tsx`

- [ ] **Step 1: Create `src/components/Logo.tsx`**

```tsx
interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({ size = 26, showWordmark = false, wordmarkClassName = "" }: LogoProps) {
  return (
    <span className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#0F172A" />
        <path d="M16 6 L23 23 L16 19 L9 23 Z" fill="#38BDF8" />
      </svg>
      {showWordmark && (
        <span className={`font-bold text-slate-900 tracking-tight ${wordmarkClassName}`}>
          Flying Ace Exams
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/Logo.tsx
git commit -m "feat: add Logo component (roundel + chevron mark)"
```

---

## Task 3: ReadinessRing component

**Files:**
- Create: `src/components/ReadinessRing.tsx`

- [ ] **Step 1: Create `src/components/ReadinessRing.tsx`**

```tsx
interface Props {
  percent: number;
  size?: number;
  stroke?: number;
}

export function ReadinessRing({ percent, size = 74, stroke = 8 }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped}% ready`}
      className="flex-shrink-0"
    >
      <circle cx={center} cy={center} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="#0EA5E9"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight="600"
        fill="#0F172A"
      >
        {clamped}%
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReadinessRing.tsx
git commit -m "feat: add ReadinessRing donut component"
```

---

## Task 4: chapterMeta map

**Files:**
- Create: `src/lib/chapterMeta.ts`

The 12 chapter slugs are: `weather`, `regulations`, `navigation`, `aerodynamics`, `airspace`, `airport-operations`, `aircraft-systems`, `weight-and-balance`, `performance`, `emergency-procedures`, `preflight-planning`, `night-operations`.

> Tailwind v4 only emits classes it finds as complete literal strings. The full class strings below (`"bg-sky-100 text-sky-600"`, `"bg-sky-500"`, etc.) appear verbatim in this file, so they are scanned and emitted. Never build these strings dynamically.

- [ ] **Step 1: Create `src/lib/chapterMeta.ts`**

```ts
import {
  CloudSun,
  Scale,
  Compass,
  Wind,
  Layers,
  TowerControl,
  Gauge,
  Weight,
  TrendingUp,
  TriangleAlert,
  ClipboardList,
  Moon,
  Plane,
  type LucideIcon,
} from "lucide-react";

export interface ChapterMeta {
  icon: LucideIcon;
  chipBg: string; // icon-chip background + foreground
  accent: string; // top accent stripe background
}

const META: Record<string, ChapterMeta> = {
  weather: { icon: CloudSun, chipBg: "bg-sky-100 text-sky-600", accent: "bg-sky-500" },
  regulations: { icon: Scale, chipBg: "bg-indigo-100 text-indigo-600", accent: "bg-indigo-500" },
  navigation: { icon: Compass, chipBg: "bg-cyan-100 text-cyan-600", accent: "bg-cyan-500" },
  aerodynamics: { icon: Wind, chipBg: "bg-violet-100 text-violet-600", accent: "bg-violet-500" },
  airspace: { icon: Layers, chipBg: "bg-blue-100 text-blue-600", accent: "bg-blue-500" },
  "airport-operations": { icon: TowerControl, chipBg: "bg-teal-100 text-teal-600", accent: "bg-teal-500" },
  "aircraft-systems": { icon: Gauge, chipBg: "bg-slate-100 text-slate-600", accent: "bg-slate-400" },
  "weight-and-balance": { icon: Weight, chipBg: "bg-amber-100 text-amber-600", accent: "bg-amber-500" },
  performance: { icon: TrendingUp, chipBg: "bg-emerald-100 text-emerald-600", accent: "bg-emerald-500" },
  "emergency-procedures": { icon: TriangleAlert, chipBg: "bg-red-100 text-red-600", accent: "bg-red-500" },
  "preflight-planning": { icon: ClipboardList, chipBg: "bg-indigo-100 text-indigo-600", accent: "bg-indigo-500" },
  "night-operations": { icon: Moon, chipBg: "bg-slate-100 text-slate-600", accent: "bg-slate-400" },
};

const FALLBACK: ChapterMeta = {
  icon: Plane,
  chipBg: "bg-slate-100 text-slate-600",
  accent: "bg-slate-400",
};

export function chapterMeta(slug: string): ChapterMeta {
  return META[slug] ?? FALLBACK;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/chapterMeta.ts
git commit -m "feat: add per-chapter icon + tint metadata map"
```

---

## Task 5: getFocusAreas (TDD)

**Files:**
- Create: `src/lib/focusAreas.ts`
- Test: `src/lib/focusAreas.test.ts`

- [ ] **Step 1: Write the failing test in `src/lib/focusAreas.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getFocusAreas } from "./focusAreas";

const ch = (id: string) => ({ id, slug: id, title: id });

describe("getFocusAreas", () => {
  it("returns the lowest-mastery attempted chapters first", () => {
    const mastery = new Map([
      ["a", { correct: 9, total: 10 }], // 90%
      ["b", { correct: 3, total: 10 }], // 30%
      ["c", { correct: 6, total: 10 }], // 60%
    ]);
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c")], 2);
    expect(result.map((r) => r.chapter.id)).toEqual(["b", "c"]);
    expect(result[0].percent).toBe(30);
    expect(result[0].started).toBe(true);
  });

  it("fills with unstarted chapters when too few have been attempted", () => {
    const mastery = new Map([["a", { correct: 5, total: 10 }]]); // 50%
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c")], 3);
    expect(result.map((r) => r.chapter.id)).toEqual(["a", "b", "c"]);
    expect(result[1].started).toBe(false);
    expect(result[1].percent).toBe(0);
  });

  it("respects the limit", () => {
    const mastery = new Map([
      ["a", { correct: 1, total: 10 }],
      ["b", { correct: 2, total: 10 }],
      ["c", { correct: 3, total: 10 }],
      ["d", { correct: 4, total: 10 }],
    ]);
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c"), ch("d")], 3);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.chapter.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when there are no chapters", () => {
    expect(getFocusAreas(new Map(), [], 3)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- focusAreas`
Expected: FAIL — `getFocusAreas` is not defined / module not found.

- [ ] **Step 3: Implement `src/lib/focusAreas.ts`**

```ts
import { masteryPercent } from "./scoring";

export interface FocusArea<C> {
  chapter: C;
  percent: number;
  started: boolean;
}

/**
 * Returns up to `limit` chapters to focus on: the weakest attempted chapters
 * (lowest mastery first), back-filled with not-yet-started chapters when fewer
 * than `limit` have been attempted.
 */
export function getFocusAreas<C extends { id: string }>(
  masteryMap: Map<string, { correct: number; total: number }>,
  chapters: C[],
  limit = 3
): FocusArea<C>[] {
  const scored = chapters.map((chapter) => {
    const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
    return {
      chapter,
      percent: m.total > 0 ? masteryPercent(m.correct, m.total) : 0,
      started: m.total > 0,
    };
  });

  const started = scored
    .filter((s) => s.started)
    .sort((a, b) => a.percent - b.percent);

  const focus = started.slice(0, limit);

  if (focus.length < limit) {
    const unstarted = scored.filter((s) => !s.started);
    focus.push(...unstarted.slice(0, limit - focus.length));
  }

  return focus;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- focusAreas`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/focusAreas.ts src/lib/focusAreas.test.ts
git commit -m "feat: add getFocusAreas (weakest chapters + fill)"
```

---

## Task 6: NavBar + slide-out NavDrawer

**Files:**
- Create: `src/components/NavDrawer.tsx`
- Modify: `src/components/NavBar.tsx` (full rewrite below)

- [ ] **Step 1: Create `src/components/NavDrawer.tsx`**

```tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { chapterMeta } from "@/lib/chapterMeta";
import { Logo } from "./Logo";

interface Props {
  isLoggedIn: boolean;
  chapters: { slug: string; title: string }[];
}

export function NavDrawer({ isLoggedIn, chapters }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    close();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={close} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label="Navigation menu"
            className="absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <Logo size={24} showWordmark wordmarkClassName="text-sm" />
              <button onClick={close} aria-label="Close menu" className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Sections
              </p>
              {chapters.map((c) => {
                const meta = chapterMeta(c.slug);
                const Icon = meta.icon;
                return (
                  <Link
                    key={c.slug}
                    href={`/study/${c.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm text-slate-700">{c.title}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-100" />

              {isLoggedIn ? (
                <>
                  <Link href="/account" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                    Account
                  </Link>
                  <Link href="/progress" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                    Progress
                  </Link>
                  <Link href="/subscribe" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
                    Pro
                  </Link>
                  <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-500">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                    Sign in
                  </Link>
                  <Link href="/signup" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/NavBar.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChapters } from "@/lib/queries";
import { Logo } from "./Logo";
import { NavDrawer } from "./NavDrawer";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chapters = await getChapters();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo size={26} showWordmark wordmarkClassName="text-sm" />
        </Link>
        <NavDrawer
          isLoggedIn={!!user}
          chapters={chapters.map((c) => ({ slug: c.slug, title: c.title }))}
        />
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open `http://localhost:3000`. Click the hamburger: the drawer slides in from the right with the 12 sections (each with its icon) plus Account/Progress/Pro/Log out (logged in) or Sign in/Create account (logged out). Backdrop click, the X, `Esc`, and selecting any link all close it. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavDrawer.tsx src/components/NavBar.tsx
git commit -m "feat: logo + slide-out drawer navigation"
```

---

## Task 7: ChapterCard redesign

**Files:**
- Modify: `src/components/ChapterCard.tsx` (full rewrite below)

- [ ] **Step 1: Rewrite `src/components/ChapterCard.tsx`**

```tsx
import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import { masteryPercent } from "@/lib/scoring";
import { chapterMeta } from "@/lib/chapterMeta";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  mastery: { correct: number; total: number } | null;
  questionCount: number;
}

export function ChapterCard({ slug, title, description, mastery, questionCount }: Props) {
  const hasStarted = mastery != null && mastery.total > 0;
  const percent = hasStarted ? masteryPercent(mastery!.correct, mastery!.total) : 0;
  const meta = chapterMeta(slug);
  const Icon = meta.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className={`h-1 ${meta.accent}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-base leading-snug">{title}</h2>
              {questionCount > 0 && (
                <p className="text-xs text-slate-400">
                  {questionCount} lesson{questionCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {hasStarted && (
            <span
              className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                percent >= 80 ? "bg-green-100 text-green-700" : "bg-sky-50 text-sky-700"
              }`}
            >
              {percent >= 80 ? "Ready ✓" : "In progress"}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
        )}
        <div className="flex-1" />
        {hasStarted ? (
          <MasteryBar percent={percent} label={`${mastery!.total} answered`} />
        ) : (
          <p className="text-xs text-slate-400 mt-2">Not started</p>
        )}
        <div className="flex gap-2 mt-4">
          <Link
            href={`/study/${slug}`}
            className="flex-1 text-center py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors"
          >
            Study
          </Link>
          <Link
            href={`/quiz/${slug}`}
            className="flex-1 text-center py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChapterCard.tsx
git commit -m "feat: chapter cards with accent stripe + icon chip"
```

---

## Task 8: Hero image asset

**Files:**
- Create: `public/hero-runway.jpg`

- [ ] **Step 1: Download a royalty-free aviation/runway photo**

Run:
```bash
curl -L -o public/hero-runway.jpg "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80"
```
Expected: writes `public/hero-runway.jpg`.

- [ ] **Step 2: Verify the file is a real image (not an error page)**

Run: `ls -l public/hero-runway.jpg`
Expected: file size > 50 KB. If it is smaller (download failed), the hero still renders on the `--hero-bg` navy fallback — note it for the user to drop in their own `public/hero-runway.jpg`, and continue. Do not block the plan on this.

- [ ] **Step 3: Commit**

```bash
git add public/hero-runway.jpg
git commit -m "chore: add runway hero background image"
```

---

## Task 9: Home page hero + grid

**Files:**
- Modify: `src/app/page.tsx` (full rewrite below)

- [ ] **Step 1: Rewrite `src/app/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getChapters, getUserAllMastery, getPublishedQuestionCounts } from "@/lib/queries";
import { ChapterCard } from "@/components/ChapterCard";
import { ReadinessRing } from "@/components/ReadinessRing";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [chapters, questionCounts, masteryMap] = await Promise.all([
    getChapters(),
    getPublishedQuestionCounts(),
    user
      ? getUserAllMastery(user.id)
      : Promise.resolve(new Map<string, { correct: number; total: number }>()),
  ]);

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const { correct, total } of masteryMap.values()) {
    totalCorrect += correct;
    totalAnswered += total;
  }
  const overallPercent =
    totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  const totalQuestions = Array.from(questionCounts.values()).reduce((s, n) => s + n, 0);

  return (
    <main className="max-w-4xl mx-auto px-4">
      {/* Hero — logged-out visitors */}
      {!user && (
        <section className="relative mt-4 rounded-3xl overflow-hidden min-h-[460px] flex flex-col">
          <div
            className="absolute inset-0 bg-[var(--hero-bg)] bg-cover bg-center"
            style={{ backgroundImage: "url('/hero-runway.jpg')" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/55 via-[#0B1120]/35 to-[#0B1120]/92"
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 pt-14 pb-16">
            <span className="inline-block text-[11px] tracking-wide text-amber-300 border border-amber-400/50 px-3 py-1 rounded-full mb-5">
              FAA Written Test Prep
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 leading-tight tracking-tight max-w-2xl">
              Cleared for takeoff on your written exam.
            </h1>
            <p className="mt-4 text-slate-300 text-base max-w-xl mx-auto leading-relaxed">
              AI-built lessons, audio explanations, and instant-feedback quizzes — one topic at a time.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 bg-sky-500 text-white rounded-xl font-semibold text-sm hover:bg-sky-400 transition-colors"
              >
                Start studying free →
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-white/10 text-slate-100 border border-slate-300/30 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">No credit card to start</p>
          </div>
          {totalQuestions > 0 && (
            <div className="relative bg-slate-900/55 border-t border-slate-300/15 grid grid-cols-3">
              <div className="text-center py-3">
                <div className="text-slate-50 font-semibold tabular-nums">{totalQuestions}</div>
                <div className="text-slate-400 text-[11px]">questions</div>
              </div>
              <div className="text-center py-3 border-x border-slate-300/15">
                <div className="text-slate-50 font-semibold tabular-nums">{chapters.length}</div>
                <div className="text-slate-400 text-[11px]">chapters</div>
              </div>
              <div className="text-center py-3">
                <div className="text-slate-50 font-semibold">Audio</div>
                <div className="text-slate-400 text-[11px]">every lesson</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Logged-in header */}
      {user && (
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-slate-900">Your Exam Prep</h1>
          <p className="text-slate-400 mt-1 text-sm">Master every topic before test day.</p>
        </div>
      )}

      {/* Overall readiness widget */}
      {user && totalAnswered > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-5">
          <ReadinessRing percent={overallPercent} />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Overall Readiness</p>
            <p className="text-xs text-slate-400 mt-1">
              {totalCorrect} of {totalAnswered} questions correct
            </p>
          </div>
          <Link
            href="/progress"
            className="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            View progress →
          </Link>
        </div>
      )}

      {/* First-time logged-in prompt */}
      {user && totalAnswered === 0 && chapters.length > 0 && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-sky-800">Ready to start?</p>
          <p className="text-sm text-sky-600 mt-1">
            Pick any chapter below — study the lesson, then take the quiz to track your mastery.
          </p>
        </div>
      )}

      {/* Section header */}
      {chapters.length > 0 && (
        <div className={`flex items-baseline justify-between ${!user ? "mt-10" : ""} mb-3`}>
          <h2 className="text-sm font-semibold text-slate-900">Choose a topic</h2>
          <span className="text-xs text-slate-400">{chapters.length} chapters</span>
        </div>
      )}

      {/* Chapter grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!user ? "pb-12" : "pb-8"}`}>
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            slug={chapter.slug}
            title={chapter.title}
            description={chapter.description}
            mastery={masteryMap.get(chapter.id) ?? null}
            questionCount={questionCounts.get(chapter.id) ?? 0}
          />
        ))}
      </div>

      {chapters.length === 0 && (
        <p className="text-center text-slate-400 mt-16 text-sm">
          No chapters yet — run the pipeline to generate content.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Manual check**

Run `npm run dev`. Logged out: hero shows the runway image under a navy gradient, amber "FAA Written Test Prep" badge, headline, CTAs, "No credit card to start", and the three-stat strip pinned at the bottom with clear separation from the buttons. Logged in (with quiz history): readiness ring renders next to "Overall Readiness". "Choose a topic" header sits above the grid. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: dark runway hero + readiness ring + topic header"
```

---

## Task 10: Stripe billing-portal route

**Files:**
- Create: `src/app/api/stripe/portal/route.ts`

- [ ] **Step 1: Create `src/app/api/stripe/portal/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://flyingaceexams.com";

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/portal/route.ts
git commit -m "feat: Stripe billing-portal route"
```

---

## Task 11: ManageBillingButton

**Files:**
- Create: `src/components/ManageBillingButton.tsx`

- [ ] **Step 1: Create `src/components/ManageBillingButton.tsx`**

```tsx
"use client";
import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || body.error || !body.url) {
        alert(body.error ?? "Could not open billing. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      alert("Could not open billing. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-semibold text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "Opening…" : "Manage billing"}
    </button>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ManageBillingButton.tsx
git commit -m "feat: ManageBillingButton (Stripe portal launcher)"
```

---

## Task 12: Account hub page

**Files:**
- Create: `src/app/account/page.tsx`

Uses: `getFocusAreas` (Task 5), `ReadinessRing` (Task 3), `chapterMeta` (Task 4), `ManageBillingButton` (Task 11), `getSubscription` (`src/lib/subscription.ts`, existing), `SignOutButton` (existing).

- [ ] **Step 1: Create `src/app/account/page.tsx`**

```tsx
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { getSubscription } from "@/lib/subscription";
import { getFocusAreas } from "@/lib/focusAreas";
import { masteryPercent } from "@/lib/scoring";
import { chapterMeta } from "@/lib/chapterMeta";
import { ReadinessRing } from "@/components/ReadinessRing";
import { ManageBillingButton } from "@/components/ManageBillingButton";
import { SignOutButton } from "@/components/SignOutButton";
import Link from "next/link";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [chapters, masteryMap, sub] = await Promise.all([
    getChapters(),
    getUserAllMastery(user.id),
    getSubscription(),
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
  const isSubscriber = sub?.isSubscriber ?? false;

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
          {isSubscriber && (
            <span className="flex-shrink-0 text-xs font-semibold text-[#0B1120] bg-amber-400 px-3 py-1 rounded-full">
              PRO
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
          {isSubscriber ? (
            <ManageBillingButton />
          ) : (
            <Link
              href="/subscribe"
              className="text-xs font-semibold text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
            >
              Upgrade to Pro
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Manual check**

Run `npm run dev`, sign in, open `/account` (or via the drawer's Account link). Confirm: dark header with email + initials + PRO badge (if subscribed), readiness ring, three focus-area rows (weakest first, or "New" suggestions if little history), "View full progress →", and Manage billing + Sign out. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/account/page.tsx
git commit -m "feat: account hub — readiness, focus areas, billing"
```

---

## Task 13: Logo on auth pages

**Files:**
- Modify: `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/auth/update-password/page.tsx`

Each of these pages currently has this emoji + wordmark block:

```tsx
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl" aria-hidden="true">✈️</span>
            <span className="font-bold text-slate-900 tracking-tight">Flying Ace Exams</span>
          </div>
```

- [ ] **Step 1: In each of the four files, add the import**

At the top of each file, alongside the existing imports, add:

```tsx
import { Logo } from "@/components/Logo";
```

- [ ] **Step 2: In each of the four files, replace the emoji block with the Logo**

Replace the emoji + wordmark `<div>` shown above with:

```tsx
          <div className="mb-4">
            <Logo size={26} showWordmark />
          </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exit 0. Confirm no remaining `✈️` in these files (search): `git grep "✈️" src/app/login src/app/signup src/app/forgot-password src/app/auth` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/signup/page.tsx src/app/forgot-password/page.tsx src/app/auth/update-password/page.tsx
git commit -m "feat: use Logo mark on auth pages"
```

---

## Task 14: Full verification + push

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass (including `focusAreas` and existing scoring/pipeline tests).

- [ ] **Step 2: Run a clean production build**

Run: `npm run build`
Expected: exit 0, no type or lint errors.

- [ ] **Step 3: Full manual smoke test**

Run `npm run dev` and verify end-to-end: logged-out hero, drawer nav (sections + account + log out), chapter cards with icons + accent stripes, study/quiz pages still work, account page (ring + focus areas + billing), login/signup show the new logo. Stop the dev server.

- [ ] **Step 4: Push**

Run: `git push origin main`
Expected: pushes all redesign commits; Vercel deploys.

---

## Notes for the executor

- **`npm run build` is the type-check gate** for presentational tasks (there is no jsdom test setup). If a build fails, fix it before committing.
- **Hero image:** if the Task 8 download produces a tiny/invalid file, the hero degrades gracefully to the `--hero-bg` navy surface — proceed and flag it so the user can drop their own `public/hero-runway.jpg`.
- **Stripe portal:** requires the live billing-portal to be enabled in the Stripe dashboard (Settings → Billing → Customer portal). If `Manage billing` returns an error mentioning portal configuration, that dashboard toggle is the fix — not a code change.
- **No schema changes** — the `profiles` table already exists from the subscription work.
