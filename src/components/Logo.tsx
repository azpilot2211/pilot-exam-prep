interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({ size = 26, showWordmark = false, wordmarkClassName = "" }: LogoProps) {
  return (
    <span className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#0F172A" />
        <path d="M16 6 L23 23 L16 19 L9 23 Z" fill="#38BDF8" />
      </svg>
      {showWordmark && (
        <span className={`font-bold text-slate-900 tracking-tight ${wordmarkClassName}`}>
          Flying Ace Exams
        </span>
      )}
    </span>
  );
}
