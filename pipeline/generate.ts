import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { SeedQuestion } from "./types";
import { explanationSystemPrompt, explanationUserPrompt } from "./prompts";
import { parseGeneratedExplanation, type GeneratedExplanation } from "./schema";
import { withRetry, RetryableError } from "./retry";

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new RetryableError("No JSON object found in model response");
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new RetryableError(`Malformed JSON in model response: ${(e as Error).message}`);
  }
}

export async function generateExplanation(
  question: SeedQuestion,
  client = new Anthropic({ apiKey: env.anthropicKey() })
): Promise<GeneratedExplanation> {
  return withRetry(async () => {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: explanationSystemPrompt(),
    messages: [{ role: "user", content: explanationUserPrompt(question) }],
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = parseGeneratedExplanation(extractJson(text));
  if (!parsed.success) {
    throw new RetryableError(`Generated explanation failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
  });
}
