"use client";
import { useState } from "react";

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (!res.ok || body.error || !body.url) {
        alert(body.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Redirecting to checkout…" : "Subscribe for $7.99 / month →"}
    </button>
  );
}
