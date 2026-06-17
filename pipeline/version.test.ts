import { describe, it, expect } from "vitest";
import { sourceVersion } from "./version";
import type { SeedQuestion } from "./types";

const base: SeedQuestion = {
  sourceRef: "q1",
  chapterSlug: "navigation",
  chapterTitle: "Navigation",
  chapterOrder: 3,
  chapterDescription: "desc",
  stem: "Stem?",
  acsCode: "PA.VI.B",
  options: [
    { label: "A", text: "one", isCorrect: false },
    { label: "B", text: "two", isCorrect: true },
    { label: "C", text: "three", isCorrect: false },
  ],
};

describe("sourceVersion", () => {
  it("is stable for identical content", () => {
    expect(sourceVersion(base)).toBe(sourceVersion({ ...base }));
  });

  it("changes when the stem changes", () => {
    expect(sourceVersion(base)).not.toBe(
      sourceVersion({ ...base, stem: "Different?" })
    );
  });

  it("changes when an option's correctness changes", () => {
    const flipped: SeedQuestion = {
      ...base,
      options: [
        { label: "A", text: "one", isCorrect: true },
        { label: "B", text: "two", isCorrect: false },
        { label: "C", text: "three", isCorrect: false },
      ],
    };
    expect(sourceVersion(base)).not.toBe(sourceVersion(flipped));
  });

  it("ignores option ordering", () => {
    const reordered: SeedQuestion = {
      ...base,
      options: [...base.options].reverse(),
    };
    expect(sourceVersion(base)).toBe(sourceVersion(reordered));
  });
});
