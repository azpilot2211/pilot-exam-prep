import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChapters, getProfile } from "@/lib/queries";
import { Logo } from "./Logo";
import { NavDrawer } from "./NavDrawer";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chapters = await getChapters();

  const profile = user ? await getProfile(user.id) : null;
  const userInfo = user
    ? {
        email: user.email ?? "",
        displayName: (profile as { display_name?: string | null } | null)?.display_name ?? null,
        avatarColor: (profile as { avatar_color?: string | null } | null)?.avatar_color ?? "sky",
      }
    : undefined;

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-20 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo size={40} showWordmark wordmarkClassName="text-[17.5px]" />
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/exam"
              className="hidden sm:block px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition-colors"
            >
              Practice Exam
            </Link>
          )}
          <Link
            href="/course"
            className="hidden sm:block px-4 py-2 bg-white text-sky-600 border border-sky-600 rounded-lg text-sm font-semibold hover:bg-sky-50 transition-colors"
          >
            Pricing
          </Link>
          <NavDrawer
            isLoggedIn={!!user}
            chapters={chapters.map((c) => ({ slug: c.slug, title: c.title }))}
            userInfo={userInfo}
          />
        </div>
      </div>
    </nav>
  );
}
