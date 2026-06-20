"use client";
import { useState } from "react";
import { recordAttempt } from "@/lib/actions";
import type { AnswerOption } from "@/lib/queries";

interface Props {
  questionId: string;
  stem: string;
  figureUrl?: string | null;
  options: AnswerOption[];
  onReveal: (selectedLabel: string) => void;
}

export function QuestionCard({ questionId, stem, figureUrl, options, onReveal }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCommit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const correctOption = options.find((o) => o.is_correct);
    const isCorrect = selected === correctOption?.label;
    await recordAttempt(questionId, selected, isCorrect);
    onReveal(selected);
  };

  return (
    <div className="space-y-6">
      {figureUrl && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <img
            src={figureUrl}
            alt="FAA exam figure — refer to this diagram to answer the question"
            className="w-full h-auto"
          />
        </div>
      )}
      <p className="text-lg font-medium text-slate-900 leading-relaxed">{stem}</p>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => !submitting && setSelected(option.label)}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm ${
              selected === option.label
                ? "border-sky-500 bg-sky-50 text-sky-900 font-medium"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span className="font-bold mr-1">{option.label}.</span>
            {option.text}
          </button>
        ))}
      </div>
      <button
        onClick={handleCommit}
        disabled={!selected || submitting}
        className="w-full bg-sky-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-sky-700 transition-colors"
      >
        Check Answer
      </button>
    </div>
  );
}
