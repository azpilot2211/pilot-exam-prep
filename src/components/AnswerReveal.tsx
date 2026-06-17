import type { AnswerOption, QuestionContent } from "@/lib/queries";

interface Props {
  selectedLabel: string;
  options: AnswerOption[];
  content: QuestionContent;
}

export function AnswerReveal({ selectedLabel, options, content }: Props) {
  const correctOption = options.find((o) => o.is_correct)!;
  const isCorrect = selectedLabel === correctOption.label;

  return (
    <div className="space-y-6">
      {/* Result banner */}
      <div
        className={`px-4 py-3 rounded-xl font-semibold text-sm border ${
          isCorrect
            ? "bg-green-50 text-green-800 border-green-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}
      >
        {isCorrect
          ? "✓ Correct!"
          : `✗ Incorrect — the correct answer is ${correctOption.label}`}
      </div>

      {/* SVG illustration */}
      {content.illustration_svg && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 overflow-hidden">
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: content.illustration_svg }}
          />
        </div>
      )}

      {/* Concept */}
      {content.concept_tested && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">
            Concept
          </p>
          <p className="text-sm text-slate-800">{content.concept_tested}</p>
        </div>
      )}

      {/* Why correct */}
      {content.explanation && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Why it's correct
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{content.explanation}</p>
        </div>
      )}

      {/* Why each option */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Why each answer
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.label}
              className={`px-4 py-3 rounded-xl text-sm border ${
                option.is_correct
                  ? "bg-green-50 border-green-100"
                  : option.label === selectedLabel
                  ? "bg-red-50 border-red-100"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <span
                className={`font-bold ${
                  option.is_correct ? "text-green-700" : "text-slate-600"
                }`}
              >
                {option.label}.{" "}
              </span>
              <span className="text-slate-700">{option.why ?? option.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key takeaway */}
      {content.key_takeaway && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Key Takeaway
          </p>
          <p className="text-sm text-slate-800 font-medium">{content.key_takeaway}</p>
        </div>
      )}

      {/* Citation */}
      {content.source_citation && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
          <span className="font-semibold text-slate-500">Reference: </span>
          {content.source_citation}
        </p>
      )}
    </div>
  );
}
