interface Props {
  percent: number;
  label?: string;
  questionCount?: number;
}

export function MasteryBar({ percent, label, questionCount: _questionCount }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const colorClass =
    clamped >= 80
      ? "bg-green-500"
      : clamped >= 50
      ? "bg-sky-500"
      : clamped > 0
      ? "bg-sky-400"
      : "bg-slate-200";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label && <p className="text-xs text-slate-400">{label}</p>}
        <p className={`text-xs font-bold ml-auto ${clamped >= 80 ? "text-green-600" : clamped > 0 ? "text-sky-600" : "text-slate-300"}`}>
          {clamped}%
        </p>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
