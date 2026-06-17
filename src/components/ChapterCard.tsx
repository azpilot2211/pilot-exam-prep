import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import { masteryPercent } from "@/lib/scoring";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  mastery: { correct: number; total: number } | null;
  questionCount: number;
}

export function ChapterCard({ slug, title, description, mastery, questionCount }: Props) {
  const hasStarted = mastery != null && mastery.total > 0;
  const percent = hasStarted ? masteryPercent(mastery!.correct, mastery!.total) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-sky-200 transition-all flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-1">
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
      {questionCount > 0 && (
        <p className="text-xs text-slate-400 mb-1">{questionCount} lesson{questionCount !== 1 ? "s" : ""}</p>
      )}
      {description && (
        <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
      )}
      <div className="flex-1" />
      {hasStarted ? (
        <MasteryBar percent={percent} label={`${mastery!.total} answered`} />
      ) : (
        <p className="text-xs text-slate-400 mt-2">Not started</p>
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
