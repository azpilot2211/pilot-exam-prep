"use server";

import { createClient } from "./supabase/server";

export async function updateProfile(
  displayName: string,
  avatarColor: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("profiles").upsert({
    id: user.id,
    display_name: displayName.trim() || null,
    avatar_color: avatarColor,
  });
  if (error) console.error("updateProfile failed:", error.message);
  return error ? { error: error.message } : {};
}

export async function recordAttempt(
  questionId: string,
  selectedLabel: string,
  isCorrect: boolean
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // unauthenticated — skip silently
  await supabase.from("attempts").insert({
    user_id: user.id,
    question_id: questionId,
    selected_label: selectedLabel,
    is_correct: isCorrect,
  });
}

export async function saveExamResult(
  score: number,
  total: number,
  breakdown: Record<string, { correct: number; total: number }>
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("exam_results").insert({
    user_id: user.id,
    score,
    total,
    breakdown,
  });
  if (error) console.error("saveExamResult failed:", error.message);
}
