import { describe, it, expect } from "vitest";
import { hasAccess, parseTier } from "./entitlement";

describe("hasAccess", () => {
  it("grants when owned tier equals required", () => {
    expect(hasAccess("basic", "basic")).toBe(true);
    expect(hasAccess("pro", "pro")).toBe(true);
    expect(hasAccess("free", "free")).toBe(true);
  });

  it("grants when owned tier outranks required", () => {
    expect(hasAccess("pro", "basic")).toBe(true);
    expect(hasAccess("pro", "free")).toBe(true);
    expect(hasAccess("basic", "free")).toBe(true);
  });

  it("denies when owned tier is below required", () => {
    expect(hasAccess("free", "basic")).toBe(false);
    expect(hasAccess("free", "pro")).toBe(false);
    expect(hasAccess("basic", "pro")).toBe(false);
  });
});

describe("parseTier", () => {
  it("accepts the three valid tiers", () => {
    expect(parseTier("free")).toBe("free");
    expect(parseTier("basic")).toBe("basic");
    expect(parseTier("pro")).toBe("pro");
  });

  it("returns null for unknown or missing values", () => {
    expect(parseTier("gold")).toBeNull();
    expect(parseTier(undefined)).toBeNull();
    expect(parseTier("")).toBeNull();
  });
});
