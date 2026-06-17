import type { SeedQuestion } from "../types";

export const seedQuestions: SeedQuestion[] = [
  {
    sourceRef: "nav-vot-check",
    chapterSlug: "navigation",
    chapterTitle: "Navigation",
    chapterOrder: 3,
    chapterDescription: "VOR, GPS, charts, and dead reckoning.",
    stem: "While checking a VOR receiver with a VOT, the CDI centers. The OBS and TO/FROM indicator should read:",
    acsCode: "PA.VI.B",
    options: [
      { label: "A", text: "0° TO or 180° FROM", isCorrect: false },
      { label: "B", text: "0° FROM or 180° TO", isCorrect: true },
      { label: "C", text: "360° TO only", isCorrect: false },
    ],
  },
  {
    sourceRef: "wx-vfr-cloud-clearance-class-e-below-10k",
    chapterSlug: "weather",
    chapterTitle: "Weather",
    chapterOrder: 1,
    chapterDescription: "Weather theory, reports, forecasts, and VFR minimums.",
    stem: "What minimum cloud clearance is required for VFR flight in controlled airspace (Class E) below 10,000 feet MSL during daytime?",
    acsCode: "PA.I.C",
    options: [
      { label: "A", text: "500 feet below, 1,000 feet above, and 2,000 feet horizontal", isCorrect: true },
      { label: "B", text: "500 feet above, 1,000 feet below, and 2,000 feet horizontal", isCorrect: false },
      { label: "C", text: "Clear of clouds", isCorrect: false },
    ],
  },
  {
    sourceRef: "reg-required-docs-arrow",
    chapterSlug: "regulations",
    chapterTitle: "Regulations",
    chapterOrder: 2,
    chapterDescription: "14 CFR Parts 61 and 91 rules for pilots and aircraft.",
    stem: "Which documents must be aboard an aircraft during flight?",
    acsCode: "PA.I.B",
    options: [
      { label: "A", text: "Airworthiness certificate, registration, and a maintenance logbook", isCorrect: false },
      { label: "B", text: "Airworthiness certificate, registration, operating limitations, and weight and balance data", isCorrect: true },
      { label: "C", text: "Registration, radio station license, and a list of required equipment", isCorrect: false },
    ],
  },
  {
    sourceRef: "aero-load-factor-turn",
    chapterSlug: "aerodynamics",
    chapterTitle: "Aerodynamics",
    chapterOrder: 6,
    chapterDescription: "Forces of flight, stability, and aircraft performance limits.",
    stem: "As bank angle increases in a constant-altitude turn, the load factor and the stall speed will:",
    acsCode: "PA.I.F",
    options: [
      { label: "A", text: "Both increase", isCorrect: true },
      { label: "B", text: "Both decrease", isCorrect: false },
      { label: "C", text: "Load factor increases while stall speed remains constant", isCorrect: false },
    ],
  },
];
