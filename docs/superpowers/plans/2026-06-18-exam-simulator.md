# Exam Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a timed 60-question FAA exam simulator (Pro) and a free 10-question demo, backed by a new `exam_results` table, with a readiness landing page and a go-live flip that links `/course` in the nav.

**Architecture:** Pure sampling/scoring functions in `examUtils.ts` (no server deps, fully testable); server queries + action wired in `queries.ts` / `actions.ts`; client `ExamRunner` component orchestrates the timed exam; route pages are server components that fetch questions and pass them to thin client wrappers.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + RLS), Tailwind CSS v4, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/0004_exam_results.sql` | exam_results table + RLS |
| Create | `src/lib/examUtils.ts` | Types + buildExam, buildDemoExam, examScore (pure) |
| Create | `src/lib/examUtils.test.ts` | Unit tests for all pure functions |
| Modify | `src/lib/queries.ts` | Add getQuestionsForExam, getLastExamResult |
| Modify | `src/lib/actions.ts` | Add saveExamResult server action |
| Create | `src/components/ExamCountdown.tsx` | Live HH:MM:SS countdown, fires onExpire |
| Create | `src/components/ExamResults.tsx` | Score card, chapter breakdown, missed questions |
| Create | `src/components/ExamRunner.tsx` | Timed exam UX (answers, flags, nav, submit) |
| Create | `src/app/exam/page.tsx` | Pro-gated readiness landing (last score + start CTA) |
| Create | `src/app/exam/take/page.tsx` | Pro-gated server page → ExamTakeClient |
| Create | `src/app/exam/take/ExamTakeClient.tsx` | Client: taking → saving → results phases |
| Create | `src/app/exam/demo/page.tsx` | Auth-gated server page → DemoExamClient |
| Create | `src/app/exam/demo/DemoExamClient.tsx` | Client: untimed 10-Q exam + upgrade CTA |
| Modify | `src/components/NavDrawer.tsx` | Add "Exam" link for logged-in users |
| Modify | `src/app/page.tsx` | Hero: add "Try demo exam" + "Get the course" CTAs |

---

## Task 1: DB Migration — exam_results table

**Files:**
- Create: `supabase/migrations/0004_exam_results.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/0004_exam_results.sql
create table if not exists exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,
  total int not null,
  taken_at timestamptz not null default now(),
  breakdown jsonb not null default '{}'
);

alter table exam_results enable row level security;

create policy "users manage own exam results"
  on exam_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run the migration in Supabase SQL Editor**

Open Supabase dashboard → SQL Editor, paste the file contents above, and run.
Expected: no errors; table `exam_results` visible in Table Editor.

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/0004_exam_results.sql
git commit -m "feat: add exam_results table with RLS"
```

---

## Task 2: Pure functions + tests (TDD)

**Files:**
- Create: `src/lib/examUtils.ts`
- Create: `src/lib/examUtils.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `src/lib/examUtils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildExam, buildDemoExam, examScore } from "./examUtils";
import type { ExamQuestion } from "./examUtils";

function makeQuestions(chapters: { slug: string; count: number }[]): ExamQuestion[] {
  const result: ExamQuestion[] = [];
  for (const { slug, count } of chapters) {
    for (let i = 0; i < count; i++) {
      result.push({
        id: `${slug}-${i}`,
        stem: `Q${i} about ${slug}`,
        chapterSlug: slug,
        chapterTitle: slug,
        options: [
          { label: "A", text: "Option A", is_correct: true, why: null },
          { label: "B", text: "Option B", is_correct: false, why: null },
          { label: "C", text: "Option C", is_correct: false, why: null },
          { label: "D", text: "Option D", is_correct: false, why: null },
        ],
      });
    }
  }
  return result;
}

const FULL_BANK = makeQuestions([
  { slug: "weather", count: 22 },
  { slug: "regulations", count: 19 },
  { slug: "navigation", count: 18 },
  { slug: "aerodynamics", count: 18 },
  { slug: "aircraft-systems", count: 18 },
  { slug: "airspace", count: 17 },
  { slug: "airport-operations", count: 16 },
  { slug: "weight-and-balance", count: 15 },
  { slug: "performance", count: 15 },
  { slug: "emergency-procedures", count: 14 },
  { slug: "preflight-planning", count: 14 },
  { slug: "night-operations", count: 11 },
]);

describe("buildExam", () => {
  it("returns exactly 60 questions", () => {
    expect(buildExam(FULL_BANK, 60)).toHaveLength(60);
  });

  it("returns no duplicate question ids", () => {
    const exam = buildExam(FULL_BANK, 60);
    expect(new Set(exam.map((q) => q.id)).size).toBe(60);
  });

  it("does not draw more from a chapter than it has", () => {
    const small = makeQuestions([
      { slug: "tiny", count: 3 },
      { slug: "big", count: 100 },
    ]);
    const exam = buildExam(small, 60);
    expect(exam.filter((q) => q.chapterSlug === "tiny").length).toBeLessThanOrEqual(3);
  });
});

describe("buildDemoExam", () => {
  it("returns exactly 10 questions", () => {
    expect(buildDemoExam(FULL_BANK, 10)).toHaveLength(10);
  });

  it("returns no duplicates", () => {
    const demo = buildDemoExam(FULL_BANK, 10);
    expect(new Set(demo.map((q) => q.id)).size).toBe(10);
  });
});

describe("examScore", () => {
  const tenQs = makeQuestions([{ slug: "weather", count: 10 }]);

  it("100% when all correct", () => {
    const answers = new Map(tenQs.map((q) => [q.id, "A"]));
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(10);
    expect(r.percent).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("0% when all wrong", () => {
    const answers = new Map(tenQs.map((q) => [q.id, "B"]));
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("passes at exactly 70%", () => {
    const answers = new Map<string, string>();
    tenQs.slice(0, 7).forEach((q) => answers.set(q.id, "A"));
    tenQs.slice(7).forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, tenQs);
    expect(r.percent).toBe(70);
    expect(r.passed).toBe(true);
  });

  it("fails at 69%", () => {
    const hundredQs = makeQuestions([{ slug: "weather", count: 100 }]);
    const answers = new Map<string, string>();
    hundredQs.slice(0, 69).forEach((q) => answers.set(q.id, "A"));
    hundredQs.slice(69).forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, hundredQs);
    expect(r.percent).toBe(69);
    expect(r.passed).toBe(false);
  });

  it("builds correct per-chapter breakdown", () => {
    const mixed = makeQuestions([
      { slug: "weather", count: 3 },
      { slug: "regulations", count: 2 },
    ]);
    // answer all weather correct, all regulations wrong
    const answers = new Map<string, string>();
    mixed.filter((q) => q.chapterSlug === "weather").forEach((q) => answers.set(q.id, "A"));
    mixed.filter((q) => q.chapterSlug === "regulations").forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, mixed);
    expect(r.breakdown["weather"]).toEqual({ correct: 3, total: 3 });
    expect(r.breakdown["regulations"]).toEqual({ correct: 0, total: 2 });
  });

  it("unanswered questions count as wrong", () => {
    const answers = new Map<string, string>(); // empty — nothing answered
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(0);
    expect(r.total).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/examUtils.test.ts
```
Expected: FAIL with "Cannot find module './examUtils'"

- [ ] **Step 3: Implement examUtils.ts**

Create `src/lib/examUtils.ts`:

```ts
export interface ExamOption {
  label: string;
  text: string;
  is_correct: boolean;
  why: string | null;
}

export interface ExamQuestion {
  id: string;
  stem: string;
  chapterSlug: string;
  chapterTitle: string;
  options: ExamOption[];
}

export interface ExamScoreResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  breakdown: Record<string, { correct: number; total: number }>;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function buildExam(questions: ExamQuestion[], target = 60): ExamQuestion[] {
  const byChapter = new Map<string, ExamQuestion[]>();
  for (const q of questions) {
    if (!byChapter.has(q.chapterSlug)) byChapter.set(q.chapterSlug, []);
    byChapter.get(q.chapterSlug)!.push(q);
  }

  const total = questions.length;
  const chapters = [...byChapter.keys()];

  // Largest-remainder proportional allocation
  const allocs = chapters.map((slug) => {
    const raw = (byChapter.get(slug)!.length / total) * target;
    return { slug, floor: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });

  const assigned = allocs.reduce((s, a) => s + a.floor, 0);
  const extra = target - assigned;
  allocs.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < extra; i++) allocs[i].floor++;

  const result: ExamQuestion[] = [];
  for (const { slug, floor } of allocs) {
    const pool = [...byChapter.get(slug)!];
    shuffle(pool);
    result.push(...pool.slice(0, Math.min(floor, pool.length)));
  }

  shuffle(result);
  return result;
}

export function buildDemoExam(questions: ExamQuestion[], target = 10): ExamQuestion[] {
  const pool = [...questions];
  shuffle(pool);
  return pool.slice(0, Math.min(target, pool.length));
}

export function examScore(
  answers: Map<string, string>,
  questions: ExamQuestion[]
): ExamScoreResult {
  const breakdown: Record<string, { correct: number; total: number }> = {};
  let score = 0;

  for (const q of questions) {
    const slug = q.chapterSlug;
    if (!breakdown[slug]) breakdown[slug] = { correct: 0, total: 0 };
    breakdown[slug].total++;

    const selected = answers.get(q.id);
    const correctLabel = q.options.find((o) => o.is_correct)?.label;
    if (selected !== undefined && selected === correctLabel) {
      score++;
      breakdown[slug].correct++;
    }
  }

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  return { score, total, percent, passed: percent >= 70, breakdown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/examUtils.test.ts
```
Expected: all tests PASS (count should be 9+)

- [ ] **Step 5: Commit**

```bash
git add src/lib/examUtils.ts src/lib/examUtils.test.ts
git commit -m "feat: add exam pure functions (buildExam, buildDemoExam, examScore) with tests"
```

---

## Task 3: Server queries + saveExamResult action

**Files:**
- Modify: `src/lib/queries.ts` (append two new exports)
- Modify: `src/lib/actions.ts` (append one new export)

- [ ] **Step 1: Add getQuestionsForExam and getLastExamResult to queries.ts**

Append to the bottom of `src/lib/queries.ts`:

```ts
import type { ExamQuestion } from "./examUtils";

export type ExamResultRow = {
  id: string;
  score: number;
  total: number;
  taken_at: string;
  breakdown: Record<string, { correct: number; total: number }>;
};

export async function getQuestionsForExam(): Promise<ExamQuestion[]> {
  const supabase = await createClient();

  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const ids = (published ?? []).map((r) => r.question_id);
  if (ids.length === 0) return [];

  const [questionsRes, optionsRes] = await Promise.all([
    supabase
      .from("questions")
      .select("id, stem, chapters!inner(slug, title)")
      .in("id", ids),
    supabase
      .from("answer_options")
      .select("question_id, label, text, is_correct, why")
      .in("question_id", ids)
      .order("label"),
  ]);

  const optsByQ = new Map<string, ExamQuestion["options"]>();
  for (const o of optionsRes.data ?? []) {
    if (!optsByQ.has(o.question_id)) optsByQ.set(o.question_id, []);
    optsByQ.get(o.question_id)!.push({
      label: o.label,
      text: o.text,
      is_correct: o.is_correct,
      why: o.why ?? null,
    });
  }

  return (questionsRes.data ?? []).map((q) => {
    const chapter = q.chapters as { slug: string; title: string };
    return {
      id: q.id,
      stem: q.stem,
      chapterSlug: chapter.slug,
      chapterTitle: chapter.title,
      options: optsByQ.get(q.id) ?? [],
    };
  });
}

export async function getLastExamResult(userId: string): Promise<ExamResultRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_results")
    .select("id, score, total, taken_at, breakdown")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ExamResultRow | null) ?? null;
}
```

- [ ] **Step 2: Add saveExamResult to actions.ts**

Append to `src/lib/actions.ts`:

```ts
export async function saveExamResult(
  score: number,
  total: number,
  breakdown: Record<string, { correct: number; total: number }>
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("exam_results").insert({
    user_id: user.id,
    score,
    total,
    breakdown,
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts src/lib/actions.ts
git commit -m "feat: add exam queries (getQuestionsForExam, getLastExamResult) and saveExamResult action"
```

---

## Task 4: ExamCountdown component

**Files:**
- Create: `src/components/ExamCountdown.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  totalSeconds: number;
  onExpire: () => void;
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ExamCountdown({ totalSeconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const colorClass =
    remaining < 300
      ? "text-red-600"
      : remaining < 600
      ? "text-amber-600"
      : "text-slate-700";

  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${colorClass}`}>
      {formatTime(remaining)}
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ExamCountdown.tsx
git commit -m "feat: add ExamCountdown component"
```

---

## Task 5: ExamResults component

**Files:**
- Create: `src/components/ExamResults.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ExamQuestion } from "@/lib/examUtils";
import Link from "next/link";

interface Props {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  breakdown: Record<string, { correct: number; total: number }>;
  questions: ExamQuestion[];
  answers: Record<string, string>;
  isDemo?: boolean;
}

export function ExamResults({
  score,
  total,
  percent,
  passed,
  breakdown,
  questions,
  answers,
  isDemo = false,
}: Props) {
  const missedQuestions = questions.filter((q) => {
    const correct = q.options.find((o) => o.is_correct)?.label;
    return answers[q.id] !== correct;
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Score card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <p className="text-6xl font-bold text-slate-900">{percent}%</p>
        <span
          className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
            passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {passed ? "PASS" : "FAIL"}
        </span>
        <p className="text-slate-500 text-sm">
          {score} of {total} correct · Pass line: 70%
        </p>
        {isDemo && (
          <p className="text-xs text-slate-400 pt-1">
            This was a 10-question preview. The real exam is 60 questions.
          </p>
        )}
      </div>

      {/* Chapter breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Results by section</p>
        <div className="space-y-2">
          {Object.entries(breakdown)
            .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total)
            .map(([slug, { correct, total: t }]) => {
              const pct = t > 0 ? Math.round((correct / t) * 100) : 0;
              return (
                <div key={slug} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-40 truncate capitalize">
                    {slug.replace(/-/g, " ")}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 70 ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-slate-400 w-20 text-right">
                    {correct}/{t} ({pct}%)
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Upgrade CTA for demo */}
      {isDemo && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm font-semibold text-sky-900">
            Ready for the full 60-question timed exam?
          </p>
          <p className="text-xs text-sky-700">
            The Pro plan unlocks the full simulator with a 2.5-hour countdown,
            question navigator, and instant result breakdown.
          </p>
          <Link
            href="/course"
            className="inline-block px-6 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            Unlock the full exam →
          </Link>
        </div>
      )}

      {/* Missed questions */}
      {missedQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Review these ({missedQuestions.length})
          </p>
          {missedQuestions.map((q) => {
            const correctOption = q.options.find((o) => o.is_correct);
            const selectedLabel = answers[q.id];
            return (
              <div
                key={q.id}
                className="bg-white border border-red-100 rounded-xl px-4 py-3 text-sm space-y-1.5"
              >
                <p className="text-slate-700 font-medium leading-snug">{q.stem}</p>
                {selectedLabel && (
                  <p className="text-red-600 text-xs">
                    Your answer: {selectedLabel}
                  </p>
                )}
                {!selectedLabel && (
                  <p className="text-slate-400 text-xs">Not answered</p>
                )}
                <p className="text-green-700 text-xs">
                  Correct: {correctOption?.label} — {correctOption?.text}
                </p>
                {correctOption?.why && (
                  <p className="text-slate-500 text-xs italic">{correctOption.why}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {!isDemo && (
          <Link
            href="/exam"
            className="flex-1 text-center py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-white transition-colors"
          >
            Back to exam
          </Link>
        )}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ExamResults.tsx
git commit -m "feat: add ExamResults component"
```

---

## Task 6: ExamRunner component

**Files:**
- Create: `src/components/ExamRunner.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useState, useCallback } from "react";
import { ExamCountdown } from "./ExamCountdown";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  items: ExamQuestion[];
  durationSeconds: number;
  onComplete: (answers: Map<string, string>) => void;
}

export function ExamRunner({ items, durationSeconds, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const current = items[index];
  const selectedLabel = answers.get(current.id) ?? null;
  const isFlagged = flagged.has(current.id);
  const unanswered = items.filter((q) => !answers.has(q.id)).length;

  const doSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    onComplete(answers);
  }, [submitted, answers, onComplete]);

  const handleManualSubmit = () => {
    if (unanswered > 0) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const select = (label: string) => {
    setAnswers((prev) => new Map(prev).set(current.id, label));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Confirm-submit modal overlay (timer stays mounted) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center space-y-4 shadow-xl">
            <p className="text-base font-semibold text-slate-900">Submit exam?</p>
            <p className="text-slate-500 text-sm">
              {unanswered} question{unanswered !== 1 ? "s" : ""} unanswered. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
              >
                Go back
              </button>
              <button
                onClick={() => { setShowConfirm(false); doSubmit(); }}
                className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Question {index + 1} of {items.length}
        </span>
        <div className="flex items-center gap-4">
          {durationSeconds > 0 && (
            <ExamCountdown totalSeconds={durationSeconds} onExpire={doSubmit} />
          )}
          <button
            onClick={handleManualSubmit}
            disabled={submitted}
            className="text-xs font-semibold text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            Submit exam
          </button>
        </div>
      </div>

      {/* Answered progress bar */}
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-400 rounded-full transition-all"
          style={{ width: `${(answers.size / items.length) * 100}%` }}
        />
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-1">
        {items.map((q, i) => {
          let cls =
            "w-7 h-7 rounded text-xs font-medium flex items-center justify-center cursor-pointer transition-colors ";
          if (i === index) cls += "bg-sky-600 text-white";
          else if (flagged.has(q.id)) cls += "bg-amber-100 text-amber-700 border border-amber-300";
          else if (answers.has(q.id)) cls += "bg-green-100 text-green-700";
          else cls += "bg-slate-100 text-slate-400 hover:bg-slate-200";
          return (
            <button key={q.id} onClick={() => setIndex(i)} className={cls}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question stem */}
      <p className="text-base font-medium text-slate-900 leading-relaxed">{current.stem}</p>

      {/* Answer options */}
      <div className="space-y-2">
        {current.options.map((option) => (
          <button
            key={option.label}
            onClick={() => select(option.label)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
              selectedLabel === option.label
                ? "border-sky-500 bg-sky-50 text-sky-900 font-medium"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-bold mr-1">{option.label}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Prev / Flag / Next */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={toggleFlag}
          className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
            isFlagged
              ? "border-amber-400 text-amber-600 bg-amber-50"
              : "border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          {isFlagged ? "⚑ Flagged" : "⚐ Flag"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={index === items.length - 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ExamRunner.tsx
git commit -m "feat: add ExamRunner component with flag, navigator, countdown, confirm-submit"
```

---

## Task 7: Demo exam pages

**Files:**
- Create: `src/app/exam/demo/page.tsx`
- Create: `src/app/exam/demo/DemoExamClient.tsx`

- [ ] **Step 1: Create DemoExamClient**

Create `src/app/exam/demo/DemoExamClient.tsx`:

```tsx
"use client";
import { useState } from "react";
import { ExamRunner } from "@/components/ExamRunner";
import { ExamResults } from "@/components/ExamResults";
import { examScore } from "@/lib/examUtils";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  questions: ExamQuestion[];
}

type Phase = "taking" | "results";

export function DemoExamClient({ questions }: Props) {
  const [phase, setPhase] = useState<Phase>("taking");
  const [scoreData, setScoreData] = useState<ReturnType<typeof examScore> | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  const handleComplete = (answers: Map<string, string>) => {
    const result = examScore(answers, questions);
    setScoreData(result);
    setAnswersRecord(Object.fromEntries(answers));
    setPhase("results");
  };

  if (phase === "results" && scoreData) {
    return (
      <ExamResults
        score={scoreData.score}
        total={scoreData.total}
        percent={scoreData.percent}
        passed={scoreData.passed}
        breakdown={scoreData.breakdown}
        questions={questions}
        answers={answersRecord}
        isDemo
      />
    );
  }

  return (
    <ExamRunner
      items={questions}
      durationSeconds={0}
      onComplete={handleComplete}
    />
  );
}
```

- [ ] **Step 2: Create the demo page**

Create `src/app/exam/demo/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuestionsForExam } from "@/lib/queries";
import { buildDemoExam } from "@/lib/examUtils";
import { DemoExamClient } from "./DemoExamClient";

export default async function ExamDemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/exam/demo");

  const allQuestions = await getQuestionsForExam();
  const demoQuestions = buildDemoExam(allQuestions, 10);

  return <DemoExamClient questions={demoQuestions} />;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: compiles without errors (warnings about `force-dynamic` are fine)

- [ ] **Step 4: Manual smoke test**

Navigate to `http://localhost:3000/exam/demo` while signed in.
Verify: 10 questions load, prev/next works, submit shows results, upgrade CTA visible.

- [ ] **Step 5: Commit**

```bash
git add src/app/exam/demo/page.tsx src/app/exam/demo/DemoExamClient.tsx
git commit -m "feat: add demo exam page (10 questions, untimed, upgrade CTA)"
```

---

## Task 8: Full exam take pages

**Files:**
- Create: `src/app/exam/take/page.tsx`
- Create: `src/app/exam/take/ExamTakeClient.tsx`

- [ ] **Step 1: Create ExamTakeClient**

Create `src/app/exam/take/ExamTakeClient.tsx`:

```tsx
"use client";
import { useState } from "react";
import { ExamRunner } from "@/components/ExamRunner";
import { ExamResults } from "@/components/ExamResults";
import { examScore } from "@/lib/examUtils";
import { saveExamResult } from "@/lib/actions";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  questions: ExamQuestion[];
  durationSeconds: number;
}

type Phase = "taking" | "saving" | "results";

export function ExamTakeClient({ questions, durationSeconds }: Props) {
  const [phase, setPhase] = useState<Phase>("taking");
  const [scoreData, setScoreData] = useState<ReturnType<typeof examScore> | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  const handleComplete = async (answers: Map<string, string>) => {
    setPhase("saving");
    const result = examScore(answers, questions);
    setScoreData(result);
    setAnswersRecord(Object.fromEntries(answers));
    await saveExamResult(result.score, result.total, result.breakdown);
    setPhase("results");
  };

  if (phase === "saving") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Saving your results…
      </div>
    );
  }

  if (phase === "results" && scoreData) {
    return (
      <ExamResults
        score={scoreData.score}
        total={scoreData.total}
        percent={scoreData.percent}
        passed={scoreData.passed}
        breakdown={scoreData.breakdown}
        questions={questions}
        answers={answersRecord}
      />
    );
  }

  return (
    <ExamRunner
      items={questions}
      durationSeconds={durationSeconds}
      onComplete={handleComplete}
    />
  );
}
```

- [ ] **Step 2: Create the take page**

Create `src/app/exam/take/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getQuestionsForExam } from "@/lib/queries";
import { buildExam } from "@/lib/examUtils";
import { ExamTakeClient } from "./ExamTakeClient";

export default async function ExamTakePage() {
  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const allQuestions = await getQuestionsForExam();
  const examQuestions = buildExam(allQuestions, 60);

  return <ExamTakeClient questions={examQuestions} durationSeconds={9000} />;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: no errors

- [ ] **Step 4: Manual smoke test** (requires Pro account in dev or .env.local with test tier)

Navigate to `/exam/take`. Verify: 60 questions load, navigator shows 60 slots, countdown ticks, flagging works, submitting shows results, results save to `exam_results` table (check Supabase Table Editor).

- [ ] **Step 5: Commit**

```bash
git add src/app/exam/take/page.tsx src/app/exam/take/ExamTakeClient.tsx
git commit -m "feat: add full timed exam take page (60 questions, 2.5 hours, saves results)"
```

---

## Task 9: Exam landing page

**Files:**
- Create: `src/app/exam/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/exam/page.tsx`:

```tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getLastExamResult } from "@/lib/queries";
import Link from "next/link";

export default async function ExamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/exam");

  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const lastResult = await getLastExamResult(user.id);
  const percent =
    lastResult ? Math.round((lastResult.score / lastResult.total) * 100) : null;
  const passed = percent !== null ? percent >= 70 : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Practice Exam</h1>

      {/* Readiness card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {lastResult && percent !== null ? (
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
              Your last exam
            </p>
            <p className="text-6xl font-bold text-slate-900">{percent}%</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {passed ? "PASS" : "FAIL"}
            </span>
            <p className="text-xs text-slate-400">
              {lastResult.score} of {lastResult.total} correct ·{" "}
              {new Date(lastResult.taken_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {Object.keys(lastResult.breakdown).length > 0 && (
              <div className="mt-4 text-left space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Section breakdown
                </p>
                {Object.entries(lastResult.breakdown)
                  .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total)
                  .map(([slug, { correct, total }]) => {
                    const pct = Math.round((correct / total) * 100);
                    return (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-36 truncate capitalize">
                          {slug.replace(/-/g, " ")}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 70 ? "bg-green-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-400">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-slate-900 font-medium">No exam on record</p>
            <p className="text-slate-500 text-sm">
              Take your first timed practice exam to see your readiness score.
            </p>
          </div>
        )}
      </div>

      <Link
        href="/exam/take"
        className="block w-full text-center py-3.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
      >
        {lastResult ? "Retake exam" : "Start exam"} — 60 questions · 2.5 hours
      </Link>

      <p className="text-center text-xs text-slate-400">FAA standard: 70% to pass</p>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors

- [ ] **Step 3: Manual smoke test**

Navigate to `/exam`. Verify: redirect to `/course` for free users, landing page loads for Pro users, "No exam on record" shown before first attempt, score card shown after completing a test.

- [ ] **Step 4: Commit**

```bash
git add src/app/exam/page.tsx
git commit -m "feat: add exam landing page with readiness score and start CTA"
```

---

## Task 10: Nav + Go-Live flip

**Files:**
- Modify: `src/components/NavDrawer.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add "Exam" link to NavDrawer**

In `src/components/NavDrawer.tsx`, find the logged-in nav block (after "Progress" link, before the log out button). Add the Exam link:

```tsx
{isLoggedIn ? (
  <>
    <Link href="/account" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
      Account
    </Link>
    <Link href="/progress" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
      Progress
    </Link>
    <Link href="/exam" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
      Practice Exam
    </Link>
    <Link href="/course" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
      Get the course
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
```

- [ ] **Step 2: Add hero CTAs to home page**

In `src/app/page.tsx`, find the logged-out hero CTA buttons (the `<div className="mt-8 flex items-center justify-center gap-3">` block). Replace with:

```tsx
<div className="mt-8 flex flex-col items-center gap-3">
  <div className="flex items-center justify-center gap-3">
    <Link
      href="/signup"
      className="px-6 py-3 bg-sky-500 text-white rounded-lg font-semibold text-sm hover:bg-sky-400 transition-colors"
    >
      Start studying free →
    </Link>
    <Link
      href="/login"
      className="px-6 py-3 bg-white/90 text-black-700 border border-slate-400/30 rounded-lg font-semibold text-sm hover:bg-white/70 transition-colors"
    >
      Sign in
    </Link>
  </div>
  <div className="flex items-center justify-center gap-4 mt-1">
    <Link
      href="/exam/demo"
      className="text-sky-300 text-sm hover:text-sky-200 underline-offset-2 hover:underline transition-colors"
    >
      Try a 10-question practice exam →
    </Link>
    <span className="text-slate-600 text-xs">·</span>
    <Link
      href="/course"
      className="text-slate-300 text-sm hover:text-slate-200 underline-offset-2 hover:underline transition-colors"
    >
      View pricing
    </Link>
  </div>
</div>
```

Also update the `<p>` tag just below:

```tsx
<p className="mt-2 text-xs text-slate-400">No credit card to start</p>
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass (28 existing + 9+ new = 37+ total)

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: no errors

- [ ] **Step 5: Manual smoke test — full golden path**

1. Open `http://localhost:3000` signed out → verify "Try a 10-question practice exam" and "View pricing" links appear in hero
2. Click "Try a 10-question practice exam" → redirect to login (not signed in)
3. Sign in, open menu (hamburger) → verify "Practice Exam" and "Get the course" links appear
4. Navigate to `/exam/demo` → complete 10 questions → see results + upgrade CTA
5. Navigate to `/exam` → verify redirect to `/course` for free-tier users
6. Navigate to `/course` → pricing page loads (still same as before)

- [ ] **Step 6: Commit and push**

```bash
git add src/components/NavDrawer.tsx src/app/page.tsx
git commit -m "feat: go-live flip — exam + course links in nav, hero CTAs for demo and pricing"
git push origin main
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DB migration ✓, buildExam ✓, buildDemoExam ✓, examScore ✓, saveExamResult ✓, getQuestionsForExam ✓, getLastExamResult ✓, ExamCountdown ✓, ExamResults ✓, ExamRunner ✓, /exam landing ✓, /exam/take ✓, /exam/demo ✓, nav changes ✓, go-live flip ✓
- [x] **No placeholders:** all code blocks are complete
- [x] **Type consistency:** ExamQuestion imported from examUtils.ts throughout; ExamScoreResult used as `ReturnType<typeof examScore>` in client wrappers; answers Map<string,string> → Record<string,string> conversion explicit in both ExamTakeClient and DemoExamClient
- [x] **Pro gating:** /exam and /exam/take redirect to /course for non-Pro; /exam/demo is auth-gated but not Pro-gated
- [x] **Timer:** durationSeconds=0 in ExamRunner causes ExamCountdown to skip (useEffect returns early when totalSeconds <= 0); also skip rendering the countdown element itself via `{durationSeconds > 0 && ...}`
