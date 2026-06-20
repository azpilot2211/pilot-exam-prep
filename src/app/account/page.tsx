export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getChapters, getUserAllMastery, getPublishedQuestionCounts } from "@/lib/queries";
import { getTier, hasAccess } from "@/lib/entitlement";
import { getFocusAreas } from "@/lib/focusAreas";
import { readinessPercent, summarizeMastery } from "@/lib/scoring";
import { chapterMeta } from "@/lib/chapterMeta";
import { getProfile } from "@/lib/queries";
import { ReadinessRing } from "@/components/ReadinessRing";
import { SignOutButton } from "@/components/SignOutButton";
import { AccountProfileEditor } from "@/components/AccountProfileEditor";
import Link from "next/link";

const AVATAR_BG: Record<string, string> = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-600",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [chapters, masteryMap, tier, profile, questionCounts] = await Promise.all([
    getChapters(),
    getUserAllMastery(user.id),
    getTier(),
    getProfile(user.id),
    getPublishedQuestionCounts(),
  ]);

  const totalPublished = [...questionCounts.values()].reduce((a, b) => a + b, 0);
  const { correct: totalCorrect, answered: totalAnswered } = summarizeMastery(masteryMap);
  const overall = readinessPercent(totalCorrect, totalPublished);

  const focus = getFocusAreas(masteryMap, chapters, 3);
  const displayName = (profile as { display_name?: string | null } | null)?.display_name ?? null;
  const avatarColor = (profile as { avatar_color?: string | null } | null)?.avatar_color ?? "sky";
  const avatarBg = AVATAR_BG[avatarColor] ?? "bg-sky-500";
  const initials = (displayName ?? user.email ?? "?").slice(0, 2).toUpperCase();
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const isPro = hasAccess(tier, "pro");

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--hero-bg)] px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-11 h-11 rounded-full ${avatarBg} text-white flex items-center justify-center font-semibold text-sm`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-slate-50 text-sm font-medium truncate">{user.email}</p>
              {memberSince && <p className="text-slate-400 text-xs mt-0.5">Member since {memberSince}</p>}
            </div>
          </div>
          {tier !== "free" && (
            <span className="flex-shrink-0 text-xs font-semibold text-[#0B1120] bg-amber-400 px-3 py-1 rounded-full uppercase">
              {tier}
            </span>
          )}
        </div>

        {/* Readiness */}
        <div className="px-5 py-5 flex items-center gap-5 border-b border-slate-100">
          <ReadinessRing percent={overall} />
          <div>
            <p className="text-sm font-semibold text-slate-900">Overall readiness</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {totalAnswered > 0
                ? `${totalCorrect} of ${totalAnswered} questions correct.`
                : "Take a quiz to start tracking your readiness."}
            </p>
          </div>
        </div>

        {/* Focus areas */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-900">Focus areas</p>
            <Link href="/progress" className="text-xs text-sky-600 hover:underline">
              View full progress →
            </Link>
          </div>
          {focus.map(({ chapter, percent, started }) => {
            const meta = chapterMeta(chapter.slug);
            const Icon = meta.icon;
            return (
              <div key={chapter.id} className="flex items-center gap-3 py-2 border-t border-slate-100">
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{chapter.title}</p>
                  <div className="h-1 bg-slate-100 rounded mt-1 w-32 overflow-hidden">
                    <div
                      className={`h-full ${
                        percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-sky-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  {started ? `${percent}%` : "New"}
                </span>
                <Link
                  href={`/study/${chapter.slug}`}
                  className="text-xs font-semibold text-white bg-sky-600 px-3 py-1.5 rounded-md hover:bg-sky-700 transition-colors"
                >
                  Study
                </Link>
              </div>
            );
          })}
        </div>

        {/* Profile editor */}
        <AccountProfileEditor
          initialDisplayName={displayName ?? ""}
          initialAvatarColor={avatarColor}
          email={user.email ?? ""}
        />

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          {isPro ? (
            <Link
              href="/downloads"
              className="text-xs font-semibold text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
            >
              Course downloads
            </Link>
          ) : (
            <Link
              href="/course"
              className="text-xs font-semibold text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition-colors"
            >
              {tier === "free" ? "Get the course" : "Upgrade to Pro"}
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
