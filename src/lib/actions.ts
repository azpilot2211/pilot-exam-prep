"use server";

import { createClient } from "./supabase/server";

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
