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
  isPro: boolean;
}

export function LessonCard({
  index,
  questionId,
  chapterSlug,
  explanation,
  illustrationSvg,
  audioUrl,
  isPro,
}: Props) {
  const handleDownload = () => {
    if (!audioUrl) return;
    const filename = `lesson-${index + 1}-${chapterSlug}.mp3`;
    const url = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">
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
          className="w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center p-2"
          dangerouslySetInnerHTML={{ __html: illustrationSvg }}
        />
      )}

      <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>

      <div className="flex items-center justify-between">
        <Link
          href={`/study/${chapterSlug}/${questionId}`}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
        >
          See related question →
        </Link>

        {audioUrl && (
          isPro ? (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:underline cursor-pointer transition-colors"
              title="Download MP3"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download MP3
            </button>
          ) : (
            <Link
              href="/course"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-sky-400 transition-colors"
              title="Pro feature"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pro: Download
            </Link>
          )
        )}
      </div>
    </div>
  );
}
