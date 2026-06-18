"use client";
import { useState } from "react";
import { ExamRunner } from "@/components/ExamRunner";
import { ExamResults } from "@/components/ExamResults";
import { examScore } from "@/lib/examUtils";
import type { ExamQuestion } from "@/lib/examUtils";

interface Props {
  questions: ExamQuestion[];
}

type Phase = "taking" | "results";

export function DemoExamClient({ questions }: Props) {
  const [phase, setPhase] = useState<Phase>("taking");
  const [scoreData, setScoreData] = useState<ReturnType<typeof examScore> | null>(null);
  const [answersRecord, setAnswersRecord] = useState<Record<string, string>>({});

  const handleComplete = (answers: Map<string, string>) => {
    const result = examScore(answers, questions);
    setScoreData(result);
    setAnswersRecord(Object.fromEntries(answers));
    setPhase("results");
  };

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
        isDemo
      />
    );
  }

  return (
    <ExamRunner
      items={questions}
      durationSeconds={0}
      onComplete={handleComplete}
    />
  );
}
