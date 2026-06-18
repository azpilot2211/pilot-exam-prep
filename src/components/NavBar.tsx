import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getChapters } from "@/lib/queries";
import { Logo } from "./Logo";
import { NavDrawer } from "./NavDrawer";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const chapters = await getChapters();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo size={40} showWordmark wordmarkClassName="text-[17.5px]" />
        </Link>
        <NavDrawer
          isLoggedIn={!!user}
          chapters={chapters.map((c) => ({ slug: c.slug, title: c.title }))}
        />
      </div>
    </nav>
  );
}
