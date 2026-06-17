# Study Guide Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-question redirect in the study view with a full chapter study guide — a scrollable list of lesson cards (audio + illustration + explanation) followed by a "Take Quiz" button.

**Architecture:** The chapter study page (`/study/[chapterSlug]`) becomes the study guide, rendering one `LessonCard` per published question using the question's explanation, illustration SVG, and audio URL. The existing per-question view (`/study/[chapterSlug]/[questionId]`) is preserved and linked from each lesson card as "See related questions." A new `getPublishedLessons` query fetches both question order and content in two DB calls (reusing existing helpers).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase, `@supabase/ssr`, existing `AudioPlayer` component, `dangerouslySetInnerHTML` for SVG (pre-generated trusted content).

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/queries.ts` | Modify | Add `Lesson` type + `getPublishedLessons(chapterId)` |
| `src/components/LessonCard.tsx` | Create | Audio + illustration + explanation + link, client component |
| `src/app/study/[chapterSlug]/page.tsx` | Rewrite | Study guide page: chapter header + lesson list + Take Quiz button |

---

### Task 1: Add `getPublishedLessons` query to `src/lib/queries.ts`

**Files:**
- Modify: `src/lib/queries.ts`

The function reuses `getPublishedQuestions` to preserve `display_order`, then fetches content rows in one `.in()` call and zips them.

- [ ] **Step 1: Add `Lesson` type and `getPublishedLessons` function**

Open `src/lib/queries.ts` and append after the existing `getUserAllMastery` export:

```ts
export type Lesson = {
  questionId: string;
  explanation: string;
  illustrationSvg: string | null;
  audioUrl: string | null;
};

export async function getPublishedLessons(chapterId: string): Promise<Lesson[]> {
  const questions = await getPublishedQuestions(chapterId);
  if (questions.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("question_content")
    .select("question_id, explanation, illustration_svg, audio_url")
    .in("question_id", questions.map((q) => q.id))
    .eq("published", true);

  const contentMap = new Map(
    (data ?? []).map((c) => [c.question_id, c])
  );

  return questions
    .map((q) => {
      const content = contentMap.get(q.id);
      if (!content) return null;
      return {
        questionId: q.id,
        explanation: content.explanation ?? "",
        illustrationSvg: content.illustration_svg ?? null,
        audioUrl: content.audio_url ?? null,
      };
    })
    .filter((l): l is Lesson => l !== null);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add getPublishedLessons query"
```

---

### Task 2: Create `LessonCard` component

**Files:**
- Create: `src/components/LessonCard.tsx`

The card shows: play button (left) | illustration (centre, optional) | explanation text (right) | "See related questions →" link at bottom-right. On mobile everything stacks vertically. Uses existing `AudioPlayer` for audio.

- [ ] **Step 1: Create `src/components/LessonCard.tsx`**

```tsx
"use client";
import { AudioPlayer } from "./AudioPlayer";
import Link from "next/link";

interface Props {
  index: number;
  questionId: string;
  chapterSlug: string;
  explanation: string;
  illustrationSvg: string | null;
  audioUrl: string | null;
}

export function LessonCard({
  index,
  questionId,
  chapterSlug,
  explanation,
  illustrationSvg,
  audioUrl,
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header row: lesson number + audio */}
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        {audioUrl ? (
          <div className="flex-1">
            <AudioPlayer src={audioUrl} />
          </div>
        ) : (
          <span className="text-xs text-slate-400">No audio yet</span>
        )}
      </div>

      {/* Illustration */}
      {illustrationSvg && (
        <div
          className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2"
          dangerouslySetInnerHTML={{ __html: illustrationSvg }}
        />
      )}

      {/* Explanation text */}
      <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>

      {/* Footer link */}
      <div className="flex justify-end">
        <Link
          href={`/study/${chapterSlug}/${questionId}`}
          className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
        >
          See related question →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LessonCard.tsx
git commit -m "feat: add LessonCard component"
```

---

### Task 3: Rewrite the study guide page

**Files:**
- Rewrite: `src/app/study/[chapterSlug]/page.tsx`

Replace the redirect-to-first-question logic with a full study guide page: chapter title + description at the top, numbered `LessonCard` list, and a "Take Quiz" button fixed at the bottom.

- [ ] **Step 1: Rewrite `src/app/study/[chapterSlug]/page.tsx`**

```tsx
import { getChapterBySlug, getPublishedLessons } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LessonCard } from "@/components/LessonCard";

interface Props {
  params: Promise<{ chapterSlug: string }>;
}

export default async function StudyGuidePage({ params }: Props) {
  const { chapterSlug } = await params;
  const chapter = await getChapterBySlug(chapterSlug);
  if (!chapter) return notFound();

  const lessons = await getPublishedLessons(chapter.id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-28">
      {/* Chapter header */}
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

      {/* Lessons */}
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
            />
          ))}
        </div>
      )}

      {/* Sticky Take Quiz button */}
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run tests to confirm nothing broken**

```bash
npx vitest run --passWithNoTests
```

Expected: 19 passed (or more).

- [ ] **Step 4: Commit**

```bash
git add src/app/study/[chapterSlug]/page.tsx
git commit -m "feat: replace study redirect with study guide page"
```

---

### Task 4: Push and deploy

**Files:** none (git ops only)

- [ ] **Step 1: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Verify Vercel build passes**

Watch the Vercel dashboard at https://vercel.com/michael-driggs-projects/pilot-exam-prep — build should reach READY within ~60s.

- [ ] **Step 4: Smoke test on flyingaceexams.com**

1. Open https://flyingaceexams.com
2. Click a chapter → should see study guide with numbered lesson cards
3. Each card shows explanation text; if audio is published, AudioPlayer appears
4. "See related question →" link navigates to the question study view
5. "Take Quiz →" sticky bar at bottom navigates to quiz for that chapter
