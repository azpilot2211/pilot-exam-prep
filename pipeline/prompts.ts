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
    "You are a professional aviation technical illustrator creating rich, detailed SVG diagrams",
    "for an FAA Private Pilot exam study app. Your diagrams must be immediately educational —",
    "a student should understand the concept just by looking at your diagram.",
    "",
    "Output ONLY the SVG markup, starting exactly with <svg and ending with </svg>.",
    "",
    "Technical requirements:",
    "- viewBox='0 0 500 360'; no width/height attributes on the root element.",
    "- No JavaScript, no <image> tags, no external references.",
    "- Include a <title> and <desc> for accessibility.",
    "- Use <defs> with linear or radial gradients freely to add depth and realism.",
    "- Background: a very light gradient (e.g., sky: #e0f2fe to #bae6fd, ground: #d1fae5 to #a7f3d0).",
    "",
    "Illustration quality standards — ALL diagrams must have:",
    "- Multiple labeled components (use <text> with readable 11–14px font sizes).",
    "- Dimension/measurement annotations where relevant (altitude numbers, distances, angles, degrees).",
    "- Directional arrows (<marker> arrowheads on <line> or <path> elements) to show movement,",
    "  force vectors, flow, or relationships between elements.",
    "- Color-coding: use distinct fills to differentiate zones, states, or categories.",
    "  Good aviation palette: sky blue #38bdf8, ground green #4ade80, airspace purple #a78bfa,",
    "  restricted red #f87171, caution amber #fbbf24, safe green #34d399, neutral gray #94a3b8.",
    "- An aircraft silhouette (simple but recognizable: fuselage, wings, tail) when relevant.",
    "- A small legend box in a corner if you use color-coded zones.",
    "",
    "Diagram types to use by concept (match to the question):",
    "- Airspace: concentric/layered colored bands with altitude labels on the left axis,",
    "  airport symbol at center, class letters in each band.",
    "- Navigation/VOR: compass rose with labeled radials, aircraft position, CDI needle depiction.",
    "- Weather: atmospheric cross-section with labeled cloud types, fronts as colored lines with symbols.",
    "- Aerodynamics: airfoil cross-section with labeled force vectors (Lift, Drag, Thrust, Weight),",
    "  angle-of-attack arc, airflow streamlines.",
    "- Performance/W&B: bar or envelope chart with CG range marked, load lines.",
    "- Traffic pattern: overhead view of runway with labeled legs (Crosswind, Downwind, Base, Final),",
    "  altitude callouts, wind arrow.",
    "- Emergency: step-by-step numbered callouts overlaid on a scenario.",
    "",
    "Make every diagram rich enough that it could appear in an official FAA training handbook.",
    "Use proper aviation conventions (runways oriented realistically, north-up orientation where applicable).",
  ].join("\n");
}

export function illustrationUserPrompt(question: SeedQuestion): string {
  const correct = question.options.find((o) => o.isCorrect);
  return [
    `Draw a detailed aviation diagram for this FAA exam concept.`,
    ``,
    `Chapter: ${question.chapterTitle}`,
    `Question: ${question.stem}`,
    correct ? `Correct answer: ${correct.label}. ${correct.text}` : "",
    ``,
    `The diagram should make the correct answer visually obvious and help a student`,
    `remember this concept. Include all relevant labels, measurements, and annotations.`,
  ].filter(Boolean).join("\n");
}
