import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">✈️</span>
          <span className="font-bold text-slate-900 text-sm tracking-tight">
            Flying Ace Exams
          </span>
        </Link>
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link
                href="/progress"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Progress
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-sky-600 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
