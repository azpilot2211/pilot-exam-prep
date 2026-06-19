export function masteryPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((correct / total) * 100));
}

export interface ChapterScore {
  correct: number;
  total: number;
}

export function examReadiness(chapters: ChapterScore[]): number {
  const attempted = chapters.filter((c) => c.total > 0);
  if (attempted.length === 0) return 0;
  const sum = attempted.reduce(
    (acc, c) => acc + masteryPercent(c.correct, c.total),
    0
  );
  return Math.round(sum / attempted.length);
}

export function computeOverallPct(
  map: Map<string, { correct: number; total: number }>
): number {
  let correct = 0;
  let total = 0;
  for (const v of map.values()) {
    correct += v.correct;
    total += v.total;
  }
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
