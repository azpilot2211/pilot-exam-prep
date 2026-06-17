import { describe, it, expect } from "vitest";
import { getFocusAreas } from "./focusAreas";

const ch = (id: string) => ({ id, slug: id, title: id });

describe("getFocusAreas", () => {
  it("returns the lowest-mastery attempted chapters first", () => {
    const mastery = new Map([
      ["a", { correct: 9, total: 10 }], // 90%
      ["b", { correct: 3, total: 10 }], // 30%
      ["c", { correct: 6, total: 10 }], // 60%
    ]);
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c")], 2);
    expect(result.map((r) => r.chapter.id)).toEqual(["b", "c"]);
    expect(result[0].percent).toBe(30);
    expect(result[0].started).toBe(true);
  });

  it("fills with unstarted chapters when too few have been attempted", () => {
    const mastery = new Map([["a", { correct: 5, total: 10 }]]); // 50%
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c")], 3);
    expect(result.map((r) => r.chapter.id)).toEqual(["a", "b", "c"]);
    expect(result[1].started).toBe(false);
    expect(result[1].percent).toBe(0);
  });

  it("respects the limit", () => {
    const mastery = new Map([
      ["a", { correct: 1, total: 10 }],
      ["b", { correct: 2, total: 10 }],
      ["c", { correct: 3, total: 10 }],
      ["d", { correct: 4, total: 10 }],
    ]);
    const result = getFocusAreas(mastery, [ch("a"), ch("b"), ch("c"), ch("d")], 3);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.chapter.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when there are no chapters", () => {
    expect(getFocusAreas(new Map(), [], 3)).toEqual([]);
  });
});
