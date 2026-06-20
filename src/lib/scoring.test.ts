import { describe, it, expect } from "vitest";
import {
  masteryPercent,
  summarizeMastery,
  coveragePercent,
  readinessPercent,
} from "./scoring";

describe("masteryPercent (accuracy)", () => {
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

describe("summarizeMastery", () => {
  it("sums correct and answered across chapters", () => {
    const map = new Map<string, { correct: number; total: number }>([
      ["c1", { correct: 7, total: 10 }],
      ["c2", { correct: 3, total: 8 }],
    ]);
    expect(summarizeMastery(map)).toEqual({ correct: 10, answered: 18 });
  });

  it("returns zeros for an empty map", () => {
    expect(summarizeMastery(new Map())).toEqual({ correct: 0, answered: 0 });
  });
});

describe("coveragePercent", () => {
  it("is answered over published", () => {
    expect(coveragePercent(50, 200)).toBe(25);
  });

  it("returns 0 when nothing is published", () => {
    expect(coveragePercent(10, 0)).toBe(0);
  });
});

describe("readinessPercent", () => {
  it("is correct over ALL published, not just answered", () => {
    // High accuracy on a few answered still yields low readiness across the full bank.
    expect(readinessPercent(8, 200)).toBe(4);
  });

  it("returns 0 when nothing is published", () => {
    expect(readinessPercent(5, 0)).toBe(0);
  });

  it("caps at 100", () => {
    expect(readinessPercent(200, 200)).toBe(100);
  });
});
