"use client";
import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import type { Question, AnswerOption } from "@/lib/queries";

interface Props {
  question: Question;
  options: AnswerOption[];
  chapterTitle: string;
  chapterSlug: string;
  compact?: boolean;
}

export function DailyChallenge({ question, options, chapterTitle, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const correct = options.find((o) => o.is_correct);
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === correct?.label;

  const optionCls = (label: string) => {
    const base = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ";
    if (!isAnswered)
      return base + "border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 cursor-pointer";
    if (label === correct?.label)
      return base + "border-green-400 bg-green-50 text-green-800 font-medium";
    if (label === selected)
      return base + "border-red-300 bg-red-50 text-red-700";
    return base + "border-slate-100 text-slate-400";
  };

  const handleClose = () => { setOpen(false); setSelected(null); };

  return (
    <>
      {compact ? (
        /* ── Card mode (used in dashboard action cards row) ── */
        <div className="flex flex-col bg-slate-800 rounded-xl p-5 border border-slate-600 border-t-2 border-t-amber-500 shadow-md shadow-black/30">
          <Zap size={20} className="text-amber-400 mb-3" />
          <div className="text-slate-200 font-semibold text-sm mb-1">Daily Challenge</div>
          <div className="text-slate-300 text-xs mb-4 line-clamp-2">{question.stem}</div>
          <button
            onClick={() => setOpen(true)}
            className="mt-auto pt-1 self-start text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            Answer it →
          </button>
        </div>
      ) : (
        /* ── Banner mode (used on home/study pages) ── */
        <div className="mx-4 sm:mx-20 mb-6 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 text-white overflow-hidden shadow-md">
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-amber-300 fill-amber-300 flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                    Daily Challenge
                  </span>
                </span>
                <span className="text-[10px] text-sky-300">{dateLabel}</span>
              </div>
              <p className="text-sm sm:text-base font-medium leading-snug text-white line-clamp-2">
                {question.stem}
              </p>
              <p className="text-xs text-sky-300 mt-1.5">{chapterTitle}</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-sky-700 rounded-xl text-sm font-bold hover:bg-sky-50 transition-colors whitespace-nowrap"
            >
              Answer it →
            </button>
          </div>
        </div>
      )}

      {/* ── Modal (shared by both modes) ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-sky-700">
                    Daily Challenge
                  </span>
                </span>
                <p className="text-xs text-slate-400 mt-1.5">{chapterTitle}</p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-900 mb-4 leading-snug">
              {question.stem}
            </p>

            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.label}
                  className={optionCls(o.label)}
                  onClick={() => !isAnswered && setSelected(o.label)}
                  disabled={isAnswered}
                >
                  <span className="font-bold mr-2">{o.label}.</span>
                  {o.text}
                </button>
              ))}
            </div>

            {isAnswered && (
              <div
                className={`mt-4 p-4 rounded-xl border text-sm leading-snug ${
                  isCorrect
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                {isCorrect ? (
                  <p className="font-semibold">✓ Correct!</p>
                ) : (
                  <>
                    <p className="font-semibold mb-1">
                      Not quite — the correct answer is <strong>{correct?.label}</strong>.
                    </p>
                    {correct?.why && <p className="mt-1 text-amber-800">{correct.why}</p>}
                  </>
                )}
              </div>
            )}

            {isAnswered && (
              <button
                onClick={handleClose}
                className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
