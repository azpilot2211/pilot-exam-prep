"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { chapterMeta } from "@/lib/chapterMeta";
import { Logo } from "./Logo";

interface Props {
  isLoggedIn: boolean;
  chapters: { slug: string; title: string }[];
}

export function NavDrawer({ isLoggedIn, chapters }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="text-slate-700 hover:text-slate-900 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={close} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label="Navigation menu"
            className="absolute right-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <Logo size={24} showWordmark wordmarkClassName="text-sm" />
              <button onClick={close} aria-label="Close menu" className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                  <Link href="/subscribe" onClick={close} className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold text-sky-600">
                    Pro
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
      )}
    </>
  );
}
