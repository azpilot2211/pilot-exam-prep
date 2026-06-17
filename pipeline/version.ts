import { createHash } from "node:crypto";
import type { SeedQuestion } from "./types";

export function sourceVersion(question: SeedQuestion): string {
  const options = [...question.options]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((o) => `${o.label}:${o.isCorrect ? 1 : 0}:${o.text}`)
    .join("|");
  const payload = [
    question.sourceRef,
    question.stem,
    question.acsCode,
    options,
  ].join("␟");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
