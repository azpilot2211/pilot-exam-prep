# Flight Deck: Shell + Dashboard — Design Spec

**Goal:** Transform the entire logged-in experience into a dark cockpit shell with a persistent left sidebar, and build the full Flight Deck dashboard page (readiness hero, action cards, chapter grid, and right "Today" rail) using data we already have. Zero new DB tables needed.

**Implementation approach:** Rework existing files — all auth, Stripe, queries, and exam logic stays in place. The shell and dashboard are additive.

---

## Full Layout (desktop)

```
┌──────────────────┬─────────────────────────────────┬──────────────────┐
│ Left sidebar     │ Center content                  │ Right rail       │
│ 240px slate-900  │ flex-1                          │ 280px            │
│                  │                                 │                  │
│ ✈️  Flight Deck  │ 78% ready  [ring]  stats        │ Today · June     │
│                  │ [Next] [Challenge] [Exam]        │ flight plan      │
│ ⬜ Flight Deck   │                                 │                  │
│ □  Study Plan    │ Training Plan                   │ Exam Goal        │
│ □  Practice Exam │ ┌────┬────┬────┐               │ Focus Stack      │
│ □  Audio Course  │ │ch1 │ch2 │ch3 │               │ Study Streak     │
│ □  Progress      │ └────┴────┴────┘               │ Weak-Area Drill  │
│ □  Account       │                                 │                  │
│                  │                                 │                  │
│ ──────────────── │                                 │                  │
│ Private Pilot    │                                 │                  │
│ 78% readiness    │                                 │                  │
└──────────────────┴─────────────────────────────────┴──────────────────┘
```

The right rail appears **only on `/dashboard`**. All other pages (study, exam, account, etc.) get the left sidebar + full-width content as before.

---

## Architecture

- **`src/app/layout.tsx`** — server component; calls `supabase.auth.getUser()`. If authenticated → `<FlightDeckShell>`. If not → existing `<NavBar>` + children. No marketing pages change.
- **`src/app/dashboard/page.tsx`** — server component; fetches all dashboard data in parallel; renders the 3-column layout.
- All existing routes stay at their current paths. No file moves.

---

## Part 1: Shell

### `src/components/FlightDeckShell.tsx` — Server Component

Fetches profile and overall readiness once per request, passes to Sidebar.

```
<div className="flex h-screen overflow-hidden bg-slate-950">
  <Sidebar overallPct={pct} displayName={name} avatarColor={color} />
  <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
    {children}
  </main>
  <BottomTabBar />
</div>
```

Data fetched:
- `supabase.auth.getUser()` → userId, email
- `getProfile(userId)` → display_name, avatar_color
- `getUserAllMastery(userId)` → compute `overallPct = Σcorrect / Σtotal × 100`

### `src/components/Sidebar.tsx` — Client Component

`usePathname()` drives active-item highlighting.

**Nav items:**

| Label | Icon | Route | Active when |
|-------|------|-------|-------------|
| Flight Deck | `LayoutDashboard` | `/dashboard` | exact |
| Study Plan | `BookOpen` | `/` | exact + `/study/*` + `/quiz/*` |
| Practice Exam | `ClipboardList` | `/exam` | starts with `/exam` |
| Audio Course | `Headphones` | `/downloads` | exact |
| Progress | `TrendingUp` | `/progress` | exact |
| Account | `User` | `/account` | exact |

Active state: `bg-sky-500/10 text-sky-400 border-l-2 border-sky-400`  
Inactive: `text-slate-400 hover:bg-slate-800 hover:text-slate-200`

**Footer (pinned to bottom):**
- Display name or email (truncated)
- "Current course: Private Pilot"
- Slim readiness bar: `h-1.5 rounded-full bg-slate-700` with sky fill + `{pct}%` label

### `src/components/BottomTabBar.tsx` — Client Component

Mobile-only (`md:hidden`), `fixed bottom-0 inset-x-0 z-50`.

5 tabs (icon + label): Home → `/dashboard`, Study → `/`, Exam → `/exam`, Audio → `/downloads`, Account → `/account`.

Active: `text-sky-400`. Inactive: `text-slate-500`.

---

## Part 2: Dashboard Page

### Data Fetched (all in parallel in `DashboardPage`)

```ts
const [masteryMap, chapters, lastExam, dailyQ, tier] = await Promise.all([
  getUserAllMastery(userId),
  getChapters(),
  getLastExamResult(userId),
  getDailyQuestion(),
  getTier(),
])
const focusAreas = getFocusAreas(masteryMap, chapters, 3)   // pure fn, no await
const streak = await getStudyStreak(userId)                  // new query (see below)
const overallPct = computeOverallPct(masteryMap)             // pure fn, no await
const recentDays = await getRecentActivityDays(userId, 7)    // new query (see below)
```

### New Queries (added to `src/lib/queries.ts`)

**`getStudyStreak(userId)`** — counts consecutive days (from today backward) with ≥1 attempt:

```ts
export async function getStudyStreak(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('attempts')
    .select('answered_at')
    .eq('user_id', userId)
    .order('answered_at', { ascending: false })

  if (!data || data.length === 0) return 0

  const days = new Set(
    data.map(a => new Date(a.answered_at).toISOString().split('T')[0])
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (days.has(key)) streak++
    else break
  }
  return streak
}
```

**`getRecentActivityDays(userId, n)`** — returns a `Set<string>` of ISO date strings (YYYY-MM-DD) for the last `n` days that had at least one attempt. Used for the 7-dot activity strip in StudyStreak widget.

```ts
export async function getRecentActivityDays(
  userId: string,
  days: number
): Promise<Set<string>> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('attempts')
    .select('answered_at')
    .eq('user_id', userId)
    .gte('answered_at', since.toISOString())

  return new Set(
    (data ?? []).map(a => new Date(a.answered_at).toISOString().split('T')[0])
  )
}
```

**`computeOverallPct(masteryMap)`** — pure helper (no DB, lives in `src/lib/scoring.ts` or inline):

```ts
export function computeOverallPct(
  map: Map<string, { correct: number; total: number }>
): number {
  let correct = 0, total = 0
  for (const v of map.values()) { correct += v.correct; total += v.total }
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}
```

---

### Dashboard Layout

`src/app/dashboard/page.tsx` renders a 2-column layout within the shell's `<main>`:

```tsx
<div className="flex gap-6 p-6 min-h-full">
  <div className="flex-1 min-w-0 space-y-6">
    <ReadinessHero ... />
    <ActionCards ... />
    <TrainingPlan ... />
  </div>
  <div className="hidden lg:block w-72 flex-shrink-0">
    <TodayRail ... />
  </div>
</div>
```

Right rail is hidden below `lg` (1024px). On mobile/tablet the full page is single-column.

---

### Center: ReadinessHero

Shows the big readiness number + ring + key stats.

```
┌──────────────────────────────────────────────────────┐
│  [Ring]  78%                                         │
│          Private Pilot · ready                       │
│                                                      │
│  Last exam: 52/60 (87%)   FAA min: 70%   Q/answered  │
└──────────────────────────────────────────────────────┘
```

- Uses existing `ReadinessRing` component (`size=96`, `stroke=10`)
- Stats row: `lastExam.score / lastExam.total` formatted as percent; if no exam yet → "No exam taken"
- FAA minimum: hardcoded 70%
- Questions answered: count distinct questions from masteryMap (`Σtotal` values)

### Center: ActionCards

Three cards in a row (`grid grid-cols-1 sm:grid-cols-3 gap-4`):

| Card | Content | Action | Gate |
|------|---------|--------|------|
| Next Action | "Study now" → weakest chapter title | Link to `/study/[focusAreas[0].chapter.slug]` | Free (always) |
| Daily Challenge | Today's question teaser | Opens `DailyChallenge` modal (existing component) | Free (always) |
| Practice Exam | "Full 60-question exam" | Link to `/exam` if Pro; else `/course` + lock icon | Pro only |

Card design: dark slate card (`bg-slate-800 rounded-xl p-5 border border-slate-700`), icon at top, title, subtitle, CTA button.

Pro-gated card (Practice Exam when not Pro):
```tsx
<Link href="/course" className="...">
  <Lock size={12} className="inline mr-1" /> Upgrade to Pro
</Link>
```

### Center: TrainingPlan

Chapter grid — simplified version of the existing chapter cards, adapted for the dark shell:

```
┌─────────────────────────────────────┐
│ Training Plan                       │
│ ┌──────────────────┐ ┌────────────┐ │
│ │ Aerodynamics     │ │ Weather    │ │
│ │ ████████░░  72%  │ │ ███░░░  34%│ │
│ │ [Study] [Quiz]   │ │ [Study]    │ │
│ └──────────────────┘ └────────────┘ │
└─────────────────────────────────────┘
```

Each chapter card in the grid:
- Chapter title + mastery bar (uses existing `MasteryBar` component or inline bar)
- Study link: always shown, links to `/study/[slug]`
- Quiz link: if `hasAccess(tier, 'basic')` → `/quiz/[slug]`; else → `/course` (with lock)

Grid: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`

---

### Right Rail: TodayRail

`src/components/TodayRail.tsx` — server-rendered props, no client state needed.

Header: `"Today · {month} flight plan"` (e.g. "Today · June flight plan")

**Widget 1 — Exam Goal:**
```
Pass the FAA Written
Minimum: 70%    You: 78% ✓
[████████░░] 78%
```
- Static text + `overallPct`
- If `overallPct >= 70` → green "On track ✓"
- Else → amber "Keep going — N% to go"

**Widget 2 — Focus Stack:**
Top 3 weakest chapters from `getFocusAreas(masteryMap, chapters, 3)`.

Each item:
```
  □ Aerodynamics  · 34%
    [Study →]
```
- Chapter name + mastery percent
- Study link (always free)

**Widget 3 — Study Streak:**
```
  🔥 6-day streak
  M  T  W  T  F  S  S
  ●  ●  ●  ○  ●  ●  ●   ← filled = had attempt that day
```
- `streak` number (from `getStudyStreak`)
- 7-dot activity strip (from `getRecentActivityDays`) — `●` = active day, `○` = missed
- If streak === 0: "Start your streak today!"

**Widget 4 — Weak-Area Drill:**
Pro-only. Drill links for focus chapters.

- If `hasAccess(tier, 'pro')`: shows "Drill [chapter]" links to `/quiz/[slug]` for top 3 focus areas
- If not Pro: lock card → "Weak-area drill is a Pro feature" + "Upgrade to Pro →" `/course`

---

## Pro-Gating Strategy

All gating is server-side: `tier` is fetched via `getTier()` in `DashboardPage` and passed down as a prop.

| Feature | Required tier | If insufficient |
|---------|--------------|-----------------|
| Practice Exam (action card) | `pro` | Link → `/course`, lock icon, "Upgrade to Pro" label |
| Quiz links in chapter grid | `basic` | Link → `/course`, lock icon |
| Weak-area drill (right rail) | `pro` | Entire widget replaced with upgrade CTA |
| Study links, daily challenge, focus stack | `free` | Always shown |

Pattern used everywhere:
```tsx
{hasAccess(tier, 'pro') ? (
  <Link href="/exam">Start exam →</Link>
) : (
  <Link href="/course" className="opacity-70">
    <Lock size={12} className="inline mr-1" /> Upgrade to Pro
  </Link>
)}
```

---

## Files Changed / Created

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/app/layout.tsx` | Auth-conditional shell vs NavBar |
| Create | `src/components/FlightDeckShell.tsx` | Shell layout server component |
| Create | `src/components/Sidebar.tsx` | Left nav client component |
| Create | `src/components/BottomTabBar.tsx` | Mobile bottom nav |
| Create | `src/app/dashboard/page.tsx` | Full dashboard page |
| Create | `src/components/TodayRail.tsx` | Right rail (all 4 widgets) |
| Modify | `src/lib/queries.ts` | Add `getStudyStreak`, `getRecentActivityDays` |
| Modify | `src/lib/scoring.ts` | Add `computeOverallPct` pure helper |
| No change | `src/components/NavBar.tsx` | Stays for logged-out pages |
| No change | `src/components/NavDrawer.tsx` | Stays for logged-out pages |
| No change | `src/components/ReadinessRing.tsx` | Reused as-is |
| No change | `src/components/DailyChallenge.tsx` | Reused as-is |
| No change | `src/lib/focusAreas.ts` | Reused as-is |
| No change | `src/lib/entitlement.ts` | Reused as-is |
| No change | All study/exam/quiz/account/progress pages | Unchanged content |

**No new DB migrations required.**

---

## Responsive Behavior

| Breakpoint | Left sidebar | Right rail | Bottom tab |
|-----------|-------------|-----------|------------|
| `< md` (< 768px) | hidden | hidden (stacks below center) | visible, fixed bottom |
| `md–lg` (768–1023px) | visible 240px | hidden | hidden |
| `≥ lg` (≥ 1024px) | visible 240px | visible 280px | hidden |

---

## Design Tokens

| Token | Value |
|-------|-------|
| Shell bg | `bg-slate-950` |
| Sidebar bg | `bg-slate-900` |
| Sidebar border | `border-slate-800` |
| Card bg | `bg-slate-800` |
| Card border | `border-slate-700` |
| Nav active bg/text/border | `bg-sky-500/10` / `text-sky-400` / `border-l-2 border-sky-400` |
| Nav inactive | `text-slate-400` |
| Nav hover | `bg-slate-800 text-slate-200` |
| Readiness ring fill | `#0EA5E9` (sky-500) |
| Streak dot active | `bg-sky-500` |
| Streak dot inactive | `bg-slate-700` |
| Pro lock color | `text-slate-400 opacity-70` |
| Tab bar bg | `bg-slate-900 border-t border-slate-800` |

---

## Success Criteria

1. Logged-in user on any page sees dark left sidebar on desktop; bottom tab bar on mobile.
2. Dashboard right rail is visible on `≥ lg` screens only.
3. Active nav item is highlighted correctly across all routes including nested ones.
4. Sidebar footer shows actual overall readiness % from the user's attempts.
5. Study streak reflects real consecutive days of activity.
6. Pro-gated CTAs (Practice Exam card, Quiz links, Weak-area drill) show lock/upgrade UI for non-Pro users; all redirect to `/course`.
7. Logged-out users see the existing marketing site + NavBar — zero visual change.
8. No TypeScript errors. All existing pages work inside the shell without layout changes.
9. No new DB migrations required.
