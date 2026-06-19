import Link from "next/link";
import { MasteryBar } from "./MasteryBar";
import { masteryPercent } from "@/lib/scoring";
import { chapterMeta } from "@/lib/chapterMeta";

interface Props {
  slug: string;
  title: string;
  description: string | null;
  mastery: { correct: number; total: number } | null;
  questionCount: number;
  isFree?: boolean;
}

export function ChapterCard({ slug, title, description, mastery, questionCount, isFree }: Props) {
  const hasStarted = mastery != null && mastery.total > 0;
  const percent = hasStarted ? masteryPercent(mastery!.correct, mastery!.total) : 0;
  const meta = chapterMeta(slug);
  const Icon = meta.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col relative">
      {isFree && (
        <span className="absolute top-4 right-[-22px] w-28 bg-emerald-500 text-white text-[9px] font-bold text-center py-1 rotate-45 z-10 shadow-sm tracking-wide">
          FREE
        </span>
      )}
      <div className={`h-1 ${meta.accent}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-base leading-snug">{title}</h2>
              {questionCount > 0 && (
                <p className="text-xs text-slate-400">
                  {questionCount} lesson{questionCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {hasStarted && (
            <span
              className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                percent >= 80 ? "bg-green-100 text-green-700" : "bg-sky-50 text-sky-700"
              }`}
            >
              {percent >= 80 ? "Ready ✓" : "In progress"}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-slate-400 mb-4 leading-snug">{description}</p>
        )}
        <div className="flex-1" />
        <MasteryBar
          percent={percent}
          label={hasStarted ? `${mastery!.total} of ${questionCount} answered` : "Not started"}
          questionCount={questionCount}
        />
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
    </div>
  );
}
