import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { MasteryBar } from "@/components/MasteryBar";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/progress");

  const [chapters, masteryMap] = await Promise.all([
    getChapters(),
    getUserAllMastery(user.id),
  ]);

  const rows = chapters.map((chapter) => {
    const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
    return {
      ...chapter,
      correct: m.correct,
      total: m.total,
      percent: m.total > 0 ? masteryPercent(m.correct, m.total) : 0,
      started: m.total > 0,
    };
  });

  const weakAreas = rows
    .filter((r) => r.started && r.percent < 70)
    .sort((a, b) => a.percent - b.percent);

  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const totalAnswered = rows.reduce((s, r) => s + r.total, 0);
  const overall = totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
        <p className="text-slate-400 text-sm mt-1">
          Overall readiness:{" "}
          <span className="font-semibold text-slate-700">{overall}%</span>
          {totalAnswered > 0 && (
            <> · {totalCorrect} of {totalAnswered} correct</>
          )}
        </p>
      </div>

      {weakAreas.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Focus areas</p>
          {weakAreas.map((r) => (
            <Link
              key={r.id}
              href={`/study/${r.slug}`}
              className="flex items-center justify-between text-sm text-amber-700 hover:text-amber-900 py-0.5"
            >
              <span>{r.title}</span>
              <span className="font-bold">{r.percent}% →</span>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Link
                href={`/study/${row.slug}`}
                className="font-semibold text-slate-800 text-sm hover:text-sky-600 transition-colors"
              >
                {row.title}
              </Link>
              {!row.started && (
                <span className="text-xs text-slate-400">Not started</span>
              )}
            </div>
            {row.started && (
              <MasteryBar
                percent={row.percent}
                label={`${row.correct} / ${row.total} correct`}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
