import { describe, it, expect } from "vitest";
import { buildAnswerOptionRows, buildContentRow } from "./mapping";
import type { SeedQuestion } from "./types";
import type { GeneratedExplanation } from "./schema";

const question: SeedQuestion = {
  sourceRef: "nav-vot-check",
  chapterSlug: "navigation",
  chapterTitle: "Navigation",
  chapterOrder: 3,
  chapterDescription: "desc",
  stem: "Stem?",
  acsCode: "PA.VI.B",
  options: [
    { label: "A", text: "wrong", isCorrect: false },
    { label: "B", text: "right", isCorrect: true },
    { label: "C", text: "wrong2", isCorrect: false },
  ],
};

const gen: GeneratedExplanation = {
  concept_tested: "concept",
  why_correct: "because",
  options_why: [
    { label: "A", why: "A is wrong" },
    { label: "B", why: "B is right" },
    { label: "C", why: "C is wrong" },
  ],
  source_citation: "14 CFR 91.171",
  memory_aid: "aid",
  key_takeaway: "takeaway",
  narration_script: "spoken",
  confidence: 0.9,
};

describe("buildAnswerOptionRows", () => {
  it("pairs each option with its why text and correctness", () => {
    const rows = buildAnswerOptionRows("q-id", question, gen);
    expect(rows).toEqual([
      { question_id: "q-id", label: "A", text: "wrong", is_correct: false, why: "A is wrong" },
      { question_id: "q-id", label: "B", text: "right", is_correct: true, why: "B is right" },
      { question_id: "q-id", label: "C", text: "wrong2", is_correct: false, why: "C is wrong" },
    ]);
  });

  it("throws if an option has no matching why", () => {
    const incomplete = { ...gen, options_why: [{ label: "A" as const, why: "only A" }] };
    expect(() => buildAnswerOptionRows("q-id", question, incomplete)).toThrow();
  });
});

describe("buildContentRow", () => {
  it("maps generation fields and audio url, unpublished", () => {
    const row = buildContentRow("q-id", gen, "<svg/>", "https://audio/x.mp3");
    expect(row.question_id).toBe("q-id");
    expect(row.explanation).toBe("because");
    expect(row.source_citation).toBe("14 CFR 91.171");
    expect(row.illustration_svg).toBe("<svg/>");
    expect(row.audio_url).toBe("https://audio/x.mp3");
    expect(row.published).toBe(false);
  });
});
