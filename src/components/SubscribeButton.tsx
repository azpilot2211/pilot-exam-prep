"use client";
import { useState } from "react";

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url, error } = await res.json();
    if (error || !url) {
      alert("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = url;
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
