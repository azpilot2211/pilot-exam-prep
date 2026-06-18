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
            .sort(([, a], [, b]) => (a.total > 0 ? a.correct / a.total : 0) - (b.total > 0 ? b.correct / b.total : 0))
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
