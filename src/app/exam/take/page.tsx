export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getQuestionsForExam } from "@/lib/queries";
import { buildExam } from "@/lib/examUtils";
import { ExamTakeClient } from "./ExamTakeClient";

export default async function ExamTakePage() {
  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const allQuestions = await getQuestionsForExam();
  const examQuestions = buildExam(allQuestions, 60);
  if (examQuestions.length === 0) redirect("/exam");

  return <ExamTakeClient questions={examQuestions} durationSeconds={9000} />;
}
