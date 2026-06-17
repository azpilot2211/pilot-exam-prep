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

      {illustrationSvg && (
        <div
          className="w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2"
          dangerouslySetInnerHTML={{ __html: illustrationSvg }}
        />
      )}

      <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>

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
