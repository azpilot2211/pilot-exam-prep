export interface ExamOption {
  label: string;
  text: string;
  is_correct: boolean;
  why: string | null;
}

export interface ExamQuestion {
  id: string;
  stem: string;
  chapterSlug: string;
  chapterTitle: string;
  figureUrl?: string | null;
  options: ExamOption[];
}

export interface ExamScoreResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  breakdown: Record<string, { correct: number; total: number }>;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function buildExam(questions: ExamQuestion[], target = 60): ExamQuestion[] {
  const byChapter = new Map<string, ExamQuestion[]>();
  for (const q of questions) {
    if (!byChapter.has(q.chapterSlug)) byChapter.set(q.chapterSlug, []);
    byChapter.get(q.chapterSlug)!.push(q);
  }

  const total = questions.length;
  const chapters = [...byChapter.keys()];

  // Largest-remainder proportional allocation
  const allocs = chapters.map((slug) => {
    const raw = (byChapter.get(slug)!.length / total) * target;
    return { slug, floor: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });

  const assigned = allocs.reduce((s, a) => s + a.floor, 0);
  const extra = target - assigned;
  allocs.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < extra; i++) allocs[i].floor++;

  const result: ExamQuestion[] = [];
  for (const { slug, floor } of allocs) {
    const pool = [...byChapter.get(slug)!];
    shuffle(pool);
    result.push(...pool.slice(0, Math.min(floor, pool.length)));
  }

  shuffle(result);
  return result;
}

export function buildDemoExam(questions: ExamQuestion[], target = 10): ExamQuestion[] {
  const pool = [...questions];
  shuffle(pool);
  return pool.slice(0, Math.min(target, pool.length));
}

export function examScore(
  answers: Map<string, string>,
  questions: ExamQuestion[]
): ExamScoreResult {
  const breakdown: Record<string, { correct: number; total: number }> = {};
  let score = 0;

  for (const q of questions) {
    const slug = q.chapterSlug;
    if (!breakdown[slug]) breakdown[slug] = { correct: 0, total: 0 };
    breakdown[slug].total++;

    const selected = answers.get(q.id);
    const correctLabel = q.options.find((o) => o.is_correct)?.label;
    if (selected !== undefined && selected === correctLabel) {
      score++;
      breakdown[slug].correct++;
    }
  }

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  return { score, total, percent, passed: percent >= 70, breakdown };
}
