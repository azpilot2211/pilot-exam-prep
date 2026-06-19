# Flight Deck Phase A: App Shell — Design Spec

**Goal:** Replace the top NavBar on every authenticated page with a persistent dark left sidebar, matching the Flight Deck mockup exactly. Logged-out/marketing pages keep the existing NavBar unchanged.

**Scope:** Shell layout only. Dashboard content lives in Phase B; real tracking data (streak, momentum, session) in Phase C.

---

## Overview

The logged-in experience transforms from a top-nav app into a full-screen cockpit shell:

```
┌────────────────────────────────────────────────────┐
│  Sidebar (240px, slate-900)  │  main (flex-1)       │
│                              │                       │
│  ✈️  Flight Deck             │  {page content}       │
│                              │                       │
│  ⬜  Flight Deck  ←active    │  (chapter grid,       │
│  □   Study Plan              │   exam, study view,   │
│  □   Practice Exam           │   account, etc.)      │
│  □   Audio Course            │                       │
│  □   Progress                │                       │
│  □   Account                 │                       │
│                              │                       │
│  ─────────────────────────   │                       │
│  Current course               │                       │
│  Private Pilot  78%          │                       │
│  ████████░░░░ readiness      │                       │
└────────────────────────────────────────────────────┘
```

On mobile the sidebar is hidden and a bottom tab bar takes over.

---

## Architecture

**Root layout becomes auth-aware.** `src/app/layout.tsx` is a server component and can call `createClient()` to get the session. If authenticated → render `FlightDeckShell`; if not → render the existing `NavBar` wrapper.

No page files move. All existing routes (`/`, `/exam`, `/study/[chapterSlug]`, `/quiz/[chapterSlug]`, `/progress`, `/account`, `/downloads`, `/course`) stay at their current paths. The shell is a transparent frame dropped around the page tree.

---

## New Route

| Route | Purpose |
|-------|---------|
| `/dashboard` | Flight Deck landing page — placeholder card in Phase A; full build in Phase B |

Sidebar "Flight Deck" logo links here. This is the first thing logged-in users see after the shell ships. The placeholder shows a brief "Flight Deck — full dashboard coming soon" message so the route is not a 404.

---

## Component Inventory

### `src/components/FlightDeckShell.tsx` — Server Component

Reads auth and profile server-side. Computes overall readiness for sidebar footer. Renders the full-screen frame:

```
<div className="flex h-screen overflow-hidden bg-slate-950">
  <Sidebar ... />            {/* desktop only, md:flex hidden */}
  <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
    {children}
  </main>
  <BottomTabBar />           {/* mobile only, md:hidden */}
</div>
```

**Data fetched here (server-side, once per request):**
- `supabase.auth.getUser()` → userId, email
- `getProfile(userId)` → display_name, avatar_color
- `getUserAllMastery(userId)` → compute `overallPct = Σcorrect / Σtotal` (0–100, integer)

Passes `{ email, displayName, avatarColor, overallPct }` down to Sidebar as props.

### `src/components/Sidebar.tsx` — Client Component

Needs `usePathname()` for active-item highlighting. Receives user props from shell.

**Structure:**

```
<nav className="hidden md:flex flex-col w-60 h-full bg-slate-900 border-r border-slate-800">
  {/* Logo */}
  <div className="px-5 py-5">
    <span>✈️ Flight Deck</span>   {/* white bold */}
  </div>

  {/* Nav items */}
  <ul className="flex-1 px-3 space-y-1">
    {NAV_ITEMS.map(item => <SidebarItem ... />)}
  </ul>

  {/* Footer */}
  <div className="px-4 py-4 border-t border-slate-800">
    <Avatar ... />
    <div className="text-xs text-slate-500 mt-2">Current course</div>
    <div className="text-sm text-slate-300 font-medium">Private Pilot</div>
    <ReadinessBar pct={overallPct} />
  </div>
</nav>
```

**Nav items:**

| Label | Icon (lucide-react) | Route |
|-------|---------------------|-------|
| Flight Deck | `LayoutDashboard` | `/dashboard` |
| Study Plan | `BookOpen` | `/` |
| Practice Exam | `ClipboardList` | `/exam` |
| Audio Course | `Headphones` | `/downloads` |
| Progress | `TrendingUp` | `/progress` |
| Account | `User` | `/account` |

**Active state** (when `pathname === item.href` or `pathname.startsWith(item.href)` for nested routes like `/study/*`):
- Background: `bg-sky-500/10`
- Text: `text-sky-400`
- Left border: `border-l-2 border-sky-400`

**Inactive state:**
- Text: `text-slate-400`
- Hover: `bg-slate-800 text-slate-200`

**SidebarItem** is a small sub-component (`<Link>` + icon + label) to keep Sidebar clean.

**ReadinessBar** is a small inline component: a slim progress bar (`h-1.5 rounded-full bg-slate-700`) with a sky fill. Shows percentage label alongside.

### `src/components/BottomTabBar.tsx` — Client Component

Mobile-only (`md:hidden`). Fixed to bottom of viewport. 5 tabs: a subset of the sidebar nav items.

```
<nav className="fixed bottom-0 inset-x-0 md:hidden bg-slate-900 border-t border-slate-800 z-50">
  <div className="flex">
    {TAB_ITEMS.map(tab => <TabItem ... />)}
  </div>
</nav>
```

**Tab items** (icon + short label, stacked vertically):

| Label | Icon | Route |
|-------|------|-------|
| Home | `LayoutDashboard` | `/dashboard` |
| Study | `BookOpen` | `/` |
| Exam | `ClipboardList` | `/exam` |
| Audio | `Headphones` | `/downloads` |
| Account | `User` | `/account` |

(Progress is omitted from the tab bar — five tabs is the comfortable maximum; Progress is reachable via Account or the sidebar on tablet+.)

**Active tab:** icon + label in `text-sky-400`. Inactive: `text-slate-500`.

---

## Root Layout Changes

**`src/app/layout.tsx`** — currently unconditionally renders `<NavBar />`. Replace with auth-conditional logic:

```tsx
import { createClient } from "@/lib/supabase/server";
import { FlightDeckShell } from "@/components/FlightDeckShell";
import { NavBar } from "@/components/NavBar";

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

`NavBar` and `NavDrawer` are unchanged — they remain for logged-out/marketing pages.

---

## Dashboard Placeholder

**`src/app/dashboard/page.tsx`** — simple server component, no data fetching needed in Phase A:

```tsx
export default function DashboardPage() {
  return (
    <div className="flex items-center justify-center min-h-screen text-slate-400">
      <div className="text-center">
        <p className="text-4xl mb-3">✈️</p>
        <h1 className="text-xl font-semibold text-slate-200">Flight Deck</h1>
        <p className="text-sm mt-1">Your cockpit dashboard is coming soon.</p>
      </div>
    </div>
  );
}
```

---

## Design Tokens

Sourced from the mockup:

| Token | Value |
|-------|-------|
| Sidebar bg | `bg-slate-900` |
| Sidebar border | `border-slate-800` |
| Body bg (shell) | `bg-slate-950` |
| Logo text | `text-white font-bold` |
| Nav inactive text | `text-slate-400` |
| Nav active bg | `bg-sky-500/10` |
| Nav active text | `text-sky-400` |
| Nav active border | `border-l-2 border-sky-400` |
| Nav hover bg | `bg-slate-800` |
| Footer text | `text-slate-500` / `text-slate-300` |
| Readiness bar bg | `bg-slate-700` |
| Readiness bar fill | `bg-sky-500` |
| Bottom tab bar bg | `bg-slate-900 border-t border-slate-800` |

---

## Responsive Behavior

| Breakpoint | Sidebar | Bottom Tab Bar | Main area padding |
|-----------|---------|----------------|-------------------|
| `< md` (< 768px) | `hidden` | `fixed bottom-0, visible` | `pb-16` (clears tab bar) |
| `≥ md` (≥ 768px) | `flex w-60` | `hidden` | `pb-0` |

No horizontal scrolling. The shell uses `overflow-hidden` on the outer container; `main` is the only scroll surface.

---

## Files Changed / Created

| Action | File |
|--------|------|
| Modify | `src/app/layout.tsx` |
| Create | `src/components/FlightDeckShell.tsx` |
| Create | `src/components/Sidebar.tsx` |
| Create | `src/components/BottomTabBar.tsx` |
| Create | `src/app/dashboard/page.tsx` |
| No change | `src/components/NavBar.tsx` |
| No change | `src/components/NavDrawer.tsx` |
| No change | All existing page files |

---

## What This Does NOT Include

- Flight Deck dashboard content (readiness hero, training plan grid, action cards) → Phase B
- Study streak, momentum trend, avg session, quiz-resume state → Phase C
- Any new DB tables or migrations
- Changes to existing page content (study view, quiz, exam, progress, account)

---

## Success Criteria

1. A logged-in user on any page sees the dark sidebar on desktop and bottom tab bar on mobile.
2. Active route is correctly highlighted in the sidebar/tab bar.
3. The sidebar footer shows the user's actual overall readiness percentage.
4. A logged-out user sees the existing marketing site with NavBar — no visual change.
5. Navigating to `/dashboard` shows the placeholder (not a 404).
6. No TypeScript errors, no broken existing pages.
