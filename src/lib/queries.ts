import { createClient } from "./supabase/server";
import type { Database } from "./supabase/types";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionContent = Database["public"]["Tables"]["question_content"]["Row"];
export type AnswerOption = Database["public"]["Tables"]["answer_options"]["Row"];

export async function getChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getPublishedQuestions(chapterId: string): Promise<Question[]> {
  const supabase = await createClient();
  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const publishedIds = (published ?? []).map((r) => r.question_id);
  if (publishedIds.length === 0) return [];
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("chapter_id", chapterId)
    .in("id", publishedIds)
    .order("display_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export async function getQuestion(questionId: string): Promise<{
  question: Question;
  options: AnswerOption[];
  content: QuestionContent;
} | null> {
  const supabase = await createClient();
  const [qRes, optsRes, contentRes] = await Promise.all([
    supabase.from("questions").select("*").eq("id", questionId).maybeSingle(),
    supabase.from("answer_options").select("*").eq("question_id", questionId).order("label"),
    supabase.from("question_content").select("*").eq("question_id", questionId).maybeSingle(),
  ]);
  if (!qRes.data || !contentRes.data) return null;
  return {
    question: qRes.data as Question,
    options: optsRes.data ?? [],
    content: contentRes.data,
  };
}

export async function getUserAllMastery(
  userId: string
): Promise<Map<string, { correct: number; total: number }>> {
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("attempts")
    .select("question_id, is_correct, answered_at, questions!inner(chapter_id)")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });
  const seenQ = new Set<string>();
  const byChapter = new Map<string, { correct: number; total: number }>();
  for (const a of attempts ?? []) {
    if (seenQ.has(a.question_id)) continue;
    seenQ.add(a.question_id);
    const chapterId = (a.questions as { chapter_id: string }).chapter_id;
    if (!byChapter.has(chapterId)) byChapter.set(chapterId, { correct: 0, total: 0 });
    const s = byChapter.get(chapterId)!;
    s.total++;
    if (a.is_correct) s.correct++;
  }
  return byChapter;
}
