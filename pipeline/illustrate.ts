import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { SeedQuestion } from "./types";
import { illustrationSystemPrompt, illustrationUserPrompt } from "./prompts";
import { withRetry, RetryableError } from "./retry";

export function extractSvg(text: string): string {
  const start = text.indexOf("<svg");
  const end = text.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || end < start) {
    throw new RetryableError("No SVG markup found in model response");
  }
  return text.slice(start, end + "</svg>".length);
}

export async function generateIllustration(
  question: SeedQuestion,
  client = new Anthropic({ apiKey: env.anthropicKey() })
): Promise<string> {
  return withRetry(async () => {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: illustrationSystemPrompt(),
      messages: [{ role: "user", content: illustrationUserPrompt(question) }],
    });

    const message = await stream.finalMessage();
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return extractSvg(text);
  });
}
