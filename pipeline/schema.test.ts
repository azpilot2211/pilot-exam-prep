import { describe, it, expect } from "vitest";
import { generatedExplanationSchema, parseGeneratedExplanation } from "./schema";

const valid = {
  concept_tested: "A VOT transmits the 360 radial from everywhere.",
  why_correct: "Because the VOT simulates the 360 radial, OBS 0 centers FROM and 180 centers TO.",
  options_why: [
    { label: "A", why: "Reverses the flags." },
    { label: "B", why: "Correct: 0 FROM, 180 TO." },
    { label: "C", why: "A VOT is never TO-only." },
  ],
  source_citation: "14 CFR 91.171(b)(2); AIM 1-1-4",
  memory_aid: "Cessna 182: 0 FROM, 180 TO",
  key_takeaway: "On a VOT, 0 reads FROM and 180 reads TO.",
  narration_script: "When you check a VOR with a VOT and the needle centers...",
  confidence: 0.95,
};

describe("parseGeneratedExplanation", () => {
  it("accepts a valid object", () => {
    const result = parseGeneratedExplanation(valid);
    expect(result.success).toBe(true);
  });

  it("allows memory_aid to be null", () => {
    const result = parseGeneratedExplanation({ ...valid, memory_aid: null });
    expect(result.success).toBe(true);
  });

  it("rejects when a required field is missing", () => {
    const { source_citation, ...missing } = valid;
    const result = parseGeneratedExplanation(missing);
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside 0..1", () => {
    const result = parseGeneratedExplanation({ ...valid, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("is exported as a zod schema", () => {
    expect(typeof generatedExplanationSchema.safeParse).toBe("function");
  });
});
