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
