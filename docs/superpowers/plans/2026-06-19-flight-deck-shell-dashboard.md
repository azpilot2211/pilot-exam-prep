# Flight Deck: Shell + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform every logged-in page into a dark cockpit shell with a persistent left sidebar, and build the full Flight Deck dashboard (readiness hero, action cards, chapter training grid, right "Today" rail) using existing DB data — zero new migrations.

**Architecture:** Root `layout.tsx` reads auth server-side and wraps authenticated users in `FlightDeckShell` (dark sidebar + mobile bottom tab bar); logged-out users keep the existing `NavBar`. The `/dashboard` page fetches all data in parallel server-side and renders a 3-column layout. Study streak is computed from existing `attempts.answered_at` timestamps. Pro-gated CTAs redirect to `/course` instead of the locked feature.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Supabase Postgres, lucide-react

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/scoring.ts` | Add `computeOverallPct` pure helper |
| Modify | `src/lib/scoring.test.ts` | Tests for `computeOverallPct` |
| Modify | `src/lib/queries.ts` | Add `getStudyStreak`, `getRecentActivityDays` |
| Modify | `src/components/DailyChallenge.tsx` | Add `compact` card mode |
| Modify | `src/components/ReadinessRing.tsx` | Add `textColor` prop for dark bg |
| Create | `src/components/FlightDeckShell.tsx` | Server component: shell layout |
| Create | `src/components/Sidebar.tsx` | Client component: desktop left nav |
| Create | `src/components/BottomTabBar.tsx` | Client component: mobile bottom nav |
| Modify | `src/app/layout.tsx` | Auth-conditional: shell vs NavBar |
| Create | `src/components/TodayRail.tsx` | Server component: right rail widgets |
| Create | `src/app/dashboard/page.tsx` | Full dashboard page |

---

## Task 1: `computeOverallPct` pure helper + tests

**Files:**
- Modify: `src/lib/scoring.ts`
- Modify: `src/lib/scoring.test.ts`

`examReadiness` (already exists) averages per-chapter percents — which skews toward chapters with fewer questions. `computeOverallPct` does a true aggregate (Σcorrect / Σtotal) which is what the sidebar footer and dashboard hero need.

- [ ] **Step 1: Write the failing test**

Add to the bottom of `src/lib/scoring.test.ts` (keep existing tests, just append):

```ts
describe("computeOverallPct", () => {
  it("returns 0 for an empty map", () => {
    expect(computeOverallPct(new Map())).toBe(0);
  });

  it("aggregates correct and total across all chapters", () => {
    const map = new Map<string, { correct: number; total: number }>([
      ["c1", { correct: 7, total: 10 }],
      ["c2", { correct: 3, total: 10 }],
    ]);
    expect(computeOverallPct(map)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    const map = new Map<string, { correct: number; total: number }>([
      ["c1", { correct: 1, total: 3 }],
    ]);
    expect(computeOverallPct(map)).toBe(33);
  });
});
```

Also update the import at the top of `scoring.test.ts`:
```ts
import { masteryPercent, examReadiness, computeOverallPct } from "./scoring";
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/lib/scoring.test.ts
```

Expected: 3 failures from `computeOverallPct` ("is not a function" or similar).

- [ ] **Step 3: Implement `computeOverallPct` in `src/lib/scoring.ts`**

Append after the existing `examReadiness` function:

```ts
export function computeOverallPct(
  map: Map<string, { correct: number; total: number }>
): number {
  let correct = 0;
  let total = 0;
  for (const v of map.values()) {
    correct += v.correct;
    total += v.total;
  }
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
```

- [ ] **Step 4: Run tests to confirm all pass**

```bash
npx vitest run src/lib/scoring.test.ts
```

Expected: all existing tests + 3 new ones pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: add computeOverallPct aggregate helper"
```

---

## Task 2: DB queries — study streak and recent activity

**Files:**
- Modify: `src/lib/queries.ts`

These query `attempts.answered_at` which already exists. No new tables.

- [ ] **Step 1: Add `getStudyStreak` to `src/lib/queries.ts`**

Append after `getLastExamResult`:

```ts
/**
 * Counts consecutive days (including today) with at least one attempt,
 * going backward from today. Returns 0 if no attempts today or yesterday.
 */
export async function getStudyStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attempts")
    .select("answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });

  if (!data || data.length === 0) return 0;

  const days = new Set(
    data.map((a) => new Date(a.answered_at).toISOString().split("T")[0])
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().split("T")[0];
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
```

- [ ] **Step 2: Add `getRecentActivityDays` to `src/lib/queries.ts`**

Append directly after `getStudyStreak`:

```ts
/**
 * Returns the set of ISO date strings (YYYY-MM-DD) in the past `n` days
 * (including today) that had at least one attempt.
 */
export async function getRecentActivityDays(
  userId: string,
  n: number
): Promise<Set<string>> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - n + 1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("attempts")
    .select("answered_at")
    .eq("user_id", userId)
    .gte("answered_at", since.toISOString());

  return new Set(
    (data ?? []).map((a) => new Date(a.answered_at).toISOString().split("T")[0])
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add getStudyStreak and getRecentActivityDays queries"
```

---

## Task 3: DailyChallenge compact card mode

**Files:**
- Modify: `src/components/DailyChallenge.tsx`

The existing component renders as a wide gradient banner. In the dashboard action-cards row it needs to render as a slate card matching the other cards. Add a `compact` prop: when true, render a card that triggers the same modal.

- [ ] **Step 1: Replace `src/components/DailyChallenge.tsx` with the updated version**

```tsx
"use client";
import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import type { Question, AnswerOption } from "@/lib/queries";

interface Props {
  question: Question;
  options: AnswerOption[];
  chapterTitle: string;
  chapterSlug: string;
  compact?: boolean;
}

export function DailyChallenge({ question, options, chapterTitle, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const correct = options.find((o) => o.is_correct);
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === correct?.label;

  const optionCls = (label: string) => {
    const base = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ";
    if (!isAnswered)
      return base + "border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 cursor-pointer";
    if (label === correct?.label)
      return base + "border-green-400 bg-green-50 text-green-800 font-medium";
    if (label === selected)
      return base + "border-red-300 bg-red-50 text-red-700";
    return base + "border-slate-100 text-slate-400";
  };

  const handleClose = () => { setOpen(false); setSelected(null); };

  return (
    <>
      {compact ? (
        /* ── Card mode (used in dashboard action cards row) ── */
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <Zap size={20} className="text-amber-400 mb-3" />
          <div className="text-slate-200 font-semibold text-sm mb-1">Daily Challenge</div>
          <div className="text-slate-400 text-xs mb-4 line-clamp-2">{question.stem}</div>
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            Answer it →
          </button>
        </div>
      ) : (
        /* ── Banner mode (used on home/study pages) ── */
        <div className="mx-4 sm:mx-20 mb-6 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 text-white overflow-hidden shadow-md">
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-amber-300 fill-amber-300 flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                    Daily Challenge
                  </span>
                </span>
                <span className="text-[10px] text-sky-300">{dateLabel}</span>
              </div>
              <p className="text-sm sm:text-base font-medium leading-snug text-white line-clamp-2">
                {question.stem}
              </p>
              <p className="text-xs text-sky-300 mt-1.5">{chapterTitle}</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-sky-700 rounded-xl text-sm font-bold hover:bg-sky-50 transition-colors whitespace-nowrap"
            >
              Answer it →
            </button>
          </div>
        </div>
      )}

      {/* ── Modal (shared by both modes) ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-sky-700">
                    Daily Challenge
                  </span>
                </span>
                <p className="text-xs text-slate-400 mt-1.5">{chapterTitle}</p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-900 mb-4 leading-snug">
              {question.stem}
            </p>

            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.label}
                  className={optionCls(o.label)}
                  onClick={() => !isAnswered && setSelected(o.label)}
                  disabled={isAnswered}
                >
                  <span className="font-bold mr-2">{o.label}.</span>
                  {o.text}
                </button>
              ))}
            </div>

            {isAnswered && (
              <div
                className={`mt-4 p-4 rounded-xl border text-sm leading-snug ${
                  isCorrect
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                {isCorrect ? (
                  <p className="font-semibold">✓ Correct!</p>
                ) : (
                  <>
                    <p className="font-semibold mb-1">
                      Not quite — the correct answer is <strong>{correct?.label}</strong>.
                    </p>
                    {correct?.why && <p className="mt-1 text-amber-800">{correct.why}</p>}
                  </>
                )}
              </div>
            )}

            {isAnswered && (
              <button
                onClick={handleClose}
                className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. The existing usages of `DailyChallenge` without `compact` continue to work (it defaults to the banner).

- [ ] **Step 3: Commit**

```bash
git add src/components/DailyChallenge.tsx
git commit -m "feat: add compact card mode to DailyChallenge"
```

---

## Task 4: ReadinessRing — add `textColor` prop

**Files:**
- Modify: `src/components/ReadinessRing.tsx`

The existing ring has `fill="#0F172A"` (slate-900) hardcoded for the center percentage text. This is unreadable on the dark dashboard background. Add a `textColor` prop that defaults to the current dark value, preserving all existing usage.

- [ ] **Step 1: Update `src/components/ReadinessRing.tsx`**

```tsx
interface Props {
  percent: number;
  size?: number;
  stroke?: number;
  textColor?: string;
}

export function ReadinessRing({ percent, size = 74, stroke = 8, textColor = "#0F172A" }: Props) {
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
        fill={textColor}
      >
        {clamped}%
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Existing usages without `textColor` still work.

- [ ] **Step 3: Commit**

```bash
git add src/components/ReadinessRing.tsx
git commit -m "feat: add textColor prop to ReadinessRing for dark backgrounds"
```

---

## Task 5: FlightDeckShell — server component

**Files:**
- Create: `src/components/FlightDeckShell.tsx`

Fetches profile + mastery once per request; passes data to `Sidebar`; wraps children in the shell frame.

- [ ] **Step 1: Create `src/components/FlightDeckShell.tsx`**

```tsx
import { getProfile, getUserAllMastery } from "@/lib/queries";
import { computeOverallPct } from "@/lib/scoring";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";

interface Props {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export async function FlightDeckShell({ userId, userEmail, children }: Props) {
  const [profile, masteryMap] = await Promise.all([
    getProfile(userId),
    getUserAllMastery(userId),
  ]);

  const overallPct = computeOverallPct(masteryMap);
  const p = profile as { display_name?: string | null; avatar_color?: string | null } | null;
  const displayName = p?.display_name ?? null;
  const avatarColor = p?.avatar_color ?? "sky";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        overallPct={overallPct}
        displayName={displayName}
        userEmail={userEmail}
        avatarColor={avatarColor}
      />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Type-check (will fail until Sidebar and BottomTabBar exist — continue to Task 6)**

---

## Task 6: Sidebar — client component

**Files:**
- Create: `src/components/Sidebar.tsx`

Needs `usePathname()` for active highlighting. Receives user props from `FlightDeckShell`.

- [ ] **Step 1: Create `src/components/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Headphones,
  TrendingUp,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Flight Deck",
    icon: LayoutDashboard,
    href: "/dashboard",
    match: (p: string) => p === "/dashboard",
  },
  {
    label: "Study Plan",
    icon: BookOpen,
    href: "/",
    match: (p: string) => p === "/" || p.startsWith("/study") || p.startsWith("/quiz"),
  },
  {
    label: "Practice Exam",
    icon: ClipboardList,
    href: "/exam",
    match: (p: string) => p.startsWith("/exam"),
  },
  {
    label: "Audio Course",
    icon: Headphones,
    href: "/downloads",
    match: (p: string) => p === "/downloads",
  },
  {
    label: "Progress",
    icon: TrendingUp,
    href: "/progress",
    match: (p: string) => p === "/progress",
  },
  {
    label: "Account",
    icon: User,
    href: "/account",
    match: (p: string) => p === "/account",
  },
];

const AVATAR_COLORS: Record<string, string> = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

interface Props {
  overallPct: number;
  displayName: string | null;
  userEmail: string;
  avatarColor: string;
}

export function Sidebar({ overallPct, displayName, userEmail, avatarColor }: Props) {
  const pathname = usePathname();
  const label = displayName ?? userEmail;
  const initials = label.slice(0, 2).toUpperCase();
  const avatarBg = AVATAR_COLORS[avatarColor] ?? "bg-sky-500";

  return (
    <nav className="hidden md:flex flex-col w-60 h-full bg-slate-900 border-r border-slate-800 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <span className="text-white font-bold text-lg tracking-tight">✈️ Flight Deck</span>
      </div>

      {/* Nav items */}
      <ul className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label: navLabel, icon: Icon, href, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400 px-3 py-2.5 pl-[10px]"
                    : "px-3 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {navLabel}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
          >
            {initials}
          </div>
          <span className="text-slate-300 text-xs truncate">{label}</span>
        </div>
        <div className="text-xs text-slate-500 mb-0.5">Current course</div>
        <div className="text-sm text-slate-300 font-medium mb-2">Private Pilot</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">{overallPct}%</span>
        </div>
      </div>
    </nav>
  );
}
```

---

## Task 7: BottomTabBar — client component

**Files:**
- Create: `src/components/BottomTabBar.tsx`

- [ ] **Step 1: Create `src/components/BottomTabBar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Headphones,
  User,
} from "lucide-react";

const TABS = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Study", icon: BookOpen, href: "/" },
  { label: "Exam", icon: ClipboardList, href: "/exam" },
  { label: "Audio", icon: Headphones, href: "/downloads" },
  { label: "Account", icon: User, href: "/account" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 md:hidden bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex">
        {TABS.map(({ label, icon: Icon, href }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-sky-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Type-check all three shell components**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FlightDeckShell.tsx src/components/Sidebar.tsx src/components/BottomTabBar.tsx
git commit -m "feat: add FlightDeckShell, Sidebar, and BottomTabBar components"
```

---

## Task 8: Root layout — auth-conditional shell

**Files:**
- Modify: `src/app/layout.tsx`

Currently renders `<NavBar />` unconditionally. Change it to check auth server-side and render `FlightDeckShell` for logged-in users.

- [ ] **Step 1: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { FlightDeckShell } from "@/components/FlightDeckShell";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Flying Ace Exams",
  description: "Private pilot FAA written exam prep — master every topic before test day.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist)] antialiased">
        {user ? (
          <FlightDeckShell userId={user.id} userEmail={user.email ?? ""}>
            {children}
          </FlightDeckShell>
        ) : (
          <>
            <NavBar />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Quick smoke test in dev**

```bash
npm run dev
```

Open http://localhost:3000 while logged out → should see existing NavBar and marketing hero unchanged.  
Log in → should see the dark sidebar on the left. The existing home page (chapter grid) should render inside the shell.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: auth-conditional root layout — FlightDeckShell for logged-in users"
```

---

## Task 9: TodayRail — right rail server component

**Files:**
- Create: `src/components/TodayRail.tsx`

Server component — receives pre-fetched props from `DashboardPage`. Four widgets: Exam Goal, Focus Stack, Study Streak (with 7-day activity dots), Weak-Area Drill (Pro-gated).

- [ ] **Step 1: Create `src/components/TodayRail.tsx`**

```tsx
import Link from "next/link";
import { Lock } from "lucide-react";
import type { FocusArea } from "@/lib/focusAreas";
import type { Chapter } from "@/lib/queries";
import type { Tier } from "@/lib/entitlement";
import { hasAccess } from "@/lib/entitlement";

interface Props {
  overallPct: number;
  focusAreas: FocusArea<Chapter>[];
  streak: number;
  recentDays: Set<string>;
  tier: Tier;
}

export function TodayRail({ overallPct, focusAreas, streak, recentDays, tier }: Props) {
  const month = new Date().toLocaleString("en-US", { month: "long" });

  // Build 7-day activity strip: index 0 = 6 days ago, index 6 = today
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const letter = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
    return { active: recentDays.has(key), letter };
  });

  return (
    <div className="space-y-4 sticky top-6">
      {/* Header */}
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Today · {month} flight plan
      </div>

      {/* Widget 1 — Exam Goal */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-500 mb-2">Exam Goal</div>
        <div className="text-slate-200 font-semibold text-sm">Pass FAA Written</div>
        <div className="text-xs text-slate-400 mb-3">Minimum: 70%</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{overallPct}%</span>
        </div>
        <div
          className={`mt-2 text-xs font-medium ${
            overallPct >= 70 ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {overallPct >= 70 ? "✓ On track" : `${70 - overallPct}% to minimum`}
        </div>
      </div>

      {/* Widget 2 — Focus Stack */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-500 mb-3">Focus Stack</div>
        <div className="space-y-3">
          {focusAreas.length === 0 ? (
            <p className="text-xs text-slate-500">All chapters looking great!</p>
          ) : (
            focusAreas.map(({ chapter, percent }) => (
              <div key={chapter.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 leading-snug truncate">
                    {chapter.title}
                  </div>
                  <div className="text-xs text-slate-500">{percent}% mastery</div>
                </div>
                <Link
                  href={`/study/${chapter.slug}`}
                  className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 mt-0.5"
                >
                  Study →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Widget 3 — Study Streak */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-500 mb-2">Study Streak</div>
        <div className="text-2xl font-bold text-white mb-3">
          {streak > 0 ? "🔥" : "⚡"}{" "}
          <span>{streak}</span>{" "}
          <span className="text-sm font-normal text-slate-400">
            {streak === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex gap-1">
          {dots.map(({ active, letter }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1.5 rounded-full ${
                  active ? "bg-sky-500" : "bg-slate-700"
                }`}
              />
              <span className="text-[9px] text-slate-600">{letter}</span>
            </div>
          ))}
        </div>
        {streak === 0 && (
          <p className="text-xs text-slate-500 mt-2">Answer a question to start your streak!</p>
        )}
      </div>

      {/* Widget 4 — Weak-Area Drill (Pro only) */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-500 mb-3">Weak-Area Drill</div>
        {hasAccess(tier, "pro") ? (
          <div className="space-y-2">
            {focusAreas.length === 0 ? (
              <p className="text-xs text-slate-500">No weak areas — nice work!</p>
            ) : (
              focusAreas.map(({ chapter }) => (
                <Link
                  key={chapter.id}
                  href={`/quiz/${chapter.slug}`}
                  className="block text-sm text-sky-400 hover:text-sky-300"
                >
                  Drill: {chapter.title} →
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-1">
            <Lock size={16} className="text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-500 mb-2">Targeted drilling is a Pro feature</p>
            <Link
              href="/course"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TodayRail.tsx
git commit -m "feat: add TodayRail right-rail component"
```

---

## Task 10: Dashboard page

**Files:**
- Create: `src/app/dashboard/page.tsx`

Fetches all data in parallel. Center column: readiness hero, action cards (Next Action / Daily Challenge / Practice Exam), chapter training grid. Right rail: `TodayRail` (desktop only, `hidden lg:block`).

- [ ] **Step 1: Create `src/app/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, BookOpen, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getChapters,
  getUserAllMastery,
  getLastExamResult,
  getDailyQuestion,
  getStudyStreak,
  getRecentActivityDays,
} from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getFocusAreas } from "@/lib/focusAreas";
import { computeOverallPct } from "@/lib/scoring";
import { ReadinessRing } from "@/components/ReadinessRing";
import { DailyChallenge } from "@/components/DailyChallenge";
import { TodayRail } from "@/components/TodayRail";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [masteryMap, chapters, lastExam, dailyQ, tier, streak, recentDays] =
    await Promise.all([
      getUserAllMastery(user.id),
      getChapters(),
      getLastExamResult(user.id),
      getDailyQuestion(),
      getTier(),
      getStudyStreak(user.id),
      getRecentActivityDays(user.id, 7),
    ]);

  const overallPct = computeOverallPct(masteryMap);
  const focusAreas = getFocusAreas(masteryMap, chapters, 3);
  const questionsAnswered = [...masteryMap.values()].reduce(
    (sum, v) => sum + v.total,
    0
  );
  const nextChapter = focusAreas[0]?.chapter;

  return (
    <div className="flex gap-6 p-6 min-h-full">
      {/* ── Center column ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Readiness Hero */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center gap-6">
            <ReadinessRing percent={overallPct} size={96} stroke={10} textColor="#F8FAFC" />
            <div>
              <div className="text-4xl font-bold text-white">{overallPct}%</div>
              <div className="text-slate-400 text-sm mt-1">Private Pilot · Ready</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Last exam</div>
              <div className="text-slate-200 font-medium">
                {lastExam
                  ? `${lastExam.score}/${lastExam.total} (${Math.round(
                      (lastExam.score / lastExam.total) * 100
                    )}%)`
                  : "No exam yet"}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">FAA minimum</div>
              <div className="text-slate-200 font-medium">70%</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Questions answered</div>
              <div className="text-slate-200 font-medium">{questionsAnswered}</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Next Action */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <BookOpen size={20} className="text-sky-400 mb-3" />
            <div className="text-slate-200 font-semibold text-sm mb-1">Next Action</div>
            <div className="text-slate-400 text-xs mb-4 line-clamp-2">
              {nextChapter
                ? `Study: ${(nextChapter as { title: string }).title}`
                : "All chapters in great shape!"}
            </div>
            {nextChapter ? (
              <Link
                href={`/study/${(nextChapter as { slug: string }).slug}`}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Study now →
              </Link>
            ) : (
              <Link
                href="/"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                View chapters →
              </Link>
            )}
          </div>

          {/* Daily Challenge */}
          {dailyQ ? (
            <DailyChallenge
              question={dailyQ.question}
              options={dailyQ.options}
              chapterTitle={dailyQ.chapterTitle}
              chapterSlug={dailyQ.chapterSlug}
              compact
            />
          ) : (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="text-slate-400 text-xs">No challenge today</div>
            </div>
          )}

          {/* Practice Exam */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <ClipboardList size={20} className="text-sky-400 mb-3" />
            <div className="text-slate-200 font-semibold text-sm mb-1">Practice Exam</div>
            <div className="text-slate-400 text-xs mb-4">
              60-question FAA-style exam with readiness score
            </div>
            {hasAccess(tier, "pro") ? (
              <Link
                href="/exam"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Start exam →
              </Link>
            ) : (
              <Link
                href="/course"
                className="text-xs font-semibold text-slate-400 hover:text-slate-300"
              >
                <Lock size={11} className="inline mr-1" />
                Upgrade to Pro →
              </Link>
            )}
          </div>
        </div>

        {/* Training Plan */}
        <div>
          <h2 className="text-slate-200 font-semibold mb-3">Training Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {chapters.map((chapter) => {
              const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
              const pct =
                m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
              const canQuiz = hasAccess(tier, "basic");
              return (
                <div
                  key={chapter.id}
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700"
                >
                  <div className="text-slate-200 text-sm font-medium mb-2 line-clamp-1">
                    {chapter.title}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                      <div
                        className="h-1.5 rounded-full bg-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{pct}%</span>
                  </div>
                  <div className="flex gap-4 text-xs font-medium">
                    <Link
                      href={`/study/${chapter.slug}`}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      Study
                    </Link>
                    {canQuiz ? (
                      <Link
                        href={`/quiz/${chapter.slug}`}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Quiz
                      </Link>
                    ) : (
                      <Link href="/course" className="text-slate-600">
                        <Lock size={10} className="inline mr-0.5" />
                        Quiz
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right rail (desktop only, ≥ lg) ── */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <TodayRail
          overallPct={overallPct}
          focusAreas={focusAreas}
          streak={streak}
          recentDays={recentDays}
          tier={tier}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about `chapter.title` or `chapter.slug` being possibly undefined (depends on generated DB types), add `?? ""` fallbacks:
- `chapter.title ?? "Untitled"`
- `chapter.slug ?? ""`

- [ ] **Step 3: Verify in dev server**

```bash
npm run dev
```

Checklist:
- Log in → sidebar appears on left ✓
- Navigate to http://localhost:3000/dashboard → full dashboard loads ✓
- Readiness ring renders with white text (readable on dark background) ✓
- Action cards row: 3 cards side by side on desktop ✓
- Daily challenge card opens modal when clicked ✓
- Practice Exam card: if Pro → "Start exam →"; if not Pro → lock icon + "Upgrade to Pro →" linking to /course ✓
- Training plan shows all chapters with mastery bars ✓
- Right rail visible at ≥ lg (≥1024px), hidden on smaller screens ✓
- Study Streak shows real consecutive-day count ✓
- Weak-Area Drill: if Pro → quiz links for weak chapters; if not → lock + upgrade CTA ✓
- Visit http://localhost:3000 while logged out → existing NavBar and hero unchanged ✓
- Visit http://localhost:3000/study/[any-slug] while logged in → study page loads inside shell ✓
- Active nav item highlighted correctly across routes ✓
- Mobile (<768px): sidebar hidden, bottom tab bar visible at bottom ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: Flight Deck dashboard — readiness hero, action cards, training plan, today rail"
```

---

## Task 11: Final check + push

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all existing tests pass (new `computeOverallPct` tests included).

- [ ] **Step 3: Push to remote**

```bash
git push
```

Vercel will auto-deploy. Check the deployment URL to confirm the shell and dashboard render correctly in production.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Left sidebar (all pages, logged-in) — Tasks 5–8
- ✅ Bottom tab bar (mobile) — Task 7
- ✅ Auth-conditional root layout — Task 8
- ✅ Readiness hero + ring — Task 10 (uses Task 4 textColor fix)
- ✅ Action cards: Next Action, Daily Challenge, Practice Exam — Tasks 3 + 10
- ✅ Training plan with chapter grid + mastery bars + Study/Quiz links — Task 10
- ✅ Right rail: Exam Goal, Focus Stack, Streak, Weak-Area Drill — Tasks 9 + 10
- ✅ Pro-gating (Practice Exam card, Quiz links, Weak-Area Drill) — Task 10 + 9
- ✅ Study streak from existing `attempts` table — Task 2
- ✅ 7-day activity dots — Tasks 2 + 9
- ✅ `computeOverallPct` aggregate — Task 1
- ✅ No new DB migrations

**Type consistency check:**
- `computeOverallPct` defined in Task 1, used in Tasks 5 + 10 ✓
- `getStudyStreak` / `getRecentActivityDays` defined in Task 2, used in Task 10 ✓
- `FocusArea<Chapter>` flows from Task 10 → Task 9 ✓
- `compact` prop defined in Task 3, used in Task 10 ✓
- `textColor` prop defined in Task 4, used in Task 10 ✓
