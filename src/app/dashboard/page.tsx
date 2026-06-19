import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, BookOpen, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getChapters,
  getUserAllMastery,
  getLastExamResult,
  getDailyQuestion,
  getStudyStreak,
  getRecentActivityDays,
  getPublishedQuestionCounts,
} from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getFocusAreas } from "@/lib/focusAreas";
import { computeOverallPct } from "@/lib/scoring";
import { ReadinessRing } from "@/components/ReadinessRing";
import { DailyChallenge } from "@/components/DailyChallenge";
import { TodayRail } from "@/components/TodayRail";

function chapterStatus(
  pct: number,
  started: boolean
): { label: string; cls: string } {
  if (!started) return { label: "Not Started", cls: "text-slate-500 bg-slate-700/50" };
  if (pct >= 70) return { label: "Strong", cls: "text-emerald-400 bg-emerald-500/10" };
  if (pct >= 40) return { label: "Developing", cls: "text-amber-400 bg-amber-500/10" };
  return { label: "Needs Focus", cls: "text-rose-400 bg-rose-500/10" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [masteryMap, chapters, lastExam, dailyQ, tier, streak, recentDays, questionCounts] =
    await Promise.all([
      getUserAllMastery(user.id),
      getChapters(),
      getLastExamResult(user.id),
      getDailyQuestion(),
      getTier(),
      getStudyStreak(user.id),
      getRecentActivityDays(user.id, 7),
      getPublishedQuestionCounts(),
    ]);

  const totalPublished = [...questionCounts.values()].reduce((a, b) => a + b, 0);
  const overallPct = computeOverallPct(masteryMap, totalPublished);
  const focusAreas = getFocusAreas(masteryMap, chapters, 3);
  const questionsAnswered = [...masteryMap.values()].reduce((sum, v) => sum + v.total, 0);
  const chaptersStrong = chapters.filter((c) => {
    const m = masteryMap.get(c.id);
    return m && m.total > 0 && Math.round((m.correct / m.total) * 100) >= 70;
  }).length;
  const nextChapter = focusAreas[0]?.chapter;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-full">
      {/* ── Center column ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Readiness Hero */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center gap-6">
            <ReadinessRing percent={overallPct} size={96} stroke={10} textColor="#F8FAFC" />
            <div>
              <div className="text-4xl font-bold text-white">{overallPct}%</div>
              <div className="text-slate-400 text-sm mt-1">Private Pilot · Ready</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Last exam</div>
              <div className="text-slate-200 font-medium">
                {lastExam
                  ? `${lastExam.score}/${lastExam.total} (${Math.round(
                      (lastExam.score / lastExam.total) * 100
                    )}%)`
                  : "No exam yet"}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">FAA minimum</div>
              <div className="text-slate-200 font-medium">70%</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Questions answered</div>
              <div className="text-slate-200 font-medium">{questionsAnswered}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-0.5">Chapters strong</div>
              <div className="text-slate-200 font-medium">
                {chaptersStrong}/{chapters.length}
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Next Action */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 border-t-2 border-t-sky-500 shadow-md shadow-black/30">
            <BookOpen size={20} className="text-sky-400 mb-3" />
            <div className="text-slate-200 font-semibold text-sm mb-1">Next Action</div>
            <div className="text-slate-400 text-xs mb-4 line-clamp-2">
              {nextChapter
                ? `Study: ${nextChapter.title}`
                : "All chapters in great shape!"}
            </div>
            {nextChapter ? (
              <Link
                href={`/study/${nextChapter.slug}`}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Study now →
              </Link>
            ) : (
              <Link href="/" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                View chapters →
              </Link>
            )}
          </div>

          {/* Daily Challenge */}
          {dailyQ ? (
            <DailyChallenge
              question={dailyQ.question}
              options={dailyQ.options}
              chapterTitle={dailyQ.chapterTitle}
              chapterSlug={dailyQ.chapterSlug}
              compact
            />
          ) : (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 border-t-2 border-t-amber-500 shadow-md shadow-black/30">
              <div className="text-slate-400 text-xs">No challenge today</div>
            </div>
          )}

          {/* Practice Exam */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-600 border-t-2 border-t-violet-500 shadow-md shadow-black/30">
            <ClipboardList size={20} className="text-sky-400 mb-3" />
            <div className="text-slate-200 font-semibold text-sm mb-1">Practice Exam</div>
            <div className="text-slate-400 text-xs mb-4">
              60-question FAA-style exam with readiness score
            </div>
            {hasAccess(tier, "pro") ? (
              <Link href="/exam" className="text-xs font-semibold text-sky-400 hover:text-sky-300">
                Start exam →
              </Link>
            ) : (
              <Link
                href="/course"
                className="text-xs font-semibold text-slate-400 hover:text-slate-300"
              >
                <Lock size={11} className="inline mr-1" />
                Upgrade to Pro →
              </Link>
            )}
          </div>
        </div>

        {/* Training Plan — instrument-panel density */}
        <div>
          <h2 className="text-slate-200 font-semibold mb-3">Training Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {chapters.map((chapter) => {
              const m = masteryMap.get(chapter.id) ?? { correct: 0, total: 0 };
              const pct = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
              const totalQ = questionCounts.get(chapter.id) ?? 0;
              const status = chapterStatus(pct, m.total > 0);
              const canQuiz = hasAccess(tier, "basic");
              return (
                <div
                  key={chapter.id}
                  className="bg-slate-900 rounded-xl p-4 border border-slate-800"
                >
                  {/* Title + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-slate-200 text-sm font-medium line-clamp-1 flex-1">
                      {chapter.title}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {/* Mastery bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                      <div
                        className="h-1.5 rounded-full bg-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{pct}%</span>
                  </div>
                  {/* Question count */}
                  <div className="text-xs text-slate-600 mb-3">
                    {m.total}/{totalQ} questions answered
                  </div>
                  {/* Actions */}
                  <div className="flex gap-4 text-xs font-medium">
                    <Link
                      href={`/study/${chapter.slug}`}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      Study
                    </Link>
                    {canQuiz ? (
                      <Link
                        href={`/quiz/${chapter.slug}`}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Quiz
                      </Link>
                    ) : (
                      <Link href="/course" className="text-slate-600">
                        <Lock size={10} className="inline mr-0.5" />
                        Quiz
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right rail — always visible, stacks below on mobile ── */}
      <div className="w-full lg:w-72 lg:flex-shrink-0">
        <TodayRail
          overallPct={overallPct}
          focusAreas={focusAreas}
          streak={streak}
          recentDays={recentDays}
          tier={tier}
        />
      </div>
    </div>
  );
}
