import { createClient } from "@/lib/supabase/server";
import { getChapters, getUserAllMastery, getPublishedQuestionCounts } from "@/lib/queries";
import { ChapterCard } from "@/components/ChapterCard";
import { masteryPercent } from "@/lib/scoring";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [chapters, questionCounts, masteryMap] = await Promise.all([
    getChapters(),
    getPublishedQuestionCounts(),
    user
      ? getUserAllMastery(user.id)
      : Promise.resolve(new Map<string, { correct: number; total: number }>()),
  ]);

  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const { correct, total } of masteryMap.values()) {
    totalCorrect += correct;
    totalAnswered += total;
  }
  const overallPercent =
    totalAnswered > 0 ? masteryPercent(totalCorrect, totalAnswered) : 0;

  const totalQuestions = Array.from(questionCounts.values()).reduce((s, n) => s + n, 0);

  return (
    <main className="max-w-4xl mx-auto px-4">
      {/* Hero — logged-out visitors */}
      {!user && (
        <section className="py-14 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Ace your FAA Private Pilot<br className="hidden sm:block" /> Knowledge Test.
          </h1>
          <p className="mt-4 text-slate-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI-generated lessons, audio explanations, and instant-feedback quizzes — one topic at a time.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors shadow-sm"
            >
              Start studying free →
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
          {totalQuestions > 0 && (
            <p className="mt-5 text-xs text-slate-400">
              {chapters.length} chapters · {totalQuestions} practice questions · Audio included
            </p>
          )}
        </section>
      )}

      {/* Logged-in header */}
      {user && (
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-slate-900">Your Exam Prep</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Master every topic before test day.
          </p>
        </div>
      )}

      {/* Overall readiness widget */}
      {user && totalAnswered > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Overall Readiness</p>
            <p className="text-4xl font-bold text-slate-900 mt-0.5">{overallPercent}%</p>
            <p className="text-xs text-slate-400 mt-1">
              {totalCorrect} of {totalAnswered} questions correct
            </p>
          </div>
          <Link
            href="/progress"
            className="bg-sky-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-700 transition-colors"
          >
            View progress →
          </Link>
        </div>
      )}

      {/* First-time logged-in prompt */}
      {user && totalAnswered === 0 && chapters.length > 0 && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-sky-800">Ready to start?</p>
          <p className="text-sm text-sky-600 mt-1">
            Pick any chapter below — study the lesson, then take the quiz to track your mastery.
          </p>
        </div>
      )}

      {/* Chapter grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!user ? "pb-12" : "pb-8"}`}>
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            slug={chapter.slug}
            title={chapter.title}
            description={chapter.description}
            mastery={masteryMap.get(chapter.id) ?? null}
            questionCount={questionCounts.get(chapter.id) ?? 0}
          />
        ))}
      </div>

      {chapters.length === 0 && (
        <p className="text-center text-slate-400 mt-16 text-sm">
          No chapters yet — run the pipeline to generate content.
        </p>
      )}
    </main>
  );
}
