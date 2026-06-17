import { masteryPercent } from "./scoring";

export interface FocusArea<C> {
  chapter: C;
  percent: number;
  started: boolean;
}

/**
 * Returns up to `limit` chapters to focus on: the weakest attempted chapters
 * (lowest mastery first), back-filled with not-yet-started chapters when fewer
 * than `limit` have been attempted.
 */
export function getFocusAreas<C extends { id: string }>(
  masteryMap: Map<string, { correct: number; total: number }>,
  chapters: C[],
  limit = 3
): FocusArea<C>[] {
  const scored = chapters.map((chapter) => {
    const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
    return {
      chapter,
      percent: m.total > 0 ? masteryPercent(m.correct, m.total) : 0,
      started: m.total > 0,
    };
  });

  const started = scored
    .filter((s) => s.started)
    .sort((a, b) => a.percent - b.percent);

  const focus = started.slice(0, limit);

  if (focus.length < limit) {
    const unstarted = scored.filter((s) => !s.started);
    focus.push(...unstarted.slice(0, limit - focus.length));
  }

  return focus;
}
