import { config } from "dotenv";

config({ path: ".env.local" });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  elevenLabsKey: () => required("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: () => process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
};
