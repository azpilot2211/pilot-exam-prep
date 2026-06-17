"use client";
import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || body.error || !body.url) {
        alert(body.error ?? "Could not open billing. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      alert("Could not open billing. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-semibold text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "Opening…" : "Manage billing"}
    </button>
  );
}
