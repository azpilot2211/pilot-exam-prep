export type OptionLabel = "A" | "B" | "C";

export interface SeedOption {
  label: OptionLabel;
  text: string;
  isCorrect: boolean;
}

export interface SeedQuestion {
  sourceRef: string;
  chapterSlug: string;
  chapterTitle: string;
  chapterOrder: number;
  chapterDescription: string;
  stem: string;
  acsCode: string;
  figureRef?: string;
  options: SeedOption[];
}
