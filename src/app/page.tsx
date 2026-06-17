import { createClient } from "@/lib/supabase/server";
import { getChapters, getUserAllMastery } from "@/lib/queries";
import { ChapterCard } from "@/components/ChapterCard";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chapters = await getChapters();
  const masteryMap = user
    ? await getUserAllMastery(user.id)
    : new Map<string, { correct: number; total: number }>();

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const { correct, total } of masteryMap.values()) {
    totalCorrect += correct;
    totalAnswered += total;
  }
  const overallPercent =
    totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Private Pilot Exam Prep</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Master every topic before test day.
        </p>
      </div>

      {user && totalAnswered > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Overall Readiness</p>
            <p className="text-4xl font-bold text-slate-900 mt-0.5">{overallPercent}%</p>
          </div>
          {chapters[0] && (
            <Link
              href={`/study/${chapters[0].slug}`}
              className="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              Continue →
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            slug={chapter.slug}
            title={chapter.title}
            description={chapter.description}
            mastery={masteryMap.get(chapter.id) ?? null}
          />
        ))}
      </div>

      {chapters.length === 0 && (
        <p className="text-center text-slate-400 mt-16 text-sm">
          No chapters yet — run the pipeline to generate content.
        </p>
      )}

      {!user && (
        <p className="text-center text-sm text-slate-400 mt-8">
          <Link href="/login" className="text-sky-600 hover:underline">
            Sign in
          </Link>{" "}
          to save your progress
        </p>
      )}
    </main>
  );
}
