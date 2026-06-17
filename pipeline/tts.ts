import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export async function synthesizeNarration(script: string): Promise<Buffer> {
  const voiceId = env.elevenLabsVoiceId();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${detail}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadAudio(
  admin: SupabaseClient,
  sourceRef: string,
  audio: Buffer
): Promise<string> {
  const path = `${sourceRef}.mp3`;
  const { error } = await admin.storage
    .from("audio")
    .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) throw new Error(`Audio upload failed: ${error.message}`);
  const { data } = admin.storage.from("audio").getPublicUrl(path);
  return data.publicUrl;
}

export function adminClient(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false },
  });
}
