"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  lessonCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ChapterAccordion({ title, lessonCount, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-slate-200 font-semibold group-hover:text-white transition-colors">
            {title}
          </h2>
          <span className="text-xs text-slate-500">{lessonCount} lessons</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-2 pb-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
