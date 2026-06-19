import { getTier } from "@/lib/entitlement";
import { CheckoutButton } from "@/components/CheckoutButton";
import Link from "next/link";

const FEATURES: { label: string; free: boolean; basic: boolean; pro: boolean }[] = [
  { label: "Study mode + audio (sample chapters)", free: true, basic: true, pro: true },
  { label: "Full question bank + quizzes", free: false, basic: true, pro: true },
  { label: "10-question demo exam", free: true, basic: true, pro: true },
  { label: "Exam simulator + readiness score", free: false, basic: false, pro: true },
  { label: "Missed-question review + weak-area drill", free: false, basic: false, pro: true },
  { label: "MP3 downloads (full course)", free: false, basic: false, pro: true },
  { label: "Pass guarantee", free: false, basic: false, pro: true },
];

function Check({ on }: { on: boolean }) {
  return on ? (
    <span className="text-green-600 font-bold">✓</span>
  ) : (
    <span className="text-slate-300">—</span>
  );
}

export default async function CoursePage() {
  const tier = await getTier();

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Plans &amp; Pricing</h1>
        <p className="text-slate-500 mt-2 text-sm">
          One-time purchase. Lifetime access. No subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Free */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col relative">
          <span className="absolute -top-2.5 left-5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            FREE
          </span>
          <h2 className="font-bold text-slate-900">Free</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$0</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Try before you buy</p>
          {tier === "free" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">Current plan</span>
          ) : (
            <span className="mt-auto" />
          )}
        </div>

        {/* Basic */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
          <h2 className="font-bold text-slate-900">Basic</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$29</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Full question bank</p>
          {tier === "basic" || tier === "pro" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">
              {tier === "basic" ? "Current plan" : "Included in Pro"}
            </span>
          ) : (
            <CheckoutButton
              tier="basic"
              label="Get Basic"
              className="mt-auto bg-slate-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors"
            />
          )}
        </div>

        {/* Pro */}
        <div className="bg-white border-2 border-sky-500 rounded-2xl p-5 flex flex-col relative">
          <span className="absolute -top-2.5 left-5 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            BEST VALUE
          </span>
          <h2 className="font-bold text-slate-900">Pro</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">$59</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Everything + pass guarantee + full course audio download</p>
          {tier === "pro" ? (
            <span className="text-xs text-slate-400 mt-auto text-center py-2">Current plan</span>
          ) : (
            <CheckoutButton
              tier="pro"
              label="Get Pro"
              className="mt-auto bg-sky-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-sky-700 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="text-left font-medium px-4 py-3">What&apos;s included</th>
              <th className="font-medium px-2 py-3">Free</th>
              <th className="font-medium px-2 py-3">Basic</th>
              <th className="font-medium px-2 py-3">Pro</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.label} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-slate-700">{f.label}</td>
                <td className="text-center px-2 py-3"><Check on={f.free} /></td>
                <td className="text-center px-2 py-3"><Check on={f.basic} /></td>
                <td className="text-center px-2 py-3"><Check on={f.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Pass guarantee: study the full Pro course and if you don&apos;t pass, email us for a
        full refund. <Link href="/account" className="text-sky-600 hover:underline">Your account →</Link>
      </p>
    </main>
  );
}
