"use client";
import { useState } from "react";
import { ExamRunner } from "@/components/ExamRunner";
import { ExamResults } from "@/components/ExamResults";
import { examScore } from "@/lib/examUtils";
import { saveExamResult } from "@/lib/actions";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  questions: ExamQuestion[];
  durationSeconds: number;
}

type Phase = "taking" | "saving" | "results";

export function ExamTakeClient({ questions, durationSeconds }: Props) {
  const [phase, setPhase] = useState<Phase>("taking");
  const [scoreData, setScoreData] = useState<ReturnType<typeof examScore> | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  const handleComplete = async (answers: Map<string, string>) => {
    setPhase("saving");
    const result = examScore(answers, questions);
    setScoreData(result);
    setAnswersRecord(Object.fromEntries(answers));
    await saveExamResult(result.score, result.total, result.breakdown);
    setPhase("results");
  };

  if (phase === "saving") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        Saving your results…
      </div>
    );
  }

  if (phase === "results" && scoreData) {
    return (
      <ExamResults
        score={scoreData.score}
        total={scoreData.total}
        percent={scoreData.percent}
        passed={scoreData.passed}
        breakdown={scoreData.breakdown}
        questions={questions}
        answers={answersRecord}
      />
    );
  }

  return (
    <ExamRunner
      items={questions}
      durationSeconds={durationSeconds}
      onComplete={handleComplete}
    />
  );
}
