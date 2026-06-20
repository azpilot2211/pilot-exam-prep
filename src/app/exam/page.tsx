export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getLastExamResult } from "@/lib/queries";
import Link from "next/link";

export default async function ExamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/exam");

  const tier = await getTier();
  if (!hasAccess(tier, "pro")) redirect("/course");

  const lastResult = await getLastExamResult(user.id);
  const percent =
    lastResult ? Math.round((lastResult.score / lastResult.total) * 100) : null;
  const passed = percent !== null ? percent >= 70 : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Practice Exam</h1>

      {/* Readiness card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {lastResult && percent !== null ? (
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
              Your last exam
            </p>
            <p className="text-6xl font-bold text-slate-900">{percent}%</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {passed ? "PASS" : "FAIL"}
            </span>
            <p className="text-xs text-slate-400">
              {lastResult.score} of {lastResult.total} correct ·{" "}
              {new Date(lastResult.taken_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {Object.keys(lastResult.breakdown).length > 0 && (
              <div className="mt-4 text-left space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Section breakdown
                </p>
                {Object.entries(lastResult.breakdown)
                  .sort(([, a], [, b]) => (a.total > 0 ? a.correct / a.total : 0) - (b.total > 0 ? b.correct / b.total : 0))
                  .map(([slug, { correct, total }]) => {
                    const pct = Math.round((correct / total) * 100);
                    return (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-36 truncate capitalize">
                          {slug.replace(/-/g, " ")}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 70 ? "bg-green-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-400">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-slate-900 font-medium">No exam on record</p>
            <p className="text-slate-500 text-sm">
              Take your first timed practice exam to see your readiness score.
            </p>
          </div>
        )}
      </div>

      <Link
        href="/exam/take"
        className="block w-full text-center py-3.5 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
      >
        {lastResult ? "Retake exam" : "Start exam"} — 60 questions · 2.5 hours
      </Link>

      <p className="text-center text-xs text-slate-400">FAA standard: 70% to pass</p>
    </main>
  );
}
