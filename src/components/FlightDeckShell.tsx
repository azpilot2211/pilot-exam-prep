import { getProfile, getUserAllMastery } from "@/lib/queries";
import { computeOverallPct } from "@/lib/scoring";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";

interface Props {
  userId: string;
  userEmail: string;
  children: React.ReactNode;
}

export async function FlightDeckShell({ userId, userEmail, children }: Props) {
  const [profile, masteryMap] = await Promise.all([
    getProfile(userId),
    getUserAllMastery(userId),
  ]);

  const overallPct = computeOverallPct(masteryMap);
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
