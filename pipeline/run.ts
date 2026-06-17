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
