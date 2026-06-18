export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQuestionsForExam } from "@/lib/queries";
import { buildDemoExam } from "@/lib/examUtils";
import { DemoExamClient } from "./DemoExamClient";

export default async function ExamDemoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/exam/demo");

  const allQuestions = await getQuestionsForExam();
  const demoQuestions = buildDemoExam(allQuestions, 10);

  return <DemoExamClient questions={demoQuestions} />;
}
