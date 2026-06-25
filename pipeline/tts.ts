import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import { env } from "./env";

/** Cloudflare R2 (S3-compatible, zero egress). Used for lesson audio. */
export function r2() {
  return new AwsClient({
    accessKeyId: env.r2AccessKeyId(),
    secretAccessKey: env.r2Secret(),
    region: "auto",
    service: "s3",
  });
}

export function r2Endpoint(key: string): string {
  return `https://${env.r2AccountId()}.r2.cloudflarestorage.com/${env.r2Bucket()}/${key}`;
}

export function r2PublicUrl(key: string): string {
  return `${env.r2PublicUrl()}/${key}`;
}

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
  _admin: SupabaseClient,
  sourceRef: string,
  audio: Buffer
): Promise<string> {
  const key = `${sourceRef}.mp3`;
  const res = await r2().fetch(r2Endpoint(key), {
    method: "PUT",
    body: new Uint8Array(audio),
    headers: { "content-type": "audio/mpeg" },
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  return r2PublicUrl(key);
}

export function adminClient(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false },
  });
}
