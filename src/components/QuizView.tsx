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
          <p className="text-slate-600 text-sm">
            {correct} of {total} correct — {chapterTitle}
          </p>
        </div>

        {wrong.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
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
      <div className="flex items-center justify-between text-sm text-slate-600">
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

      {/* Figure (if present) */}
      {current.question.figure_image_url && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <img
            src={current.question.figure_image_url}
            alt="FAA exam figure"
            className="w-full h-auto"
          />
        </div>
      )}

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

      {/* Why text after reveal */}
      {revealed && selected && (
        <div
          className={`px-4 py-3 rounded-xl text-sm border ${
            selected === correctOption?.label
              ? "bg-green-50 border-green-100 text-green-800"
              : "bg-red-50 border-red-100 text-red-800"
          }`}
        >
          {current.options.find((o) => o.label === selected)?.why ??
            (selected === correctOption?.label
              ? "Correct!"
              : `Correct answer: ${correctOption?.label}`)}
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
