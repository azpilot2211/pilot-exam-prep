import { describe, it, expect } from "vitest";
import { masteryPercent, examReadiness } from "./scoring";

describe("masteryPercent", () => {
  it("returns 0 when no questions attempted", () => {
    expect(masteryPercent(0, 0)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(masteryPercent(2, 3)).toBe(67);
  });

  it("caps at 100", () => {
    expect(masteryPercent(5, 5)).toBe(100);
  });
});

describe("examReadiness", () => {
  it("averages chapter mastery, ignoring untouched chapters", () => {
    const result = examReadiness([
      { correct: 8, total: 10 },
      { correct: 6, total: 10 },
      { correct: 0, total: 0 },
    ]);
    expect(result).toBe(70);
  });

  it("returns 0 when nothing attempted anywhere", () => {
    expect(examReadiness([{ correct: 0, total: 0 }])).toBe(0);
  });
});
