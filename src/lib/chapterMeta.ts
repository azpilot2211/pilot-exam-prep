import {
  CloudSun,
  Scale,
  Compass,
  Wind,
  Layers,
  TowerControl,
  Gauge,
  Weight,
  TrendingUp,
  TriangleAlert,
  ClipboardList,
  Moon,
  Plane,
  type LucideIcon,
} from "lucide-react";

export interface ChapterMeta {
  icon: LucideIcon;
  chipBg: string; // icon-chip background + foreground
  accent: string; // top accent stripe background
}

const META: Record<string, ChapterMeta> = {
  weather: { icon: CloudSun, chipBg: "bg-sky-100 text-sky-600", accent: "bg-sky-500" },
  regulations: { icon: Scale, chipBg: "bg-indigo-100 text-indigo-600", accent: "bg-indigo-500" },
  navigation: { icon: Compass, chipBg: "bg-cyan-100 text-cyan-600", accent: "bg-cyan-500" },
  aerodynamics: { icon: Wind, chipBg: "bg-violet-100 text-violet-600", accent: "bg-violet-500" },
  airspace: { icon: Layers, chipBg: "bg-blue-100 text-blue-600", accent: "bg-blue-500" },
  "airport-operations": { icon: TowerControl, chipBg: "bg-teal-100 text-teal-600", accent: "bg-teal-500" },
  "aircraft-systems": { icon: Gauge, chipBg: "bg-slate-100 text-slate-600", accent: "bg-slate-400" },
  "weight-and-balance": { icon: Weight, chipBg: "bg-amber-100 text-amber-600", accent: "bg-amber-500" },
  performance: { icon: TrendingUp, chipBg: "bg-emerald-100 text-emerald-600", accent: "bg-emerald-500" },
  "emergency-procedures": { icon: TriangleAlert, chipBg: "bg-red-100 text-red-600", accent: "bg-red-500" },
  "preflight-planning": { icon: ClipboardList, chipBg: "bg-indigo-100 text-indigo-600", accent: "bg-indigo-500" },
  "night-operations": { icon: Moon, chipBg: "bg-slate-100 text-slate-600", accent: "bg-slate-400" },
};

const FALLBACK: ChapterMeta = {
  icon: Plane,
  chipBg: "bg-slate-100 text-slate-600",
  accent: "bg-slate-400",
};

export function chapterMeta(slug: string): ChapterMeta {
  return META[slug] ?? FALLBACK;
}
