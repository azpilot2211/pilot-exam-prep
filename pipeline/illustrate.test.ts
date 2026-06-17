import { describe, it, expect } from "vitest";
import { extractSvg } from "./illustrate";

describe("extractSvg", () => {
  it("pulls the svg out of surrounding text", () => {
    const text = "Here you go:\n<svg viewBox=\"0 0 10 10\"><title>x</title></svg>\nDone.";
    expect(extractSvg(text)).toBe("<svg viewBox=\"0 0 10 10\"><title>x</title></svg>");
  });

  it("throws when there is no svg", () => {
    expect(() => extractSvg("no svg here")).toThrow();
  });
});
