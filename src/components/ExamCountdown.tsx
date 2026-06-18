"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  totalSeconds: number;
  onExpire: () => void;
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ExamCountdown({ totalSeconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const colorClass =
    remaining < 300
      ? "text-red-600"
      : remaining < 600
      ? "text-amber-600"
      : "text-slate-700";

  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${colorClass}`}>
      {formatTime(remaining)}
    </span>
  );
}
