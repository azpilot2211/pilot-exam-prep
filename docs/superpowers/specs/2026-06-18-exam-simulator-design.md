# Exam Simulator Design

**Date:** 2026-06-18  
**Status:** Approved  
**Sub-project:** #2 of the monetization roadmap

---

## Overview

Build a full FAA Private Pilot written exam simulator on Flying Ace Exams. The simulator draws 60 questions from the live question bank, times the student for 2.5 hours, collects all answers before revealing results, and shows a score against the 70% pass threshold. Pro users get the full simulator; all users (including free) get a 10-question untimed demo to drive upgrades.

Completing this sub-project unlocks the go-live event: `/course` pricing page flips public and appears in the nav, giving the Pro tier a real differentiator.

---

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/exam` | Pro-gated | Readiness landing — shows last score, starts exam |
| `/exam/take` | Pro-gated | Timed 60-question exam runner |
| `/exam/demo` | Free (all users) | Untimed 10-question taster; ends with upgrade CTA |

Free users who hit `/exam` are redirected to `/course`. Demo is always accessible to authenticated users regardless of tier.

---

## Exam Composition

**Full exam:** 60 questions, proportional distribution across all chapters using the **largest-remainder method** to guarantee exactly 60. Minimum 1 question per chapter if the chapter has at least 1 published question.

**Demo exam:** 10 questions, flat random sample from the full published bank (no proportional allocation needed at 10 questions).

Both use cryptographically simple random sampling — no seed, no determinism. Each exam attempt is a fresh draw.

**Question bank size:** 249 published questions across 12 chapters (distribution on record). Proportional allocation will pull roughly 4–5 per chapter for a 60-question exam.

---

## Exam Runner UX (`/exam/take`)

### During the exam
- Questions displayed one at a time, **A/B/C/D options**, no explanation or correct-answer reveal until submit
- **Flag button** on each question to mark for review
- **Prev / Next navigation** — student can revisit and change answers freely
- **Question navigator** — compact grid of 60 numbered slots showing answered / unanswered / flagged state
- **Live countdown timer** — `HH:MM:SS`, prominent position. Auto-submits when it hits 00:00:00

### Submit
- Manual submit: confirm dialog ("Submit exam? You have X unanswered questions. This cannot be undone.")
- Auto-submit at timer zero: no dialog, immediate scoring

### Results screen (same route, post-submit)
- Large **score %** + **PASS / FAIL** badge (pass line = 70%)
- Per-chapter breakdown table (chapter name, your score %, pass/fail indicator)
- **Missed questions list** — each missed question shows the stem, your answer, correct answer, and explanation

---

## Demo Exam UX (`/exam/demo`)

- 10 questions, no timer
- Same runner UI minus the countdown and question navigator (just prev/next)
- Results screen: score % + "Unlock the full 60-question timed exam →" CTA linking to `/course`
- Demo results are **not persisted** to the database

---

## Readiness Landing (`/exam`)

- Shows **last exam score** as the primary readiness headline, against the 70% pass line
- If no exam taken yet: "No exam on record. Take your first timed practice exam."
- Per-chapter weakness table from the last exam's breakdown
- "Start exam" / "Retake exam" button

---

## Data Model

### New table: `exam_results`

```sql
create table exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,        -- number correct
  total int not null,        -- number answered (may be < 60 if auto-submitted early)
  taken_at timestamptz not null default now(),
  breakdown jsonb not null   -- { "weather": {correct:3, total:5}, ... }
);

-- RLS: users read and insert their own rows only
alter table exam_results enable row level security;
create policy "own rows" on exam_results
  for all using (auth.uid() = user_id);
```

Migration file: `supabase/migrations/0004_exam_results.sql`

### No changes to existing tables
The `attempts` table is for quiz attempts (per-question practice). Exam simulator results are stored separately in `exam_results` to keep them distinct.

---

## Pure Functions (testable)

### `buildExam(allQuestions, targetCount)`
- Input: flat array of `{id, chapterId, ...}` published questions, target count (60 or 10)
- Output: shuffled array of `targetCount` questions using proportional largest-remainder allocation
- For the demo (10), just random-sample without proportional logic
- For the full exam (60), apply largest-remainder per chapter, then shuffle the result
- Pure function — no DB calls, no side effects
- **Unit tests:** sum equals 60, no chapter over-represented beyond its proportion, works with chapters that have fewer questions than their quota

### `examScore(submittedAnswers, questions)`
- Input: `Map<questionId, selectedLabel>`, question array with correct answers
- Output: `{ score: number, total: number, percent: number, passed: boolean, breakdown: Record<chapterSlug, {correct: number, total: number}> }`
- `passed = percent >= 70`
- Pure function — no DB calls
- **Unit tests:** boundary at exactly 70%, all-correct, all-wrong, partial with known breakdown

---

## Server Action

### `saveExamResult(score, total, breakdown)`
- `"use server"` action in `src/lib/actions.ts`
- Reads authenticated user from Supabase session
- Inserts one row into `exam_results`
- Called once on exam submit (manual or auto-submit)
- No-op if user is unauthenticated (shouldn't happen since route is gated, but defensive)

---

## New Queries

### `getLastExamResult(userId)`
- Fetches the single most recent `exam_results` row for the user
- Returns `null` if none exists
- Used on `/exam` landing page

### `getQuestionsForExam()`
- Fetches all published questions with their chapter slug and correct answer label
- Used server-side on `/exam/take` to build the exam before handing it to the client

---

## New Components

### `ExamRunner` (`src/components/ExamRunner.tsx`)
- `"use client"` component
- Props: `items` (exam questions with options), `durationSeconds` (9000 for full, 0 for demo), `onComplete(answers: Map<questionId, selectedLabel>)`
- Manages: current question index, all answers map, flagged set, countdown timer
- Does **not** handle scoring or DB writes — delegates to parent via `onComplete`

### `ExamCountdown` (`src/components/ExamCountdown.tsx`)
- `"use client"` component
- Props: `totalSeconds`, `onExpire()`
- Displays `HH:MM:SS`. Fires `onExpire` when it hits zero
- Turns amber at <10 minutes, red at <5 minutes

### `ExamResults` (`src/components/ExamResults.tsx`)
- `"use client"` (or server) component
- Props: score data + per-chapter breakdown + missed question details
- Renders the score card, chapter breakdown table, and missed questions list

---

## Navigation Changes

- Add **"Exam"** link to NavDrawer for logged-in users (positioned after "Progress")
- On `/exam` landing: if tier is free, redirect to `/course`

---

## Go-Live Event (end of this sub-project)

Once exam simulator is working and tested:
1. Add `/course` link to NavDrawer (currently unlinked)
2. Add "Try the demo exam" button to hero section on home page
3. Add hero CTA "Get the course" → `/course`

These three changes are part of this sub-project's final task.

---

## Testing

**Unit tests (Vitest):**
- `buildExam` — proportional counts sum to 60, per-chapter quotas respected, shuffled
- `examScore` — 70% boundary, all-correct/wrong, breakdown structure

**Manual smoke tests:**
- Full timed exam: start, answer some, flag some, navigate, submit manually
- Auto-submit: reduce timer via dev override, verify auto-submit fires and persists
- Demo: complete 10 questions, verify results appear, verify upgrade CTA visible
- Pro gating: free user hits `/exam` → redirected to `/course`
- Readiness landing: after one exam, score appears; after second exam, most recent score shown

---

## Out of Scope (v1)

- Resume mid-exam (tab closed = attempt lost)
- Multiple exam attempts stored as history (only last is shown)
- Pause/extend time
- Specific FAA question pool (real ~900 questions) — uses current 249-question bank
- Adaptive question selection based on weak areas
