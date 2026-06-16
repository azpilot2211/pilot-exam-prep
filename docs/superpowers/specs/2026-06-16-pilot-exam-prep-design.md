# Pilot Exam Prep — Design Spec

- **Date:** 2026-06-16
- **Status:** Approved design, pending written-spec review
- **Author:** Michael Driggs (with Claude)

## 1. Overview

A responsive web app that helps student pilots prepare for the FAA Private
Pilot written (knowledge) exam. For each question it shows the answer choices,
reveals the correct answer after the student commits, and teaches *why* the
correct answer is right and *why each wrong answer is wrong* — backed by an
auto-generated illustration and a narrated audio explanation.

The app is public: any student pilot can sign up and study on a laptop or
phone.

### Goals

- Present FAA Private Pilot knowledge-test questions, organized by chapter.
- For every question, deliver deep, specific reasoning with FAR/AIM/handbook
  citations.
- Provide a per-question illustration and premium narrated audio.
- Track per-chapter mastery and surface weak areas.
- Keep AI cost predictable and decoupled from traffic.

### Non-goals (YAGNI)

- No live, per-view AI generation in the student-facing path (all teaching
  content is pre-generated).
- No instructor/admin dashboards beyond a simple content-review/publish gate.
- No payment/subscription system in v1.
- No mobile native apps — responsive web only.

## 2. Audience

Public app for any student pilot. Requires user accounts (handled by Supabase
Auth) so progress can be saved per person.

## 3. Architecture

The system has two fully separate phases. This separation is what keeps a
public AI app affordable.

### Build-time (offline, runs occasionally)

A generation pipeline (a standalone script) reads official FAA materials, calls
Claude and a TTS service to produce all teaching content, and writes it once
into Supabase. Runs at initial build and again only when FAA materials change.

### Run-time (live, every visitor)

The Next.js web app reads pre-generated content from Supabase and serves it.
No AI calls in this path — instant and cheap. Per-visitor cost is effectively
just hosting/bandwidth.

## 4. Tech stack

- **Frontend + backend:** Next.js (React, TypeScript) — one project; serverless
  API routes hold any secrets.
- **Data + auth + storage:** Supabase (Postgres, Auth, Storage for audio/image
  assets).
- **Hosting:** Vercel.
- **AI (build-time):** Claude Opus 4.8 via the Anthropic TypeScript SDK
  (`@anthropic-ai/sdk`), with `thinking: {type: "adaptive"}`,
  `output_config: {effort: "high"}`, and streaming.
- **Voice (build-time):** Premium TTS service (recommendation: ElevenLabs for
  voice quality; OpenAI TTS as a lower-cost alternative). Final choice pending.
- **Question source:** Official FAA practice materials — published sample
  questions, the Airman Certification Standards (ACS), and FAA handbooks. Public
  domain, legally safe to redistribute.

## 5. Data model

Stored in Supabase Postgres. Generated teaching content is kept separate from
source questions so it can be regenerated without touching questions or user
history.

### `chapters`
- `id`, `slug`, `title`, `description`, `display_order`
- Examples: Weather, Flight Planning, Navigation, Regulations, Airspace,
  Aircraft Systems, Aerodynamics, Performance & Limitations, Aeromedical.

### `questions`
- `id`, `chapter_id` (FK), `stem` (question text), `acs_code`,
  `figure_ref` (optional — points to a sectional/instrument figure),
  `figure_image_url` (optional), `display_order`, `content_version` (hash used
  by the pipeline for idempotent re-runs).

### `answer_options`
- `id`, `question_id` (FK), `label` (A/B/C), `text`, `is_correct`,
  `why` (structured reasoning: for the correct option, why it's right; for
  wrong options, the misconception → why it's tempting → the correction).
- FAA knowledge-test questions have three options.

### `question_content` (1:1 with `questions`)
- `question_id` (FK, unique), `concept_tested` (one-sentence rule),
  `explanation` (step-by-step teaching walkthrough), `source_citation`
  (FAR/AIM/handbook reference, shown to students), `memory_aid` (optional),
  `key_takeaway` (one line), `illustration_svg`, `audio_url`,
  `published` (boolean — content-review gate).

### `profiles`
- App-specific user data keyed to Supabase `auth.users`.

### `attempts`
- `id`, `user_id` (FK), `question_id` (FK), `selected_label`, `is_correct`,
  `answered_at`. Powers per-chapter mastery and weak-area surfacing.

## 6. Explanation template

Every generated explanation must contain these fields (the pipeline enforces
their presence; missing or low-confidence items are flagged for review):

| Field | Contents |
|---|---|
| Concept tested | The single rule/principle, one sentence |
| Why correct | Step-by-step reasoning or calculation — not a restatement |
| Source citation | Exact FAR/AIM/handbook reference + ACS code, **shown to students** |
| Why each wrong answer fails | Misconception → why it's tempting → the correction |
| Memory aid | A mnemonic, when one genuinely helps |
| Key takeaway | One-line summary |

The "why it's tempting" line is deliberate: FAA distractors are plausible by
design, and naming the trap is what prevents the mistake on test day. Citations
build trust, let students verify, and are the primary check for AI accuracy
during review.

## 7. Screens

1. **Home / chapters** — grid of chapter cards with per-chapter mastery %, an
   overall "exam readiness" figure, and a "continue where you left off" action.
2. **Study view** — one question; after the student commits, it marks their
   pick, highlights the correct answer, and reveals the explanation,
   illustration, "why the others are wrong," and a one-tap audio narration bar.
   Prev/Next and "mark for review."
3. **Quiz mode** — a scored set (chapter quiz or full mock exam), optionally
   timed, ending in a results screen that flags what to review.
4. **Progress** — per-chapter mastery bars, weak areas, and a study streak.
5. **Sign in / sign up** — minimal, via Supabase Auth.

**Design language:** clean and confidence-inspiring — generous whitespace, high
legibility for small screens, an aviation-tinged accent, color used only to
carry meaning (green = correct, red = wrong, blue = app accent).

## 8. Generation pipeline

A standalone TypeScript script, separate from the web app. Per question:

1. Read the source question from a seed file (curated from FAA materials).
2. Call Claude Opus 4.8 (adaptive thinking, `effort: high`, streaming) with the
   structured-explanation prompt → returns concept, reasoning, per-distractor
   "why it fails," citations, memory aid, key takeaway, and the SVG
   illustration in one structured response.
3. Validation pass — confirm every required field is present and a citation
   exists; flag anything missing or low-confidence.
4. Send the explanation text to the TTS service → upload audio to Supabase
   Storage.
5. Write the finished content to Supabase.

**Idempotent and resumable:** tracks completed questions by `content_version`
hash, so re-runs only process new or changed questions — no duplicates, no
wasted spend.

## 9. Accuracy gate

Nothing reaches students unreviewed. Generated content is staged with a
`published = false` flag; the author spot-checks (especially validator-flagged
items, verifying against the cited FAR/AIM), then publishes. Required citations
make review fast.

## 10. Error handling (runtime)

- Clean loading skeletons and a "couldn't load — retry" state.
- Secrets (Anthropic, TTS, Supabase service key) live only in serverless
  backend code, never shipped to the browser.
- If a question's audio fails to load, fall back to the browser's built-in
  speech so the lesson never breaks.

## 11. Testing

- Unit tests for correctness-critical logic: quiz scoring, progress/mastery
  math.
- Schema-validation tests ensuring generated content always matches the
  explanation template (all fields + citation present).
- One end-to-end smoke test of the core flow: pick chapter → answer → reveal.

## 12. Cost

The only meaningful AI spend is the one-time generation batch (a few hundred
questions × one Opus call + one TTS call each) — bounded and predictable. At
run-time the app serves stored files, so cost does not grow with traffic. A
re-run after FAA updates only reprocesses changed questions.

## 13. Open decisions & dependencies

- **TTS provider** — pick ElevenLabs (voice quality) vs OpenAI TTS (cost).
- **Seed question set** — gather the official FAA questions/materials to load
  as pipeline input.
- **Accounts/keys needed before the pipeline can run:** Anthropic API key
  (have), Supabase project (URL + anon key + service-role key), TTS provider
  key. Vercel account needed at deploy time.
