import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <p className="text-5xl">🎉</p>
      <h1 className="text-2xl font-bold text-slate-900">You&apos;re a Pro!</h1>
      <p className="text-slate-500 text-sm max-w-xs mx-auto">
        Your subscription is active. Download buttons are now unlocked on every lesson card.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 transition-colors"
      >
        Start studying →
      </Link>
    </main>
  );
}
