interface Props {
  percent: number;
  label?: string;
}

export function MasteryBar({ percent, label }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const colorClass =
    clamped >= 80
      ? "bg-green-500"
      : clamped >= 50
      ? "bg-sky-500"
      : "bg-slate-300";

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-slate-400">{label}</p>}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs font-semibold text-slate-700">{clamped}%</p>
    </div>
  );
}
