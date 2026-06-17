# Web App — Plan 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 5 student-facing screens: chapter grid with mastery, study view with answer-reveal + audio + SVG illustration, quiz mode, progress tracking, and sign in/sign up via Supabase Auth.

**Architecture:** Next.js App Router. Server Components fetch data from Supabase. Interactive parts (answer selection, audio playback, quiz state) are Client Components. Attempt recording uses a Server Action. Auth uses Supabase SSR middleware for session refresh on every request. Styling via Tailwind CSS v3.

**Tech Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v3, Supabase Auth + Postgres (`@supabase/ssr` already installed), React 19 Server Actions, Vitest (existing test harness).

---

## Prerequisites

- Migration 0002 applied to Supabase (adds `source_ref` column + `audio` bucket)
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Plan 2 pipeline has been run (at least 1 question with `published = true` to exercise the study view)

To publish the seed VOT question after the pipeline runs, in the Supabase SQL Editor:
```sql
update question_content set published = true where question_id in (
  select id from questions where source_ref = 'nav-vot-check'
);
```

---

## File Structure

**Routes (App Router):**
- Modify: `src/app/page.tsx` — Chapter grid (home)
- Modify: `src/app/layout.tsx` — Add NavBar + update metadata
- Create: `src/app/study/[chapterSlug]/page.tsx` — Redirects to first published question
- Create: `src/app/study/[chapterSlug]/[questionId]/page.tsx` — Study view server shell
- Create: `src/app/progress/page.tsx` — Per-chapter mastery + weak areas
- Create: `src/app/quiz/[chapterSlug]/page.tsx` — Quiz mode server shell
- Create: `src/app/login/page.tsx` — Sign in
- Create: `src/app/signup/page.tsx` — Sign up
- Create: `src/app/auth/callback/route.ts` — OAuth/magic-link callback

**Middleware:**
- Create: `src/middleware.ts` — Session refresh (runs on every request)

**Components:**
- Create: `src/components/NavBar.tsx` — Server component: reads user, renders links
- Create: `src/components/SignOutButton.tsx` — Client component: calls supabase.auth.signOut()
- Create: `src/components/ChapterCard.tsx` — Chapter card with mastery %
- Create: `src/components/MasteryBar.tsx` — Colored progress bar
- Create: `src/components/StudyView.tsx` — Client component: manages answer/reveal state
- Create: `src/components/QuestionCard.tsx` — Answer option buttons + commit button
- Create: `src/components/AnswerReveal.tsx` — Explanation panel post-commit
- Create: `src/components/AudioPlayer.tsx` — One-tap play/pause audio bar
- Create: `src/components/QuizView.tsx` — Client component: quiz state machine

**Data layer:**
- Create: `src/lib/queries.ts` — Server-side Supabase reads
- Create: `src/lib/actions.ts` — Server Action: recordAttempt
- Modify: `src/lib/supabase/types.ts` — Add `source_ref` field (added by migration 0002)

---

## Task 1: Tailwind CSS + globals + layout + types

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/supabase/types.ts`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
```

- [ ] **Step 2: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 4: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
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

- [ ] **Step 5: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Flying Ace Exams",
  description: "Private pilot FAA written exam prep — master every topic before test day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist)] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Add `source_ref` to `src/lib/supabase/types.ts`**

In the `questions` table `Row` type, add after `content_version: string | null;`:
```ts
source_ref: string | null;
```

In `Insert`, add after `content_version?`:
```ts
source_ref?: string | null;
```

In `Update`, add after `content_version?`:
```ts
source_ref?: string | null;
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: Build completes. Home page still renders the placeholder text. No TypeScript or Tailwind errors.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs src/app/globals.css src/app/layout.tsx src/lib/supabase/types.ts package.json package-lock.json
git commit -m "feat: add Tailwind CSS, update layout and database types"
```

---

## Task 2: Auth middleware + login + signup + callback

Supabase SSR requires a middleware that refreshes the auth session cookie on every request. Without it, server components see a stale/missing session after the access token expires.

**Files:**
- Create: `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session — do not remove this call.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Create `src/app/auth/callback/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 3: Create `src/app/login/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Flying Ace Exams</p>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-sm text-center text-slate-500">
          No account?{" "}
          <Link href="/signup" className="text-sky-600 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create `src/app/signup/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <p className="text-3xl">✉️</p>
          <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
          <p className="text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
          <Link href="/login" className="block text-sm text-sky-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-sm text-slate-500 mt-1">Flying Ace Exams</p>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-center text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/auth src/app/login src/app/signup
git commit -m "feat: add auth middleware, login, signup, and callback route"
```

---

## Task 3: Server-side queries + record-attempt action

Pure data layer — no UI. Every function here is called from Server Components or Server Actions only; they are never imported by Client Components.

**Files:**
- Create: `src/lib/queries.ts`, `src/lib/actions.ts`

- [ ] **Step 1: Create `src/lib/queries.ts`**

```ts
import { createClient } from "./supabase/server";
import type { Database } from "./supabase/types";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionContent = Database["public"]["Tables"]["question_content"]["Row"];
export type AnswerOption = Database["public"]["Tables"]["answer_options"]["Row"];

export async function getChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getPublishedQuestions(chapterId: string): Promise<Question[]> {
  const supabase = await createClient();
  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const publishedIds = (published ?? []).map((r) => r.question_id);
  if (publishedIds.length === 0) return [];
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("chapter_id", chapterId)
    .in("id", publishedIds)
    .order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export async function getQuestion(questionId: string): Promise<{
  question: Question;
  options: AnswerOption[];
  content: QuestionContent;
} | null> {
  const supabase = await createClient();
  const [qRes, optsRes, contentRes] = await Promise.all([
    supabase.from("questions").select("*").eq("id", questionId).maybeSingle(),
    supabase.from("answer_options").select("*").eq("question_id", questionId).order("label"),
    supabase.from("question_content").select("*").eq("question_id", questionId).maybeSingle(),
  ]);
  if (!qRes.data || !contentRes.data) return null;
  return {
    question: qRes.data as Question,
    options: optsRes.data ?? [],
    content: contentRes.data,
  };
}

export async function getUserAllMastery(
  userId: string
): Promise<Map<string, { correct: number; total: number }>> {
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("attempts")
    .select("question_id, is_correct, answered_at, questions!inner(chapter_id)")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });
  const seenQ = new Set<string>();
  const byChapter = new Map<string, { correct: number; total: number }>();
  for (const a of attempts ?? []) {
    if (seenQ.has(a.question_id)) continue;
    seenQ.add(a.question_id);
    const chapterId = (a.questions as { chapter_id: string }).chapter_id;
    if (!byChapter.has(chapterId)) byChapter.set(chapterId, { correct: 0, total: 0 });
    const s = byChapter.get(chapterId)!;
    s.total++;
    if (a.is_correct) s.correct++;
  }
  return byChapter;
}
```

- [ ] **Step 2: Create `src/lib/actions.ts`**

```ts
"use server";

import { createClient } from "./supabase/server";

export async function recordAttempt(
  questionId: string,
  selectedLabel: string,
  isCorrect: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // unauthenticated — skip silently
  await supabase.from("attempts").insert({
    user_id: user.id,
    question_id: questionId,
    selected_label: selectedLabel,
    is_correct: isCorrect,
  });
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts src/lib/actions.ts
git commit -m "feat: add server-side queries and recordAttempt server action"
```

---

## Task 4: NavBar + SignOutButton + wire into layout

**Files:**
- Create: `src/components/NavBar.tsx`, `src/components/SignOutButton.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/SignOutButton.tsx`**

```tsx
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
    >
      Sign out
    </button>
  );
}
```

- [ ] **Step 2: Create `src/components/NavBar.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">✈️</span>
          <span className="font-bold text-slate-900 text-sm tracking-tight">
            Flying Ace Exams
          </span>
        </Link>
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link
                href="/progress"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Progress
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-sky-600 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update `src/app/layout.tsx` to include NavBar**

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Flying Ace Exams",
  description: "Private pilot FAA written exam prep — master every topic before test day.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist)] antialiased bg-slate-50">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: build succeeds. Visit `http://localhost:3000` with `npm run dev` — NavBar appears at top with "Sign in" link when logged out.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar.tsx src/components/SignOutButton.tsx src/app/layout.tsx
git commit -m "feat: add NavBar with auth state and wire into root layout"
```

---

## Task 5: Home page — chapter grid with mastery

**Files:**
- Create: `src/components/MasteryBar.tsx`, `src/components/ChapterCard.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/MasteryBar.tsx`**

```tsx
interface Props {
  percent: number;
  label?: string;
}

export function MasteryBar({ percent, label }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const colorClass =
    clamped >= 80
      ? "bg-green-500"
      : clamped >= 50
      ? "bg-sky-500"
      : "bg-slate-300";

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-slate-400">{label}</p>}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs font-semibold text-slate-700">{clamped}%</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ChapterCard.tsx`**

```tsx
import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import { masteryPercent } from "@/lib/scoring";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  mastery: { correct: number; total: number } | null;
}

export function ChapterCard({ slug, title, description, mastery }: Props) {
  const hasStarted = mastery != null && mastery.total > 0;
  const percent = hasStarted ? masteryPercent(mastery!.correct, mastery!.total) : 0;

  return (
    <Link
      href={`/study/${slug}`}
      className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="font-semibold text-slate-900 text-base leading-snug">{title}</h2>
        {hasStarted && (
          <span
            className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
              percent >= 80
                ? "bg-green-100 text-green-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {percent >= 80 ? "Ready ✓" : "In progress"}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
      )}
      {hasStarted ? (
        <MasteryBar
          percent={percent}
          label={`${mastery!.total} answered`}
        />
      ) : (
        <p className="text-xs text-slate-400 mt-3">Start studying →</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { ChapterCard } from "@/components/ChapterCard";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chapters = await getChapters();
  const masteryMap = user
    ? await getUserAllMastery(user.id)
    : new Map<string, { correct: number; total: number }>();

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const { correct, total } of masteryMap.values()) {
    totalCorrect += correct;
    totalAnswered += total;
  }
  const overallPercent =
    totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Private Pilot Exam Prep</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Master every topic before test day.
        </p>
      </div>

      {user && totalAnswered > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Overall Readiness</p>
            <p className="text-4xl font-bold text-slate-900 mt-0.5">{overallPercent}%</p>
          </div>
          {chapters[0] && (
            <Link
              href={`/study/${chapters[0].slug}`}
              className="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              Continue →
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            slug={chapter.slug}
            title={chapter.title}
            description={chapter.description}
            mastery={masteryMap.get(chapter.id) ?? null}
          />
        ))}
      </div>

      {chapters.length === 0 && (
        <p className="text-center text-slate-400 mt-16 text-sm">
          No chapters yet — run the pipeline to generate content.
        </p>
      )}

      {!user && (
        <p className="text-center text-sm text-slate-400 mt-8">
          <Link href="/login" className="text-sky-600 hover:underline">
            Sign in
          </Link>{" "}
          to save your progress
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: NavBar at top, "Private Pilot Exam Prep" heading, chapter cards in a 2-column grid (or empty state if pipeline hasn't run yet). No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/MasteryBar.tsx src/components/ChapterCard.tsx src/app/page.tsx
git commit -m "feat: home page with chapter grid and per-chapter mastery"
```

---

## Task 6: Study view — server shell + chapter redirect

**Files:**
- Create: `src/app/study/[chapterSlug]/page.tsx`
- Create: `src/app/study/[chapterSlug]/[questionId]/page.tsx`

- [ ] **Step 1: Create `src/app/study/[chapterSlug]/page.tsx`**

This route redirects to the first published question in the chapter. If no questions exist, shows an informative message.

```tsx
import { getChapterBySlug, getPublishedQuestions } from "@/lib/queries";
import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function ChapterRedirectPage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const questions = await getPublishedQuestions(chapter.id);
  if (questions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 text-sm">
          No published questions in this chapter yet.
        </p>
      </main>
    );
  }

  redirect(`/study/${chapterSlug}/${questions[0].id}`);
}
```

- [ ] **Step 2: Create `src/app/study/[chapterSlug]/[questionId]/page.tsx`**

Server component: fetches the question, its options and content, and the ordered question list (for prev/next). Passes data to the `StudyView` client component.

```tsx
import { getChapterBySlug, getPublishedQuestions, getQuestion } from "@/lib/queries";
import { StudyView } from "@/components/StudyView";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string; questionId: string }>;
}

export default async function StudyPage({ params }: Props) {
  const { chapterSlug, questionId } = await params;

  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const [result, questions] = await Promise.all([
    getQuestion(questionId),
    getPublishedQuestions(chapter.id),
  ]);

  if (!result) return notFound();

  const idx = questions.findIndex((q) => q.id === questionId);
  const prevId = idx > 0 ? questions[idx - 1].id : null;
  const nextId = idx < questions.length - 1 ? questions[idx + 1].id : null;

  return (
    <StudyView
      chapterSlug={chapterSlug}
      chapterTitle={chapter.title}
      question={result.question}
      options={result.options}
      content={result.content}
      prevId={prevId}
      nextId={nextId}
      questionNumber={idx + 1}
      totalQuestions={questions.length}
    />
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: TypeScript complains that `StudyView` doesn't exist yet. That's fine — the import will resolve in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/app/study
git commit -m "feat: add study route server shells and chapter redirect"
```

---

## Task 7: QuestionCard + StudyView client component

**Files:**
- Create: `src/components/QuestionCard.tsx`, `src/components/StudyView.tsx`

- [ ] **Step 1: Create `src/components/QuestionCard.tsx`**

```tsx
"use client";
import { useState } from "react";
import { recordAttempt } from "@/lib/actions";
import type { AnswerOption } from "@/lib/queries";

interface Props {
  questionId: string;
  stem: string;
  options: AnswerOption[];
  onReveal: (selectedLabel: string) => void;
}

export function QuestionCard({ questionId, stem, options, onReveal }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCommit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const correctOption = options.find((o) => o.is_correct);
    const isCorrect = selected === correctOption?.label;
    await recordAttempt(questionId, selected, isCorrect);
    onReveal(selected);
  };

  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-slate-900 leading-relaxed">{stem}</p>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => !submitting && setSelected(option.label)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
              selected === option.label
                ? "border-sky-500 bg-sky-50 text-sky-900 font-medium"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-bold mr-1">{option.label}.</span>
            {option.text}
          </button>
        ))}
      </div>
      <button
        onClick={handleCommit}
        disabled={!selected || submitting}
        className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-sky-700 transition-colors"
      >
        Check Answer
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/StudyView.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { QuestionCard } from "./QuestionCard";
import { AnswerReveal } from "./AnswerReveal";
import { AudioPlayer } from "./AudioPlayer";
import type { Question, QuestionContent, AnswerOption } from "@/lib/queries";

interface Props {
  chapterSlug: string;
  chapterTitle: string;
  question: Question;
  options: AnswerOption[];
  content: QuestionContent;
  prevId: string | null;
  nextId: string | null;
  questionNumber: number;
  totalQuestions: number;
}

export function StudyView({
  chapterSlug,
  chapterTitle,
  question,
  options,
  content,
  prevId,
  nextId,
  questionNumber,
  totalQuestions,
}: Props) {
  const [revealedLabel, setRevealedLabel] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-700 transition-colors">
            ← Chapters
          </Link>
          <span>
            {chapterTitle} · {questionNumber} / {totalQuestions}
          </span>
          <span className="w-20 text-right" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {revealedLabel === null ? (
          <QuestionCard
            questionId={question.id}
            stem={question.stem}
            options={options}
            onReveal={setRevealedLabel}
          />
        ) : (
          <>
            {content.audio_url && <AudioPlayer src={content.audio_url} />}
            <AnswerReveal
              selectedLabel={revealedLabel}
              options={options}
              content={content}
            />
          </>
        )}

        {/* Prev / Next navigation — shown after answer is revealed */}
        {revealedLabel !== null && (
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            {prevId ? (
              <Link
                href={`/study/${chapterSlug}/${prevId}`}
                className="flex-1 text-center py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-white transition-colors"
              >
                ← Previous
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextId ? (
              <Link
                href={`/study/${chapterSlug}/${nextId}`}
                className="flex-1 text-center py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
              >
                Next →
              </Link>
            ) : (
              <Link
                href="/"
                className="flex-1 text-center py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Chapter complete ✓
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Run typecheck**

TypeScript will complain about missing `AnswerReveal` and `AudioPlayer` imports — those come in Task 8. Verify there are no other errors:

```bash
npx tsc --noEmit 2>&1 | grep -v "AnswerReveal\|AudioPlayer"
```

Expected: no other errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/QuestionCard.tsx src/components/StudyView.tsx
git commit -m "feat: add QuestionCard and StudyView client components"
```

---

## Task 8: AnswerReveal + AudioPlayer

**Files:**
- Create: `src/components/AnswerReveal.tsx`, `src/components/AudioPlayer.tsx`

- [ ] **Step 1: Create `src/components/AudioPlayer.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";

interface Props {
  src: string;
}

export function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200">
      <button
        onClick={toggle}
        className="flex-shrink-0 w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center hover:bg-sky-700 transition-colors text-sm"
        aria-label={playing ? "Pause narration" : "Play narration"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div>
        <p className="text-xs font-semibold text-slate-600">Audio Explanation</p>
        <p className="text-xs text-slate-400">{playing ? "Playing…" : "Tap to play"}</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/AnswerReveal.tsx`**

```tsx
import type { AnswerOption, QuestionContent } from "@/lib/queries";

interface Props {
  selectedLabel: string;
  options: AnswerOption[];
  content: QuestionContent;
}

export function AnswerReveal({ selectedLabel, options, content }: Props) {
  const correctOption = options.find((o) => o.is_correct)!;
  const isCorrect = selectedLabel === correctOption.label;

  return (
    <div className="space-y-6">
      {/* Result banner */}
      <div
        className={`px-4 py-3 rounded-xl font-semibold text-sm border ${
          isCorrect
            ? "bg-green-50 text-green-800 border-green-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}
      >
        {isCorrect
          ? "✓ Correct!"
          : `✗ Incorrect — the correct answer is ${correctOption.label}`}
      </div>

      {/* SVG illustration */}
      {content.illustration_svg && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 overflow-hidden">
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: content.illustration_svg }}
          />
        </div>
      )}

      {/* Concept */}
      {content.concept_tested && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">
            Concept
          </p>
          <p className="text-sm text-slate-800">{content.concept_tested}</p>
        </div>
      )}

      {/* Why correct */}
      {content.explanation && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Why it's correct
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{content.explanation}</p>
        </div>
      )}

      {/* Why each option */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Why each answer
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.label}
              className={`px-4 py-3 rounded-xl text-sm border ${
                option.is_correct
                  ? "bg-green-50 border-green-100"
                  : option.label === selectedLabel
                  ? "bg-red-50 border-red-100"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <span
                className={`font-bold ${
                  option.is_correct ? "text-green-700" : "text-slate-600"
                }`}
              >
                {option.label}.{" "}
              </span>
              <span className="text-slate-700">{option.why ?? option.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key takeaway */}
      {content.key_takeaway && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Key Takeaway
          </p>
          <p className="text-sm text-slate-800 font-medium">{content.key_takeaway}</p>
        </div>
      )}

      {/* Citation */}
      {content.source_citation && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
          <span className="font-semibold text-slate-500">Reference: </span>
          {content.source_citation}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: build succeeds with no errors. All missing-component TypeScript errors from Tasks 6–7 are now resolved.

- [ ] **Step 4: Smoke test the study flow**

```bash
npm run dev
```

1. Open `http://localhost:3000` — chapter grid loads.
2. Click a chapter — redirects to first question.
3. Select an answer option — it highlights.
4. Click "Check Answer" — answer reveals, AnswerReveal panel appears.
5. If audio is published, the AudioPlayer bar appears above the reveal.
6. Click "Next →" — navigates to next question (or back to home if last).

Expected: all steps work without console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnswerReveal.tsx src/components/AudioPlayer.tsx
git commit -m "feat: add AnswerReveal panel and AudioPlayer component"
```

---

## Task 9: Progress page

Shows per-chapter mastery bars, flags weak areas (< 70%), and links to the lowest-scoring chapter.

**Files:**
- Create: `src/app/progress/page.tsx`

- [ ] **Step 1: Create `src/app/progress/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { MasteryBar } from "@/components/MasteryBar";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/progress");

  const [chapters, masteryMap] = await Promise.all([
    getChapters(),
    getUserAllMastery(user.id),
  ]);

  const rows = chapters.map((chapter) => {
    const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
    return {
      ...chapter,
      correct: m.correct,
      total: m.total,
      percent: m.total > 0 ? masteryPercent(m.correct, m.total) : 0,
      started: m.total > 0,
    };
  });

  const weakAreas = rows
    .filter((r) => r.started && r.percent < 70)
    .sort((a, b) => a.percent - b.percent);

  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const totalAnswered = rows.reduce((s, r) => s + r.total, 0);
  const overall = totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
        <p className="text-slate-400 text-sm mt-1">
          Overall readiness:{" "}
          <span className="font-semibold text-slate-700">{overall}%</span>
          {totalAnswered > 0 && (
            <> · {totalCorrect} of {totalAnswered} correct</>
          )}
        </p>
      </div>

      {weakAreas.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Focus areas</p>
          {weakAreas.map((r) => (
            <Link
              key={r.id}
              href={`/study/${r.slug}`}
              className="flex items-center justify-between text-sm text-amber-700 hover:text-amber-900 py-0.5"
            >
              <span>{r.title}</span>
              <span className="font-bold">{r.percent}% →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Link
                href={`/study/${row.slug}`}
                className="font-semibold text-slate-800 text-sm hover:text-sky-600 transition-colors"
              >
                {row.title}
              </Link>
              {!row.started && (
                <span className="text-xs text-slate-400">Not started</span>
              )}
            </div>
            {row.started && (
              <MasteryBar
                percent={row.percent}
                label={`${row.correct} / ${row.total} correct`}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

- Logged out: `/progress` redirects to `/login?next=/progress`.
- After signing in, redirected back to `/progress`. Chapter mastery bars appear for any answered questions.

- [ ] **Step 4: Commit**

```bash
git add src/app/progress
git commit -m "feat: add progress page with per-chapter mastery and weak area highlights"
```

---

## Task 10: Quiz mode

A scored run through all questions in a chapter, one at a time, in the order they appear. No timer for v1. Results screen shows score and links to questions answered incorrectly.

**Files:**
- Create: `src/app/quiz/[chapterSlug]/page.tsx`, `src/components/QuizView.tsx`

- [ ] **Step 1: Create `src/components/QuizView.tsx`**

```tsx
"use client";
import { useState } from "react";
import { recordAttempt } from "@/lib/actions";
import Link from "next/link";
import type { Question, AnswerOption, QuestionContent } from "@/lib/queries";

interface QuizQuestion {
  question: Question;
  options: AnswerOption[];
  content: QuestionContent;
}

interface Props {
  chapterSlug: string;
  chapterTitle: string;
  items: QuizQuestion[];
}

type Phase = "answering" | "results";

interface Answer {
  questionId: string;
  selectedLabel: string;
  isCorrect: boolean;
}

export function QuizView({ chapterSlug, chapterTitle, items }: Props) {
  const [phase, setPhase] = useState<Phase>("answering");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const current = items[index];
  const correctOption = current?.options.find((o) => o.is_correct);

  const handleCommit = async () => {
    if (!selected || revealed || !current || !correctOption) return;
    const isCorrect = selected === correctOption.label;
    await recordAttempt(current.question.id, selected, isCorrect);
    setAnswers((prev) => [
      ...prev,
      { questionId: current.question.id, selectedLabel: selected, isCorrect },
    ]);
    setRevealed(true);
  };

  const handleNext = () => {
    if (index < items.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setPhase("results");
    }
  };

  if (phase === "results") {
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = answers.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const wrong = answers.filter((a) => !a.isCorrect);

    return (
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-5xl font-bold text-slate-900">{percent}%</p>
          <p className="text-slate-500 text-sm">
            {correct} of {total} correct — {chapterTitle}
          </p>
        </div>

        {wrong.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Review these ({wrong.length})
            </p>
            {wrong.map((a) => {
              const item = items.find((i) => i.question.id === a.questionId)!;
              return (
                <Link
                  key={a.questionId}
                  href={`/study/${chapterSlug}/${a.questionId}`}
                  className="block bg-white border border-red-100 rounded-xl px-4 py-3 text-sm text-slate-700 hover:border-red-300 transition-colors"
                >
                  {item.question.stem}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/quiz/${chapterSlug}`}
            className="flex-1 text-center py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-white transition-colors"
          >
            Retry
          </Link>
          <Link
            href="/"
            className="flex-1 text-center py-3 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            Back to chapters
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{chapterTitle} Quiz</span>
        <span>
          {index + 1} / {items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 rounded-full transition-all"
          style={{ width: `${((index + (revealed ? 1 : 0)) / items.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-lg font-medium text-slate-900 leading-relaxed">
        {current.question.stem}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {current.options.map((option) => {
          let cls =
            "w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm";
          if (!revealed) {
            cls +=
              selected === option.label
                ? " border-sky-500 bg-sky-50 text-sky-900 font-medium"
                : " border-slate-200 bg-white text-slate-700 hover:border-slate-300";
          } else {
            if (option.is_correct) {
              cls += " border-green-400 bg-green-50 text-green-900 font-medium";
            } else if (option.label === selected) {
              cls += " border-red-300 bg-red-50 text-red-800";
            } else {
              cls += " border-slate-100 bg-white text-slate-400";
            }
          }
          return (
            <button
              key={option.label}
              onClick={() => !revealed && setSelected(option.label)}
              className={cls}
              disabled={revealed}
            >
              <span className="font-bold mr-1">{option.label}.</span>
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Why text (shown after reveal) */}
      {revealed && selected && (
        <div
          className={`px-4 py-3 rounded-xl text-sm border ${
            selected === correctOption?.label
              ? "bg-green-50 border-green-100 text-green-800"
              : "bg-red-50 border-red-100 text-red-800"
          }`}
        >
          {current.options.find((o) => o.label === selected)?.why ??
            (selected === correctOption?.label ? "Correct!" : `Correct answer: ${correctOption?.label}`)}
        </div>
      )}

      {/* Action button */}
      {!revealed ? (
        <button
          onClick={handleCommit}
          disabled={!selected}
          className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-sky-700 transition-colors"
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
        >
          {index < items.length - 1 ? "Next Question →" : "See Results"}
        </button>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/quiz/[chapterSlug]/page.tsx`**

```tsx
import { getChapterBySlug, getPublishedQuestions, getQuestion } from "@/lib/queries";
import { QuizView } from "@/components/QuizView";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function QuizPage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const questions = await getPublishedQuestions(chapter.id);
  if (questions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-400 text-sm">No published questions in this chapter yet.</p>
      </main>
    );
  }

  // Fetch full question data (options + content) for every question in parallel
  const items = (
    await Promise.all(questions.map((q) => getQuestion(q.id)))
  ).filter(Boolean) as Awaited<ReturnType<typeof getQuestion>>[];

  return (
    <QuizView
      chapterSlug={chapterSlug}
      chapterTitle={chapter.title}
      items={items}
    />
  );
}
```

- [ ] **Step 3: Add a "Quiz" button to ChapterCard**

Open `src/components/ChapterCard.tsx` and update the return to include a quiz link. Replace the existing return value with:

```tsx
return (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all">
    <div className="flex items-start justify-between gap-2 mb-2">
      <h2 className="font-semibold text-slate-900 text-base leading-snug">{title}</h2>
      {hasStarted && (
        <span
          className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
            percent >= 80
              ? "bg-green-100 text-green-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {percent >= 80 ? "Ready ✓" : "In progress"}
        </span>
      )}
    </div>
    {description && (
      <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
    )}
    {hasStarted ? (
      <MasteryBar percent={percent} label={`${mastery!.total} answered`} />
    ) : (
      <p className="text-xs text-slate-400 mt-3">Not started</p>
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
);
```

Also remove the outer `<Link>` wrapper — the card now contains its own links and should be a `<div>` (already shown above). Remove the `import Link from "next/link"` that was used for the card wrapper; add it back if it's gone. The final full file is:

```tsx
import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import { masteryPercent } from "@/lib/scoring";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  mastery: { correct: number; total: number } | null;
}

export function ChapterCard({ slug, title, description, mastery }: Props) {
  const hasStarted = mastery != null && mastery.total > 0;
  const percent = hasStarted ? masteryPercent(mastery!.correct, mastery!.total) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="font-semibold text-slate-900 text-base leading-snug">{title}</h2>
        {hasStarted && (
          <span
            className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
              percent >= 80
                ? "bg-green-100 text-green-700"
                : "bg-sky-50 text-sky-700"
            }`}
          >
            {percent >= 80 ? "Ready ✓" : "In progress"}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
      )}
      {hasStarted ? (
        <MasteryBar percent={percent} label={`${mastery!.total} answered`} />
      ) : (
        <p className="text-xs text-slate-400 mt-3">Not started</p>
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
  );
}
```

- [ ] **Step 4: Run build + full smoke test**

```bash
npm run build
```

Expected: build succeeds, no errors.

```bash
npm run dev
```

Full smoke test:
1. Home (`/`) — chapter grid with Study/Quiz buttons.
2. Click **Study** → first question loads, answer + reveal works, Next navigates.
3. Click **Quiz** from home → quiz runs question-by-question, results screen shows score.
4. Click a wrong-answer link from results → lands on study view for that question.
5. `/progress` (logged in) — shows mastery bars updated by the answers recorded.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuizView.tsx src/app/quiz src/components/ChapterCard.tsx
git commit -m "feat: add quiz mode with per-chapter scored run and results screen"
```

---

## Task 11: Push, merge, and deploy

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all existing unit tests (scoring, version, schema, mapping, illustrate) pass. No new unit tests are added for this plan — the UI is verified by the browser smoke test in Task 10.

- [ ] **Step 2: Final typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Push feature branch**

```bash
git push -u origin feature/generation-pipeline
```

- [ ] **Step 4: Merge to main**

```bash
git checkout main
git merge feature/generation-pipeline
git push origin main
```

Expected: Vercel detects the push to `main` and builds automatically. The build uses the same Next.js project — no new environment variables needed (all secrets are in Vercel's Environment Variables panel, matching `.env.local`).

- [ ] **Step 5: Verify production**

Open `https://flyingaceexams.com`. Expected:
- NavBar with Flying Ace Exams logo
- Chapter grid (empty state if pipeline hasn't been run yet; published chapters if it has)
- Sign in / Sign up at `/login` and `/signup`
- Study flow and quiz mode reachable once chapters are populated

---

## Self-Review

**Spec coverage:**
- Screen 1 (Home/chapters + mastery + exam readiness) → Tasks 5, 4
- Screen 2 (Study view: answer → reveal → explanation, illustration, audio) → Tasks 6, 7, 8
- Screen 3 (Quiz mode: scored run, results) → Task 10
- Screen 4 (Progress: per-chapter mastery bars, weak areas) → Task 9
- Screen 5 (Sign in / Sign up) → Task 2
- Auth middleware (session refresh, RLS honoring) → Task 2, `src/middleware.ts`
- Attempt recording → Task 3, `recordAttempt` server action
- Fallback for no audio: `AudioPlayer` only renders when `content.audio_url` is present; browser's native `<audio>` error handling applies — no broken UI

**Placeholder scan:** No TBDs, no "similar to Task N" shortcuts, no steps without code.

**Type consistency:**
- `Chapter`, `Question`, `QuestionContent`, `AnswerOption` defined once in `src/lib/queries.ts` and imported by all components
- `StudyView` props use those exact types — no re-definitions
- `QuizQuestion` interface in `QuizView.tsx` wraps the three query types
- `recordAttempt` signature is `(questionId: string, selectedLabel: string, isCorrect: boolean): Promise<void>` — called identically in `QuestionCard.tsx` and `QuizView.tsx`
- `masteryPercent(correct, total)` from `src/lib/scoring.ts` — used in `ChapterCard.tsx` and `src/app/progress/page.tsx`
