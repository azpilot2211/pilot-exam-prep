import Image from "next/image";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function Logo({ size = 26, showWordmark = false, wordmarkClassName = "" }: LogoProps) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Flying Ace Exams"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showWordmark && (
        <span className={`font-bold text-slate-900 tracking-tight ${wordmarkClassName}`}>
          Flying Ace Exams
        </span>
      )}
    </span>
  );
}
