import { getSubscription } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { SubscribeButton } from "@/components/SubscribeButton";
import Link from "next/link";

export default async function SubscribePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sub = user ? await getSubscription() : null;

  if (sub?.isSubscriber) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">✈️</p>
        <h1 className="text-2xl font-bold text-slate-900">You&apos;re on Pro</h1>
        <p className="text-slate-500 text-sm">
          All chapter audio downloads are unlocked. Head back to studying!
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
        >
          Back to chapters
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <p className="text-4xl mb-3">✈️</p>
        <h1 className="text-3xl font-extrabold text-slate-900">Flying Ace Exams Pro</h1>
        <p className="text-slate-500 mt-2">
          Study anywhere — download chapter audio for your car, commute, or headphones.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <p className="text-5xl font-extrabold text-slate-900">$7.99</p>
          <p className="text-slate-400 text-sm mt-1">per month · cancel anytime</p>
        </div>

        <ul className="space-y-3 text-sm text-slate-700">
          {[
            "Download any chapter as MP3 audio",
            "Listen offline — car, gym, headphones",
            "All 12 chapters · 68 lessons included",
            "New questions added regularly",
            "Full study + quiz access (always free)",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {user ? (
          <SubscribeButton />
        ) : (
          <div className="space-y-3">
            <Link
              href="/signup?next=/subscribe"
              className="block w-full text-center py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
            >
              Create free account to subscribe
            </Link>
            <p className="text-xs text-center text-slate-400">
              Already have an account?{" "}
              <Link href="/login?next=/subscribe" className="text-sky-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        <p className="text-xs text-center text-slate-400">
          Secure payment via Stripe · No hidden fees
        </p>
      </div>
    </main>
  );
}
