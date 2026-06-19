"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Headphones,
  TrendingUp,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Flight Deck",
    icon: LayoutDashboard,
    href: "/dashboard",
    match: (p: string) => p === "/dashboard",
  },
  {
    label: "Study Plan",
    icon: BookOpen,
    href: "/",
    match: (p: string) => p === "/" || p.startsWith("/study") || p.startsWith("/quiz"),
  },
  {
    label: "Practice Exam",
    icon: ClipboardList,
    href: "/exam",
    match: (p: string) => p.startsWith("/exam"),
  },
  {
    label: "Audio Course",
    icon: Headphones,
    href: "/downloads",
    match: (p: string) => p === "/downloads",
  },
  {
    label: "Progress",
    icon: TrendingUp,
    href: "/progress",
    match: (p: string) => p === "/progress",
  },
  {
    label: "Account",
    icon: User,
    href: "/account",
    match: (p: string) => p === "/account",
  },
];

const AVATAR_COLORS: Record<string, string> = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
};

interface Props {
  overallPct: number;
  displayName: string | null;
  userEmail: string;
  avatarColor: string;
}

export function Sidebar({ overallPct, displayName, userEmail, avatarColor }: Props) {
  const pathname = usePathname();
  const label = displayName ?? userEmail;
  const initials = label.slice(0, 2).toUpperCase();
  const avatarBg = AVATAR_COLORS[avatarColor] ?? "bg-sky-500";

  return (
    <nav className="hidden md:flex flex-col w-60 h-full bg-slate-900 border-r border-slate-800 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <span className="text-white font-bold text-lg tracking-tight">✈️ Flight Deck</span>
      </div>

      {/* Nav items */}
      <ul className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label: navLabel, icon: Icon, href, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400 px-3 py-2.5 pl-[10px]"
                    : "px-3 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {navLabel}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
          >
            {initials}
          </div>
          <span className="text-slate-300 text-xs truncate">{label}</span>
        </div>
        <div className="text-xs text-slate-500 mb-0.5">Current course</div>
        <div className="text-sm text-slate-300 font-medium mb-2">Private Pilot</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">{overallPct}%</span>
        </div>
      </div>
    </nav>
  );
}
