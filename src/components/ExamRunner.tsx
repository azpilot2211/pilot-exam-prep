"use client";
import { useState, useCallback, useRef } from "react";
import { ExamCountdown } from "./ExamCountdown";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  items: ExamQuestion[];
  durationSeconds: number;
  onComplete: (answers: Map<string, string>) => void;
}

export function ExamRunner({ items, durationSeconds, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const current = items[index];
  const selectedLabel = answers.get(current.id) ?? null;
  const isFlagged = flagged.has(current.id);
  const unanswered = items.filter((q) => !answers.has(q.id)).length;

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    onComplete(answers);
  }, [answers, onComplete]);

  const handleManualSubmit = () => {
    if (unanswered > 0) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const select = (label: string) => {
    setAnswers((prev) => new Map(prev).set(current.id, label));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Confirm-submit modal overlay (timer stays mounted) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center space-y-4 shadow-xl">
            <p className="text-base font-semibold text-slate-900">Submit exam?</p>
            <p className="text-slate-500 text-sm">
              {unanswered} question{unanswered !== 1 ? "s" : ""} unanswered. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
              >
                Go back
              </button>
              <button
                onClick={() => { setShowConfirm(false); doSubmit(); }}
                className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Question {index + 1} of {items.length}
        </span>
        <div className="flex items-center gap-4">
          {durationSeconds > 0 && (
            <ExamCountdown totalSeconds={durationSeconds} onExpire={doSubmit} />
          )}
          <button
            onClick={handleManualSubmit}
            disabled={submitted}
            className="text-xs font-semibold text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            Submit exam
          </button>
        </div>
      </div>

      {/* Answered progress bar */}
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-400 rounded-full transition-all"
          style={{ width: `${(answers.size / items.length) * 100}%` }}
        />
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-1">
        {items.map((q, i) => {
          let cls =
            "w-7 h-7 rounded text-xs font-medium flex items-center justify-center cursor-pointer transition-colors ";
          if (i === index) cls += "bg-sky-600 text-white";
          else if (flagged.has(q.id)) cls += "bg-amber-100 text-amber-700 border border-amber-300";
          else if (answers.has(q.id)) cls += "bg-green-100 text-green-700";
          else cls += "bg-slate-100 text-slate-400 hover:bg-slate-200";
          return (
            <button key={q.id} onClick={() => setIndex(i)} className={cls}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question stem */}
      <p className="text-base font-medium text-slate-900 leading-relaxed">{current.stem}</p>

      {/* Answer options */}
      <div className="space-y-2">
        {current.options.map((option) => (
          <button
            key={option.label}
            onClick={() => select(option.label)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
              selectedLabel === option.label
                ? "border-sky-500 bg-sky-50 text-sky-900 font-medium"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-bold mr-1">{option.label}.</span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Prev / Flag / Next */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={toggleFlag}
          className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
            isFlagged
              ? "border-amber-400 text-amber-600 bg-amber-50"
              : "border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          {isFlagged ? "⚑ Flagged" : "⚐ Flag"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={index === items.length - 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
