/**
 * Course progress is described by three distinct, separately-labeled metrics so
 * every surface tells the same story. Do not conflate them:
 *
 *   coverage  = answered ÷ published   — how much of the bank you've been through
 *   accuracy  = correct  ÷ answered    — how well you do on what you've attempted
 *   readiness = correct  ÷ published   — the headline; stays low until you've BOTH
 *                                        covered the material AND answered accurately
 */

/** Accuracy on a set of attempted questions (correct ÷ answered). Per-chapter bars use this too. */
export function masteryPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((correct / total) * 100));
}

export interface MasteryTotals {
  correct: number;
  answered: number;
}

/** Sum a chapter-keyed mastery map into course-wide correct/answered totals. */
export function summarizeMastery(
  map: Map<string, { correct: number; total: number }>
): MasteryTotals {
  let correct = 0;
  let answered = 0;
  for (const v of map.values()) {
    correct += v.correct;
    answered += v.total;
  }
  return { correct, answered };
}

/** Coverage: how much of the published bank the user has answered (answered ÷ published). */
export function coveragePercent(answered: number, published: number): number {
  if (published <= 0) return 0;
  return Math.min(100, Math.round((answered / published) * 100));
}

/** Readiness: the headline exam-readiness metric (correct ÷ all published). */
export function readinessPercent(correct: number, published: number): number {
  if (published <= 0) return 0;
  return Math.min(100, Math.round((correct / published) * 100));
}
