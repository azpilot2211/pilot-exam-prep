# Pilot Exam Prep — Plan 2: Generation Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline TypeScript pipeline that reads FAA seed questions, generates a structured explanation (Claude Opus 4.8) and an SVG illustration per question, narrates the explanation with ElevenLabs, uploads audio to Supabase Storage, and writes everything into the database — idempotently and staged unpublished for review.

**Architecture:** A standalone `pipeline/` program, separate from the Next.js app, run with `tsx`. It loads secrets from `.env.local`, uses the Anthropic SDK for generation, the ElevenLabs REST API for narration, and a Supabase admin client (service_role key, bypasses RLS) for writes. Pure logic (hashing, schema validation, DB payload mapping) is unit-tested with Vitest; network modules are thin and verified with a real `--dry-run` then a live single-question run.

**Tech Stack:** TypeScript, `tsx`, `@anthropic-ai/sdk` (Claude Opus 4.8, adaptive thinking, `effort: high`, streaming), `zod`, ElevenLabs REST API (`fetch`), `@supabase/supabase-js` (already installed), `dotenv`.

This is Plan 2 of 3. It depends on Plan 1 (schema, Supabase project). Plan 3 (web app) reads the content this pipeline produces.

---

## Prerequisites (human, one-time)

Add these to `.env.local` (gitignored) before Task 6:

```
SUPABASE_SERVICE_ROLE_KEY=<your service_role secret key from Supabase → Settings → API>
ANTHROPIC_API_KEY=<your Anthropic API key>
ELEVENLABS_API_KEY=<your ElevenLabs API key>
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

(`21m00Tcm4TlvDq8ikWAM` is ElevenLabs' default "Rachel" voice — replace with any voice id from your ElevenLabs dashboard.)

Also run this once in the Supabase dashboard SQL Editor to create the public audio bucket and the `source_ref` column (covered again in Tasks 1 and 9 so the engineer has the exact SQL):

```sql
alter table questions add column if not exists source_ref text unique;
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;
```

---

## File Structure (this plan)

- Create: `pipeline/env.ts` (loads `.env.local`)
- Create: `pipeline/types.ts` (SeedQuestion, SeedChapter shapes)
- Create: `pipeline/seed/questions.ts` (starter FAA question set)
- Create: `pipeline/version.ts` + `pipeline/version.test.ts` (source hashing)
- Create: `pipeline/schema.ts` + `pipeline/schema.test.ts` (Zod schema for generated content)
- Create: `pipeline/mapping.ts` + `pipeline/mapping.test.ts` (parsed generation → DB rows)
- Create: `pipeline/prompts.ts` (Claude prompt builders)
- Create: `pipeline/generate.ts` (Claude explanation generator)
- Create: `pipeline/illustrate.ts` (Claude SVG generator)
- Create: `pipeline/tts.ts` (ElevenLabs narration + Storage upload)
- Create: `pipeline/db.ts` (Supabase admin client + upserts)
- Create: `pipeline/run.ts` (orchestrator)
- Create: `supabase/migrations/0002_question_source_ref.sql`
- Modify: `vitest.config.ts` (include `pipeline/**/*.test.ts`)
- Modify: `package.json` (deps + scripts)
- Modify: `.env.example` (document new vars)

---

## Task 1: Pipeline dependencies, env loader, migration, test config

**Files:**
- Modify: `package.json`, `vitest.config.ts`, `.env.example`
- Create: `pipeline/env.ts`, `supabase/migrations/0002_question_source_ref.sql`

- [ ] **Step 1: Install dependencies**

```bash
npm install @anthropic-ai/sdk zod
npm install -D tsx dotenv
```

- [ ] **Step 2: Update `vitest.config.ts` to include pipeline tests**

Replace the file with:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "pipeline/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add pipeline scripts to `package.json`**

In `"scripts"` add:

```json
"pipeline": "tsx pipeline/run.ts",
"pipeline:dry": "tsx pipeline/run.ts --dry-run"
```

- [ ] **Step 4: Create the env loader `pipeline/env.ts`**

```ts
import { config } from "dotenv";

config({ path: ".env.local" });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  elevenLabsKey: () => required("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: () => process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
};
```

- [ ] **Step 5: Document the new env vars in `.env.example`**

Append to `.env.example`:

```
ANTHROPIC_API_KEY=your-anthropic-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

- [ ] **Step 6: Create the migration `supabase/migrations/0002_question_source_ref.sql`**

```sql
alter table questions add column if not exists source_ref text unique;

insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;
```

- [ ] **Step 7: Verify install + typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .env.example pipeline/env.ts supabase/migrations/0002_question_source_ref.sql
git commit -m "chore: set up generation pipeline deps, env loader, and migration"
```

---

## Task 2: Seed data types and starter FAA question set

**Files:**
- Create: `pipeline/types.ts`, `pipeline/seed/questions.ts`

- [ ] **Step 1: Create `pipeline/types.ts`**

```ts
export type OptionLabel = "A" | "B" | "C";

export interface SeedOption {
  label: OptionLabel;
  text: string;
  isCorrect: boolean;
}

export interface SeedQuestion {
  sourceRef: string;
  chapterSlug: string;
  chapterTitle: string;
  chapterOrder: number;
  chapterDescription: string;
  stem: string;
  acsCode: string;
  figureRef?: string;
  options: SeedOption[];
}
```

- [ ] **Step 2: Create the starter question set `pipeline/seed/questions.ts`**

These are drawn from FAA public materials (regulations, the Pilot's Handbook of Aeronautical Knowledge, and the ACS). Verify each correct answer against the cited reg during review.

```ts
import type { SeedQuestion } from "../types";

export const seedQuestions: SeedQuestion[] = [
  {
    sourceRef: "nav-vot-check",
    chapterSlug: "navigation",
    chapterTitle: "Navigation",
    chapterOrder: 3,
    chapterDescription: "VOR, GPS, charts, and dead reckoning.",
    stem: "While checking a VOR receiver with a VOT, the CDI centers. The OBS and TO/FROM indicator should read:",
    acsCode: "PA.VI.B",
    options: [
      { label: "A", text: "0° TO or 180° FROM", isCorrect: false },
      { label: "B", text: "0° FROM or 180° TO", isCorrect: true },
      { label: "C", text: "360° TO only", isCorrect: false },
    ],
  },
  {
    sourceRef: "wx-vfr-cloud-clearance-class-e-below-10k",
    chapterSlug: "weather",
    chapterTitle: "Weather",
    chapterOrder: 1,
    chapterDescription: "Weather theory, reports, forecasts, and VFR minimums.",
    stem: "What minimum cloud clearance is required for VFR flight in controlled airspace (Class E) below 10,000 feet MSL during daytime?",
    acsCode: "PA.I.C",
    options: [
      { label: "A", text: "500 feet below, 1,000 feet above, and 2,000 feet horizontal", isCorrect: true },
      { label: "B", text: "500 feet above, 1,000 feet below, and 2,000 feet horizontal", isCorrect: false },
      { label: "C", text: "Clear of clouds", isCorrect: false },
    ],
  },
  {
    sourceRef: "reg-required-docs-arrow",
    chapterSlug: "regulations",
    chapterTitle: "Regulations",
    chapterOrder: 2,
    chapterDescription: "14 CFR Parts 61 and 91 rules for pilots and aircraft.",
    stem: "Which documents must be aboard an aircraft during flight?",
    acsCode: "PA.I.B",
    options: [
      { label: "A", text: "Airworthiness certificate, registration, and a maintenance logbook", isCorrect: false },
      { label: "B", text: "Airworthiness certificate, registration, operating limitations, and weight and balance data", isCorrect: true },
      { label: "C", text: "Registration, radio station license, and a list of required equipment", isCorrect: false },
    ],
  },
  {
    sourceRef: "aero-load-factor-turn",
    chapterSlug: "aerodynamics",
    chapterTitle: "Aerodynamics",
    chapterOrder: 6,
    chapterDescription: "Forces of flight, stability, and aircraft performance limits.",
    stem: "As bank angle increases in a constant-altitude turn, the load factor and the stall speed will:",
    acsCode: "PA.I.F",
    options: [
      { label: "A", text: "Both increase", isCorrect: true },
      { label: "B", text: "Both decrease", isCorrect: false },
      { label: "C", text: "Load factor increases while stall speed remains constant", isCorrect: false },
    ],
  },
];
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add pipeline/types.ts pipeline/seed/questions.ts
git commit -m "feat: add seed question types and starter FAA question set"
```

---

## Task 3: Source version hashing (TDD)

The pipeline regenerates a question only when its source content changes. `sourceVersion` produces a stable hash of the meaningful fields.

**Files:**
- Create: `pipeline/version.ts`
- Test: `pipeline/version.test.ts`

- [ ] **Step 1: Write the failing test `pipeline/version.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot import `sourceVersion`.

- [ ] **Step 3: Implement `pipeline/version.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — all 4 `sourceVersion` tests green (plus the existing scoring tests).

- [ ] **Step 5: Commit**

```bash
git add pipeline/version.ts pipeline/version.test.ts
git commit -m "feat: add source version hashing for idempotent regeneration"
```

---

## Task 4: Generated-content schema (TDD)

Defines and validates the structured object Claude must return. Validation failure triggers a regenerate/flag in the orchestrator.

**Files:**
- Create: `pipeline/schema.ts`
- Test: `pipeline/schema.test.ts`

- [ ] **Step 1: Write the failing test `pipeline/schema.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot import from `./schema`.

- [ ] **Step 3: Implement `pipeline/schema.ts`**

```ts
import { z } from "zod";

export const generatedExplanationSchema = z.object({
  concept_tested: z.string().min(1),
  why_correct: z.string().min(1),
  options_why: z
    .array(
      z.object({
        label: z.enum(["A", "B", "C"]),
        why: z.string().min(1),
      })
    )
    .min(2),
  source_citation: z.string().min(1),
  memory_aid: z.string().min(1).nullable(),
  key_takeaway: z.string().min(1),
  narration_script: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type GeneratedExplanation = z.infer<typeof generatedExplanationSchema>;

export function parseGeneratedExplanation(input: unknown) {
  return generatedExplanationSchema.safeParse(input);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — all 5 schema tests green.

- [ ] **Step 5: Commit**

```bash
git add pipeline/schema.ts pipeline/schema.test.ts
git commit -m "feat: add generated-content schema and validation"
```

---

## Task 5: DB payload mapping (TDD)

Turns a validated generation + seed question into the exact rows the database writer will upsert. Pure function, no I/O.

**Files:**
- Create: `pipeline/mapping.ts`
- Test: `pipeline/mapping.test.ts`

- [ ] **Step 1: Write the failing test `pipeline/mapping.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildAnswerOptionRows, buildContentRow } from "./mapping";
import type { SeedQuestion } from "./types";
import type { GeneratedExplanation } from "./schema";

const question: SeedQuestion = {
  sourceRef: "nav-vot-check",
  chapterSlug: "navigation",
  chapterTitle: "Navigation",
  chapterOrder: 3,
  chapterDescription: "desc",
  stem: "Stem?",
  acsCode: "PA.VI.B",
  options: [
    { label: "A", text: "wrong", isCorrect: false },
    { label: "B", text: "right", isCorrect: true },
    { label: "C", text: "wrong2", isCorrect: false },
  ],
};

const gen: GeneratedExplanation = {
  concept_tested: "concept",
  why_correct: "because",
  options_why: [
    { label: "A", why: "A is wrong" },
    { label: "B", why: "B is right" },
    { label: "C", why: "C is wrong" },
  ],
  source_citation: "14 CFR 91.171",
  memory_aid: "aid",
  key_takeaway: "takeaway",
  narration_script: "spoken",
  confidence: 0.9,
};

describe("buildAnswerOptionRows", () => {
  it("pairs each option with its why text and correctness", () => {
    const rows = buildAnswerOptionRows("q-id", question, gen);
    expect(rows).toEqual([
      { question_id: "q-id", label: "A", text: "wrong", is_correct: false, why: "A is wrong" },
      { question_id: "q-id", label: "B", text: "right", is_correct: true, why: "B is right" },
      { question_id: "q-id", label: "C", text: "wrong2", is_correct: false, why: "C is wrong" },
    ]);
  });

  it("throws if an option has no matching why", () => {
    const incomplete = { ...gen, options_why: [{ label: "A" as const, why: "only A" }] };
    expect(() => buildAnswerOptionRows("q-id", question, incomplete)).toThrow();
  });
});

describe("buildContentRow", () => {
  it("maps generation fields and audio url, unpublished", () => {
    const row = buildContentRow("q-id", gen, "<svg/>", "https://audio/x.mp3");
    expect(row.question_id).toBe("q-id");
    expect(row.explanation).toBe("because");
    expect(row.source_citation).toBe("14 CFR 91.171");
    expect(row.illustration_svg).toBe("<svg/>");
    expect(row.audio_url).toBe("https://audio/x.mp3");
    expect(row.published).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot import from `./mapping`.

- [ ] **Step 3: Implement `pipeline/mapping.ts`**

```ts
import type { SeedQuestion } from "./types";
import type { GeneratedExplanation } from "./schema";

export interface AnswerOptionRow {
  question_id: string;
  label: string;
  text: string;
  is_correct: boolean;
  why: string;
}

export interface ContentRow {
  question_id: string;
  concept_tested: string;
  explanation: string;
  source_citation: string;
  memory_aid: string | null;
  key_takeaway: string;
  illustration_svg: string;
  audio_url: string;
  published: boolean;
  generated_at: string;
}

export function buildAnswerOptionRows(
  questionId: string,
  question: SeedQuestion,
  gen: GeneratedExplanation
): AnswerOptionRow[] {
  return question.options.map((option) => {
    const match = gen.options_why.find((w) => w.label === option.label);
    if (!match) {
      throw new Error(`No why text generated for option ${option.label}`);
    }
    return {
      question_id: questionId,
      label: option.label,
      text: option.text,
      is_correct: option.isCorrect,
      why: match.why,
    };
  });
}

export function buildContentRow(
  questionId: string,
  gen: GeneratedExplanation,
  illustrationSvg: string,
  audioUrl: string
): ContentRow {
  return {
    question_id: questionId,
    concept_tested: gen.concept_tested,
    explanation: gen.why_correct,
    source_citation: gen.source_citation,
    memory_aid: gen.memory_aid,
    key_takeaway: gen.key_takeaway,
    illustration_svg: illustrationSvg,
    audio_url: audioUrl,
    published: false,
    generated_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — all mapping tests green.

- [ ] **Step 5: Commit**

```bash
git add pipeline/mapping.ts pipeline/mapping.test.ts
git commit -m "feat: add DB payload mapping from generation to rows"
```

---

## Task 6: Claude explanation generator

Calls Claude Opus 4.8 to produce the structured explanation. Network module; verified live in Task 10.

**Files:**
- Create: `pipeline/prompts.ts`, `pipeline/generate.ts`

- [ ] **Step 1: Create `pipeline/prompts.ts`**

```ts
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
```

- [ ] **Step 2: Create `pipeline/generate.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { SeedQuestion } from "./types";
import { explanationSystemPrompt, explanationUserPrompt } from "./prompts";
import { parseGeneratedExplanation, type GeneratedExplanation } from "./schema";

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateExplanation(
  question: SeedQuestion,
  client = new Anthropic({ apiKey: env.anthropicKey() })
): Promise<GeneratedExplanation> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: explanationSystemPrompt(),
    messages: [{ role: "user", content: explanationUserPrompt(question) }],
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = parseGeneratedExplanation(extractJson(text));
  if (!parsed.success) {
    throw new Error(`Generated explanation failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add pipeline/prompts.ts pipeline/generate.ts
git commit -m "feat: add Claude explanation generator"
```

---

## Task 7: Claude SVG illustration generator

**Files:**
- Modify: `pipeline/prompts.ts`
- Create: `pipeline/illustrate.ts`

- [ ] **Step 1: Add the illustration prompts to `pipeline/prompts.ts`**

Append:

```ts
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
```

- [ ] **Step 2: Create `pipeline/illustrate.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { SeedQuestion } from "./types";
import { illustrationSystemPrompt, illustrationUserPrompt } from "./prompts";

export function extractSvg(text: string): string {
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No SVG markup found in model response");
  }
  return text.slice(start, end + "</svg>".length);
}

export async function generateIllustration(
  question: SeedQuestion,
  client = new Anthropic({ apiKey: env.anthropicKey() })
): Promise<string> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: illustrationSystemPrompt(),
    messages: [{ role: "user", content: illustrationUserPrompt(question) }],
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return extractSvg(text);
}
```

- [ ] **Step 3: Add a unit test for `extractSvg` — `pipeline/illustrate.test.ts`**

```ts
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
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test
npx tsc --noEmit
```

Expected: PASS (2 new tests green); no type errors.

- [ ] **Step 5: Commit**

```bash
git add pipeline/prompts.ts pipeline/illustrate.ts pipeline/illustrate.test.ts
git commit -m "feat: add Claude SVG illustration generator"
```

---

## Task 8: ElevenLabs narration + Supabase Storage upload

**Files:**
- Create: `pipeline/tts.ts`

- [ ] **Step 1: Create `pipeline/tts.ts`**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export async function synthesizeNarration(script: string): Promise<Buffer> {
  const voiceId = env.elevenLabsVoiceId();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${detail}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadAudio(
  admin: SupabaseClient,
  sourceRef: string,
  audio: Buffer
): Promise<string> {
  const path = `${sourceRef}.mp3`;
  const { error } = await admin.storage
    .from("audio")
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = admin.storage.from("audio").getPublicUrl(path);
  return data.publicUrl;
}

export function adminClient(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add pipeline/tts.ts
git commit -m "feat: add ElevenLabs narration and Supabase Storage upload"
```

---

## Task 9: Supabase admin writer (upserts)

**Files:**
- Create: `pipeline/db.ts`

- [ ] **Step 1: Create `pipeline/db.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeedQuestion } from "./types";
import type { AnswerOptionRow, ContentRow } from "./mapping";

export async function upsertChapter(
  admin: SupabaseClient,
  question: SeedQuestion
): Promise<void> {
  const { error } = await admin.from("chapters").upsert(
    {
      slug: question.chapterSlug,
      title: question.chapterTitle,
      description: question.chapterDescription,
      display_order: question.chapterOrder,
    },
    { onConflict: "slug" }
  );
  if (error) throw new Error(`Chapter upsert failed: ${error.message}`);
}

export async function upsertQuestion(
  admin: SupabaseClient,
  question: SeedQuestion,
  version: string
): Promise<string> {
  const { data: chapter, error: chapterErr } = await admin
    .from("chapters")
    .select("id")
    .eq("slug", question.chapterSlug)
    .single();
  if (chapterErr || !chapter) {
    throw new Error(`Chapter not found for slug ${question.chapterSlug}`);
  }

  const { data, error } = await admin
    .from("questions")
    .upsert(
      {
        chapter_id: chapter.id,
        stem: question.stem,
        acs_code: question.acsCode,
        figure_ref: question.figureRef ?? null,
        source_ref: question.sourceRef,
        content_version: version,
      },
      { onConflict: "source_ref" }
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`Question upsert failed: ${error?.message}`);
  return data.id;
}

export async function existingVersion(
  admin: SupabaseClient,
  sourceRef: string
): Promise<{ version: string | null; hasContent: boolean }> {
  const { data: question } = await admin
    .from("questions")
    .select("id, content_version")
    .eq("source_ref", sourceRef)
    .maybeSingle();
  if (!question) return { version: null, hasContent: false };
  const { count } = await admin
    .from("question_content")
    .select("question_id", { count: "exact", head: true })
    .eq("question_id", question.id);
  return { version: question.content_version, hasContent: (count ?? 0) > 0 };
}

export async function writeAnswerOptions(
  admin: SupabaseClient,
  rows: AnswerOptionRow[]
): Promise<void> {
  const { error } = await admin
    .from("answer_options")
    .upsert(rows, { onConflict: "question_id,label" });
  if (error) throw new Error(`Answer options upsert failed: ${error.message}`);
}

export async function writeContent(
  admin: SupabaseClient,
  row: ContentRow
): Promise<void> {
  const { error } = await admin
    .from("question_content")
    .upsert(row, { onConflict: "question_id" });
  if (error) throw new Error(`Question content upsert failed: ${error.message}`);
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add pipeline/db.ts
git commit -m "feat: add Supabase admin upsert helpers"
```

---

## Task 10: Orchestrator + live verification

**Files:**
- Create: `pipeline/run.ts`

- [ ] **Step 1: Create `pipeline/run.ts`**

```ts
import { seedQuestions } from "./seed/questions";
import { sourceVersion } from "./version";
import { generateExplanation } from "./generate";
import { generateIllustration } from "./illustrate";
import { synthesizeNarration, uploadAudio, adminClient } from "./tts";
import { buildAnswerOptionRows, buildContentRow } from "./mapping";
import {
  upsertChapter,
  upsertQuestion,
  existingVersion,
  writeAnswerOptions,
  writeContent,
} from "./db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const admin = adminClient();
  let processed = 0;

  for (const question of seedQuestions) {
    if (processed >= limit) break;
    const version = sourceVersion(question);
    const existing = await existingVersion(admin, question.sourceRef);

    if (existing.version === version && existing.hasContent) {
      console.log(`skip   ${question.sourceRef} (unchanged)`);
      continue;
    }

    console.log(`build  ${question.sourceRef} ...`);
    if (dryRun) {
      console.log(`       [dry-run] would generate + narrate + write`);
      processed++;
      continue;
    }

    await upsertChapter(admin, question);
    const questionId = await upsertQuestion(admin, question, version);

    const explanation = await generateExplanation(question);
    const svg = await generateIllustration(question);
    const audio = await synthesizeNarration(explanation.narration_script);
    const audioUrl = await uploadAudio(admin, question.sourceRef, audio);

    await writeAnswerOptions(
      admin,
      buildAnswerOptionRows(questionId, question, explanation)
    );
    await writeContent(
      admin,
      buildContentRow(questionId, explanation, svg, audioUrl)
    );

    const flag = explanation.confidence < 0.8 ? "  ⚠ LOW CONFIDENCE — review" : "";
    console.log(`done   ${question.sourceRef} (confidence ${explanation.confidence})${flag}`);
    processed++;
  }

  console.log(`\nProcessed ${processed} question(s). Content is unpublished; review then set published = true.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Apply the migration in the Supabase dashboard**

In the Supabase SQL Editor, run the contents of `supabase/migrations/0002_question_source_ref.sql`:

```sql
alter table questions add column if not exists source_ref text unique;

insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;
```

Expected: "Success. No rows returned."

- [ ] **Step 3: Dry-run the pipeline (no API spend)**

Ensure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set (the dry run still reads the DB). Then:

```bash
npm run pipeline:dry
```

Expected: lists each seed question as `build ... [dry-run] would generate...` (or `skip` if already present). No errors.

- [ ] **Step 4: Live-run a single question**

```bash
npm run pipeline -- --limit=1
```

Expected: `done nav-vot-check (confidence 0.xx)` and a final summary line. This makes real Claude + ElevenLabs calls and writes one full content record.

- [ ] **Step 5: Verify the content landed**

In the Supabase dashboard (Table Editor), confirm `question_content` has a row for the VOT question with non-empty `explanation`, `illustration_svg`, and an `audio_url`; confirm `answer_options` has three rows with `why` text; and that the `audio` storage bucket has `nav-vot-check.mp3`. Open the `audio_url` in a browser to confirm the narration plays.

- [ ] **Step 6: Commit**

```bash
git add pipeline/run.ts
git commit -m "feat: add generation pipeline orchestrator"
```

- [ ] **Step 7: Run the full pipeline (all seed questions)**

```bash
npm run pipeline
```

Expected: each question processed `done` with a confidence score; low-confidence items flagged for review. All content remains unpublished.

---

## Self-Review Notes

- **Spec coverage (Plan 2 scope):** generation pipeline §8 → Tasks 6–10; structured explanation template §6 → Tasks 4, 6 (schema + prompt enforce all fields); illustrations → Task 7; premium TTS (ElevenLabs) → Task 8; accuracy gate §9 → `published=false` default (Task 5) + low-confidence flag (Task 10); idempotency → Task 3 + `existingVersion` (Tasks 9–10); FAA seed source → Task 2.
- **Deferred to Plan 3:** publishing UI / review workflow surface, and all student-facing reading of this content.
- **Type consistency:** `SeedQuestion`/`SeedOption` (Task 2) flow through `sourceVersion` (3), `buildAnswerOptionRows`/`buildContentRow` (5), and `db.ts` (9). `GeneratedExplanation` (Task 4) is produced by `generateExplanation` (6) and consumed by mapping (5) and `run.ts` (10). `adminClient()` (Task 8) is the single Supabase admin client used by `db.ts` and `tts.ts`.
- **Manual env step:** `service_role`, Anthropic, and ElevenLabs keys must be in `.env.local` before Task 10; the migration (Task 10 Step 2) must be applied before the live run.
- **API-surface note:** `generate.ts`/`illustrate.ts` use `messages.stream(...).finalMessage()` with `thinking: {type:"adaptive"}` and `output_config: {effort:"high"}` per the claude-api defaults, and parse JSON/SVG defensively rather than relying on a specific structured-output binding — robust across SDK versions.
