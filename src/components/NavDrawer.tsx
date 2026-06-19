"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { chapterMeta } from "@/lib/chapterMeta";
import { Logo } from "./Logo";

const AVATAR_BG: Record<string, string> = {
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-600",
};

interface UserInfo {
  email: string;
  displayName: string | null;
  avatarColor: string;
}

interface Props {
  isLoggedIn: boolean;
  chapters: { slug: string; title: string }[];
  userInfo?: UserInfo;
}

export function NavDrawer({ isLoggedIn, chapters, userInfo }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (open) panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    close();
    router.push("/login");
    router.refresh();
  };

  const avatarBg = AVATAR_BG[userInfo?.avatarColor ?? "sky"] ?? "bg-sky-500";
  const initials = ((userInfo?.displayName ?? userInfo?.email ?? "?").slice(0, 2)).toUpperCase();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Always mounted so exit animation can play */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={close}
          aria-hidden="true"
        />

        {/* Panel */}
        <aside
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-xl flex flex-col outline-none
            transition-transform duration-300 ease-in-out
            ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <Logo size={36} showWordmark wordmarkClassName="text-[17.5px]" />
            <button onClick={close} aria-label="Close menu" className="text-slate-500 hover:text-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info strip */}
          {userInfo && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-white font-semibold text-sm select-none`}>
                {initials}
              </div>
              <div className="min-w-0">
                {userInfo.displayName && (
                  <p className="text-sm font-medium text-slate-900 truncate">{userInfo.displayName}</p>
                )}
                <p className={`truncate ${userInfo.displayName ? "text-xs text-slate-400" : "text-sm font-medium text-slate-900"}`}>
                  {userInfo.email}
                </p>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {/* Pricing — top of mobile menu */}
            <Link
              href="/course"
              onClick={close}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sky-50 text-sm font-semibold text-sky-600 mb-1"
            >
              Pricing
            </Link>

            <div className="my-1 border-t border-slate-100" />

            <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Sections
            </p>
            {chapters.map((c) => {
              const meta = chapterMeta(c.slug);
              const Icon = meta.icon;
              return (
                <Link
                  key={c.slug}
                  href={`/study/${c.slug}`}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.chipBg}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm text-slate-700">{c.title}</span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-slate-100" />

            {isLoggedIn ? (
              <>
                <Link href="/account" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                  Account
                </Link>
                <Link href="/progress" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                  Progress
                </Link>
                <Link href="/exam" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                  Practice Exam
                </Link>
                <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-500">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                  Sign in
                </Link>
                <Link href="/signup" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
                  Create account
                </Link>
              </>
            )}
          </nav>
        </aside>
      </div>
    </>
  );
}
