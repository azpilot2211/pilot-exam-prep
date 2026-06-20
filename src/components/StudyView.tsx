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
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-slate-600">
          <Link href={`/study/${chapterSlug}`} className="hover:text-slate-700 transition-colors">
            ← {chapterTitle}
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
            figureUrl={question.figure_image_url ?? null}
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

        {/* Prev / Next — shown after reveal */}
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
                href={`/study/${chapterSlug}`}
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
