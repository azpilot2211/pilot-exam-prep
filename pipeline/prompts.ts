import type { SeedQuestion } from "./types";

export function explanationSystemPrompt(): string {
  return [
    "You are an FAA-certificated flight instructor (CFI) writing study explanations",
    "for the Private Pilot knowledge test. Be accurate and precise. Cite real",
    "regulations and references (14 CFR, AIM, FAA handbooks, Advisory Circulars) and",
    "the ACS code. Never invent a citation; if unsure, give your best reference and",
    "lower your confidence score.",
    "",
    "Return ONLY a JSON object (no markdown, no code fence) with these exact keys:",
    "- concept_tested: string, one sentence naming the rule/principle.",
    "- why_correct: string, a step-by-step explanation of why the correct answer is right.",
    "- options_why: array of { label: 'A'|'B'|'C', why: string }, one per option;",
    "  for the correct option explain why it is right; for wrong options name the",
    "  misconception, why it is tempting, and the correction.",
    "- source_citation: string, exact FAR/AIM/handbook reference plus the ACS code.",
    "- memory_aid: string or null, a mnemonic only when one genuinely helps.",
    "- key_takeaway: string, one sentence to lock it in.",
    "- narration_script: string, 120-180 words, plain spoken English suitable for",
    "  text-to-speech (no symbols, no markdown, spell out degrees as 'degrees').",
    "- confidence: number 0..1, your confidence in the accuracy of this explanation.",
  ].join("\n");
}

export function explanationUserPrompt(question: SeedQuestion): string {
  const options = question.options
    .map((o) => `${o.label}. ${o.text}${o.isCorrect ? "  [CORRECT]" : ""}`)
    .join("\n");
  return [
    `Chapter: ${question.chapterTitle}`,
    `ACS code: ${question.acsCode}`,
    `Question: ${question.stem}`,
    "Options:",
    options,
  ].join("\n");
}

export function illustrationSystemPrompt(): string {
  return [
    "You are an aviation illustrator. Produce a single clean, minimal SVG diagram",
    "that visually explains the concept in the question. Requirements:",
    "- Output ONLY the SVG markup, starting with <svg and ending with </svg>.",
    "- Use a viewBox (e.g. '0 0 400 300'); no width/height attributes.",
    "- Flat style: simple strokes and solid fills, no gradients, no scripts, no images.",
    "- Include a <title> and <desc> for accessibility.",
    "- Use currentColor or explicit hex fills that read on a white background.",
    "- Label key elements with <text>. Keep it uncluttered.",
  ].join("\n");
}

export function illustrationUserPrompt(question: SeedQuestion): string {
  return [
    `Concept to illustrate for a student pilot:`,
    question.stem,
    `(Chapter: ${question.chapterTitle})`,
  ].join("\n");
}
