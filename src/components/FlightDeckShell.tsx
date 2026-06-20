import { getProfile, getUserAllMastery, getPublishedQuestionCounts } from "@/lib/queries";
import { summarizeMastery, readinessPercent } from "@/lib/scoring";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";

interface Props {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export async function FlightDeckShell({ userId, userEmail, children }: Props) {
  const [profile, masteryMap, questionCounts] = await Promise.all([
    getProfile(userId),
    getUserAllMastery(userId),
    getPublishedQuestionCounts(),
  ]);

  const totalPublished = [...questionCounts.values()].reduce((a, b) => a + b, 0);
  const { correct } = summarizeMastery(masteryMap);
  const overallPct = readinessPercent(correct, totalPublished);
  const p = profile as { display_name?: string | null; avatar_color?: string | null } | null;
  const displayName = p?.display_name ?? null;
  const avatarColor = p?.avatar_color ?? "sky";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        overallPct={overallPct}
        displayName={displayName}
        userEmail={userEmail}
        avatarColor={avatarColor}
      />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
