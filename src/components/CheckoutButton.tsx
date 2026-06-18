"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tier: "basic" | "pro";
  label: string;
  className?: string;
}

export function CheckoutButton({ tier, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/course`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        alert(data.error ?? "Could not start checkout.");
      }
    } catch {
      setLoading(false);
      alert("Could not start checkout.");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${className} disabled:opacity-60`}
    >
      {loading ? "Loading…" : label}
    </button>
  );
}
