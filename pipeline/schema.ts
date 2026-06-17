import { z } from "zod";

export const generatedExplanationSchema = z.object({
  concept_tested: z.string().min(1),
  why_correct: z.string().min(1),
  options_why: z
    .array(
      z.object({
        label: z.enum(["A", "B", "C"]),
        why: z.string().min(1),
      })
    )
    .min(2),
  source_citation: z.string().min(1),
  memory_aid: z.string().min(1).nullable(),
  key_takeaway: z.string().min(1),
  narration_script: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type GeneratedExplanation = z.infer<typeof generatedExplanationSchema>;

export function parseGeneratedExplanation(input: unknown) {
  return generatedExplanationSchema.safeParse(input);
}
