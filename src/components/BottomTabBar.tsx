"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Headphones,
  User,
} from "lucide-react";

const TABS = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Study", icon: BookOpen, href: "/dashboard" },
  { label: "Exam", icon: ClipboardList, href: "/exam" },
  { label: "Audio", icon: Headphones, href: "/downloads" },
  { label: "Account", icon: User, href: "/account" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 inset-x-0 md:hidden bg-slate-900 border-t border-slate-800 z-50">
      <div className="flex">
        {TABS.map(({ label, icon: Icon, href }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-sky-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
