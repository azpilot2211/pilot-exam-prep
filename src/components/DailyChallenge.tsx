import Link from "next/link";
import type { Question, AnswerOption } from "@/lib/queries";

interface Props {
  question: Question;
  options: AnswerOption[];
  chapterTitle: string;
  chapterSlug: string;
}

export function DailyChallenge({ question, options: _options, chapterTitle, chapterSlug }: Props) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="mx-4 sm:mx-20 mb-6 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 text-white overflow-hidden shadow-md">
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-sky-200">
              Daily Challenge
            </span>
            <span className="text-[10px] text-sky-300">&mdash; {dateLabel}</span>
          </div>
          <p className="text-sm sm:text-base font-medium leading-snug text-white line-clamp-2">
            {question.stem}
          </p>
          <p className="text-xs text-sky-300 mt-1.5">{chapterTitle}</p>
        </div>
        <Link
          href={`/quiz/${chapterSlug}`}
          className="flex-shrink-0 px-5 py-2.5 bg-white text-sky-700 rounded-xl text-sm font-bold hover:bg-sky-50 transition-colors whitespace-nowrap"
        >
          Take the quiz →
        </Link>
      </div>
    </div>
  );
}
