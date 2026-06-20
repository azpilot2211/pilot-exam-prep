import Link from "next/link";
import { Lock } from "lucide-react";
import type { FocusArea } from "@/lib/focusAreas";
import type { Chapter } from "@/lib/queries";
import type { Tier } from "@/lib/entitlement";
import { hasAccess } from "@/lib/entitlement";

interface Props {
  overallPct: number;
  focusAreas: FocusArea<Chapter>[];
  streak: number;
  recentDays: Set<string>;
  tier: Tier;
}

export function TodayRail({ overallPct, focusAreas, streak, recentDays, tier }: Props) {
  const month = new Date().toLocaleString("en-US", { month: "long" });

  // Build 7-day activity strip: index 0 = 6 days ago, index 6 = today
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const letter = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
    return { active: recentDays.has(key), letter };
  });

  return (
    <div className="space-y-4 sticky top-6">
      {/* Header */}
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Today · {month} flight plan
      </div>

      {/* Widget 1 — Exam Goal */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-400 mb-2">Exam Goal</div>
        <div className="text-slate-200 font-semibold text-sm">Pass FAA Written</div>
        <div className="text-xs text-slate-300 mb-3">Minimum: 70%</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all"
              style={{ width: `${overallPct}%` }}
              role="progressbar"
              aria-valuenow={overallPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Exam readiness"
            />
          </div>
          <span className="text-xs text-slate-300">{overallPct}%</span>
        </div>
        <div
          className={`mt-2 text-xs font-medium ${
            overallPct >= 70 ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {overallPct >= 70 ? "✓ On track" : `${70 - overallPct}% to minimum`}
        </div>
      </div>

      {/* Widget 2 — Focus Stack */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-400 mb-3">Focus Stack</div>
        <div className="space-y-3">
          {focusAreas.length === 0 ? (
            <p className="text-xs text-slate-300">All chapters looking great!</p>
          ) : (
            focusAreas.map(({ chapter, percent }) => (
              <div key={chapter.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 leading-snug truncate">
                    {chapter.title}
                  </div>
                  <div className="text-xs text-slate-400">{percent}% mastery</div>
                </div>
                <Link
                  href={`/study/${chapter.slug}`}
                  className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0 mt-0.5"
                >
                  Study →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Widget 3 — Study Streak */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-400 mb-2">Study Streak</div>
        <div className="text-2xl font-bold text-white mb-3">
          {streak > 0 ? "🔥" : "⚡"}{" "}
          <span>{streak}</span>{" "}
          <span className="text-sm font-normal text-slate-300">
            {streak === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex gap-1">
          {dots.map(({ active, letter }, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1.5 rounded-full ${
                  active ? "bg-sky-500" : "bg-slate-700"
                }`}
                title={`${letter}: ${active ? "studied" : "no activity"}`}
              />
              <span className="text-[9px] text-slate-500">{letter}</span>
            </div>
          ))}
        </div>
        {streak === 0 && (
          <p className="text-xs text-slate-300 mt-2">Answer a question to start your streak!</p>
        )}
      </div>

      {/* Widget 4 — Weak-Area Drill (Pro only) */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="text-xs text-slate-400 mb-3">Weak-Area Drill</div>
        {hasAccess(tier, "pro") ? (
          <div className="space-y-2">
            {focusAreas.length === 0 ? (
              <p className="text-xs text-slate-300">No weak areas — nice work!</p>
            ) : (
              focusAreas.map(({ chapter }) => (
                <Link
                  key={chapter.id}
                  href={`/quiz/${chapter.slug}`}
                  className="block text-sm text-sky-400 hover:text-sky-300"
                >
                  Drill: {chapter.title} →
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="text-center py-1">
            <Lock size={16} className="text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-300 mb-2">Targeted drilling is a Pro feature</p>
            <Link
              href="/course"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Upgrade to Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
