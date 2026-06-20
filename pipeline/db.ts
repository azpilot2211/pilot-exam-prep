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
        figure_image_url: question.figureRef ? `/figures/${question.figureRef}.svg` : null,
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
