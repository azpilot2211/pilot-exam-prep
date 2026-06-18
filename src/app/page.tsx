import { createClient } from "@/lib/supabase/server";
import { getChapters, getUserAllMastery, getPublishedQuestionCounts } from "@/lib/queries";
import { ChapterCard } from "@/components/ChapterCard";
import { ReadinessRing } from "@/components/ReadinessRing";
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
        <section className="relative mt-4 rounded-3xl overflow-hidden min-h-[460px] flex flex-col">
          <div
            className="absolute inset-0 bg-[var(--hero-bg)] bg-cover bg-center"
            style={{ backgroundImage: "url('/hero-runway.jpg')" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/55 via-[#0B1120]/35 to-[#0B1120]/92"
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 pt-14 pb-16">
            <span className="inline-block text-[11px] tracking-wide text-amber-300 border border-amber-400/50 px-3 py-1 rounded-full mb-5">
              FAA Written Test Prep
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-50 leading-tight tracking-tight max-w-2xl">
              Cleared for takeoff on your written exam.
            </h1>
            <p className="mt-4 text-slate-300 text-base max-w-xl mx-auto leading-relaxed">
              AI-built lessons, audio explanations, and instant-feedback quizzes — one topic at a time.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/signup"
                className="px-6 py-3 bg-sky-500 text-white rounded-xl font-semibold text-sm hover:bg-sky-400 transition-colors"
              >
                Start studying free →
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-white/50 text-black-700 border border-slate-900/90 rounded-xl font-semibold text-sm hover:bg-white/70 transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">No credit card to start</p>
          </div>
          {totalQuestions > 0 && (
            <div className="relative bg-slate-900/55 border-t border-slate-300/15 grid grid-cols-3">
              <div className="text-center py-3">
                <div className="text-slate-50 font-semibold tabular-nums">{totalQuestions}</div>
                <div className="text-slate-400 text-[11px]">questions</div>
              </div>
              <div className="text-center py-3 border-x border-slate-300/15">
                <div className="text-slate-50 font-semibold tabular-nums">{chapters.length}</div>
                <div className="text-slate-400 text-[11px]">chapters</div>
              </div>
              <div className="text-center py-3">
                <div className="text-slate-50 font-semibold">Audio</div>
                <div className="text-slate-400 text-[11px]">every lesson</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Logged-in header */}
      {user && (
        <div className="pt-8 pb-6">
          <h1 className="text-2xl font-bold text-slate-900">Your Exam Prep</h1>
          <p className="text-slate-400 mt-1 text-sm">Master every topic before test day.</p>
        </div>
      )}

      {/* Overall readiness widget */}
      {user && totalAnswered > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-5">
          <ReadinessRing percent={overallPercent} />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">Overall Readiness</p>
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

      {/* Section header */}
      {chapters.length > 0 && (
        <div className={`flex items-baseline justify-between ${!user ? "mt-10" : ""} mb-3`}>
          <h2 className="text-sm font-semibold text-slate-900">Choose a topic</h2>
          <span className="text-xs text-slate-400">{chapters.length} chapters</span>
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
