import type { SeedQuestion } from "./types";
import type { GeneratedExplanation } from "./schema";

export interface AnswerOptionRow {
  question_id: string;
  label: string;
  text: string;
  is_correct: boolean;
  why: string;
}

export interface ContentRow {
  question_id: string;
  concept_tested: string;
  explanation: string;
  source_citation: string;
  memory_aid: string | null;
  key_takeaway: string;
  illustration_svg: string;
  audio_url: string;
  published: boolean;
  generated_at: string;
}

export function buildAnswerOptionRows(
  questionId: string,
  question: SeedQuestion,
  gen: GeneratedExplanation
): AnswerOptionRow[] {
  return question.options.map((option) => {
    const match = gen.options_why.find((w) => w.label === option.label);
    if (!match) {
      throw new Error(`No why text generated for option ${option.label}`);
    }
    return {
      question_id: questionId,
      label: option.label,
      text: option.text,
      is_correct: option.isCorrect,
      why: match.why,
    };
  });
}

export function buildContentRow(
  questionId: string,
  gen: GeneratedExplanation,
  illustrationSvg: string,
  audioUrl: string
): ContentRow {
  return {
    question_id: questionId,
    concept_tested: gen.concept_tested,
    explanation: gen.why_correct,
    source_citation: gen.source_citation,
    memory_aid: gen.memory_aid,
    key_takeaway: gen.key_takeaway,
    illustration_svg: illustrationSvg,
    audio_url: audioUrl,
    published: false,
    generated_at: new Date().toISOString(),
  };
}
