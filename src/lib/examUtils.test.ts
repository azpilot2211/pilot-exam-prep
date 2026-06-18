import { describe, it, expect } from "vitest";
import { buildExam, buildDemoExam, examScore } from "./examUtils";
import type { ExamQuestion } from "./examUtils";

function makeQuestions(chapters: { slug: string; count: number }[]): ExamQuestion[] {
  const result: ExamQuestion[] = [];
  for (const { slug, count } of chapters) {
    for (let i = 0; i < count; i++) {
      result.push({
        id: `${slug}-${i}`,
        stem: `Q${i} about ${slug}`,
        chapterSlug: slug,
        chapterTitle: slug,
        options: [
          { label: "A", text: "Option A", is_correct: true, why: null },
          { label: "B", text: "Option B", is_correct: false, why: null },
          { label: "C", text: "Option C", is_correct: false, why: null },
          { label: "D", text: "Option D", is_correct: false, why: null },
        ],
      });
    }
  }
  return result;
}

const FULL_BANK = makeQuestions([
  { slug: "weather", count: 22 },
  { slug: "regulations", count: 19 },
  { slug: "navigation", count: 18 },
  { slug: "aerodynamics", count: 18 },
  { slug: "aircraft-systems", count: 18 },
  { slug: "airspace", count: 17 },
  { slug: "airport-operations", count: 16 },
  { slug: "weight-and-balance", count: 15 },
  { slug: "performance", count: 15 },
  { slug: "emergency-procedures", count: 14 },
  { slug: "preflight-planning", count: 14 },
  { slug: "night-operations", count: 11 },
]);

describe("buildExam", () => {
  it("returns exactly 60 questions", () => {
    expect(buildExam(FULL_BANK, 60)).toHaveLength(60);
  });

  it("returns no duplicate question ids", () => {
    const exam = buildExam(FULL_BANK, 60);
    expect(new Set(exam.map((q) => q.id)).size).toBe(60);
  });

  it("does not draw more from a chapter than it has", () => {
    const small = makeQuestions([
      { slug: "tiny", count: 3 },
      { slug: "big", count: 100 },
    ]);
    const exam = buildExam(small, 60);
    expect(exam.filter((q) => q.chapterSlug === "tiny").length).toBeLessThanOrEqual(3);
  });
});

describe("buildDemoExam", () => {
  it("returns exactly 10 questions", () => {
    expect(buildDemoExam(FULL_BANK, 10)).toHaveLength(10);
  });

  it("returns no duplicates", () => {
    const demo = buildDemoExam(FULL_BANK, 10);
    expect(new Set(demo.map((q) => q.id)).size).toBe(10);
  });
});

describe("examScore", () => {
  const tenQs = makeQuestions([{ slug: "weather", count: 10 }]);

  it("100% when all correct", () => {
    const answers = new Map(tenQs.map((q) => [q.id, "A"]));
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(10);
    expect(r.percent).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("0% when all wrong", () => {
    const answers = new Map(tenQs.map((q) => [q.id, "B"]));
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("passes at exactly 70%", () => {
    const answers = new Map<string, string>();
    tenQs.slice(0, 7).forEach((q) => answers.set(q.id, "A"));
    tenQs.slice(7).forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, tenQs);
    expect(r.percent).toBe(70);
    expect(r.passed).toBe(true);
  });

  it("fails at 69%", () => {
    const hundredQs = makeQuestions([{ slug: "weather", count: 100 }]);
    const answers = new Map<string, string>();
    hundredQs.slice(0, 69).forEach((q) => answers.set(q.id, "A"));
    hundredQs.slice(69).forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, hundredQs);
    expect(r.percent).toBe(69);
    expect(r.passed).toBe(false);
  });

  it("builds correct per-chapter breakdown", () => {
    const mixed = makeQuestions([
      { slug: "weather", count: 3 },
      { slug: "regulations", count: 2 },
    ]);
    const answers = new Map<string, string>();
    mixed.filter((q) => q.chapterSlug === "weather").forEach((q) => answers.set(q.id, "A"));
    mixed.filter((q) => q.chapterSlug === "regulations").forEach((q) => answers.set(q.id, "B"));
    const r = examScore(answers, mixed);
    expect(r.breakdown["weather"]).toEqual({ correct: 3, total: 3 });
    expect(r.breakdown["regulations"]).toEqual({ correct: 0, total: 2 });
  });

  it("unanswered questions count as wrong", () => {
    const answers = new Map<string, string>();
    const r = examScore(answers, tenQs);
    expect(r.score).toBe(0);
    expect(r.total).toBe(10);
  });
});
