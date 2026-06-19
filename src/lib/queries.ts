import { createClient } from "./supabase/server";
import type { Database } from "./supabase/types";
import type { ExamQuestion } from "./examUtils";

export type Chapter = Database["public"]["Tables"]["chapters"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionContent = Database["public"]["Tables"]["question_content"]["Row"];
export type AnswerOption = Database["public"]["Tables"]["answer_options"]["Row"];

export async function getProfile(userId: string): Promise<{
  display_name?: string | null;
  avatar_color?: string | null;
} | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function getChapters(): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Slugs of the two lowest-display_order chapters — the free sample set. */
export async function getFreeChapterSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("slug")
    .order("display_order")
    .limit(2);
  return (data ?? []).map((c) => c.slug);
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

export type Lesson = {
  questionId: string;
  stem: string;
  explanation: string;
  illustrationSvg: string | null;
  audioUrl: string | null;
};

export async function getPublishedLessons(chapterId: string): Promise<Lesson[]> {
  const questions = await getPublishedQuestions(chapterId);
  if (questions.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("question_content")
    .select("question_id, explanation, illustration_svg, audio_url")
    .in("question_id", questions.map((q) => q.id))
    .eq("published", true);

  const contentMap = new Map(
    (data ?? []).map((c) => [c.question_id, c])
  );

  return questions
    .map((q) => {
      const content = contentMap.get(q.id);
      if (!content) return null;
      return {
        questionId: q.id,
        stem: q.stem,
        explanation: content.explanation ?? "",
        illustrationSvg: content.illustration_svg ?? null,
        audioUrl: content.audio_url ?? null,
      };
    })
    .filter((l): l is Lesson => l !== null);
}

/** Every published lesson's audio URL, in course order (chapter display_order → lesson order). */
export async function getCourseAudioUrls(): Promise<string[]> {
  const chapters = await getChapters();
  const perChapter = await Promise.all(
    chapters.map((c) => getPublishedLessons(c.id))
  );
  return perChapter
    .flat()
    .map((l) => l.audioUrl)
    .filter((u): u is string => !!u);
}

export async function getPublishedQuestionCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const publishedIds = (published ?? []).map((r) => r.question_id);
  if (publishedIds.length === 0) return new Map();
  const { data: questions } = await supabase
    .from("questions")
    .select("chapter_id")
    .in("id", publishedIds);
  const counts = new Map<string, number>();
  for (const q of questions ?? []) {
    counts.set(q.chapter_id, (counts.get(q.chapter_id) ?? 0) + 1);
  }
  return counts;
}

export async function getDailyQuestion(): Promise<{
  question: Question;
  options: AnswerOption[];
  chapterTitle: string;
  chapterSlug: string;
} | null> {
  const supabase = await createClient();

  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const ids = (published ?? []).map((r) => r.question_id);
  if (ids.length === 0) return null;

  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % ids.length;
  const pickedId = ids.sort()[idx];

  const [qRes, optsRes, chapterRes] = await Promise.all([
    supabase.from("questions").select("*").eq("id", pickedId).maybeSingle(),
    supabase.from("answer_options").select("*").eq("question_id", pickedId).order("label"),
    supabase
      .from("questions")
      .select("chapters!inner(slug, title)")
      .eq("id", pickedId)
      .maybeSingle(),
  ]);

  if (!qRes.data) return null;
  const chapter = (chapterRes.data?.chapters as { slug: string; title: string } | null);

  return {
    question: qRes.data as Question,
    options: optsRes.data ?? [],
    chapterTitle: chapter?.title ?? "",
    chapterSlug: chapter?.slug ?? "",
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

export type ExamResultRow = {
  id: string;
  score: number;
  total: number;
  taken_at: string;
  breakdown: Record<string, { correct: number; total: number }>;
};

export async function getQuestionsForExam(): Promise<ExamQuestion[]> {
  const supabase = await createClient();

  const { data: published } = await supabase
    .from("question_content")
    .select("question_id")
    .eq("published", true);
  const ids = (published ?? []).map((r) => r.question_id);
  if (ids.length === 0) return [];

  const [questionsRes, optionsRes] = await Promise.all([
    supabase
      .from("questions")
      .select("id, stem, chapters!inner(slug, title)")
      .in("id", ids),
    supabase
      .from("answer_options")
      .select("question_id, label, text, is_correct, why")
      .in("question_id", ids)
      .order("label"),
  ]);

  const optsByQ = new Map<string, ExamQuestion["options"]>();
  for (const o of optionsRes.data ?? []) {
    if (!optsByQ.has(o.question_id)) optsByQ.set(o.question_id, []);
    optsByQ.get(o.question_id)!.push({
      label: o.label,
      text: o.text,
      is_correct: o.is_correct,
      why: o.why ?? null,
    });
  }

  return (questionsRes.data ?? []).map((q) => {
    const chapter = q.chapters as { slug: string; title: string };
    return {
      id: q.id,
      stem: q.stem,
      chapterSlug: chapter.slug,
      chapterTitle: chapter.title,
      options: optsByQ.get(q.id) ?? [],
    };
  });
}

export async function getLastExamResult(userId: string): Promise<ExamResultRow | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("exam_results")
    .select("id, score, total, taken_at, breakdown")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ExamResultRow | null) ?? null;
}

/**
 * Counts consecutive days (including today) with at least one attempt,
 * going backward from today. Returns 0 if no attempts today or yesterday.
 */
export async function getStudyStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attempts")
    .select("answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });

  if (!data || data.length === 0) return 0;

  const days = new Set(
    data.map((a) => new Date(a.answered_at).toISOString().split("T")[0])
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().split("T")[0];
    if (days.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Returns the set of ISO date strings (YYYY-MM-DD) in the past `n` days
 * (including today) that had at least one attempt.
 */
export async function getRecentActivityDays(
  userId: string,
  n: number
): Promise<Set<string>> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - n + 1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("attempts")
    .select("answered_at")
    .eq("user_id", userId)
    .gte("answered_at", since.toISOString());

  return new Set(
    (data ?? []).map((a) => new Date(a.answered_at).toISOString().split("T")[0])
  );
}
