// One-time: copy existing lesson audio from Supabase Storage → R2 and rewrite
// question_content.audio_url. Idempotent — rows already on R2 are skipped, so
// it's safe to re-run. Run after the R2 env vars are set:
//   npx tsx pipeline/migrate-audio-to-r2.ts
import { adminClient, r2, r2Endpoint, r2PublicUrl } from "./tts";
import { env } from "./env";

async function main() {
  const admin = adminClient();
  const publicBase = env.r2PublicUrl();
  const client = r2();

  const { data, error } = await admin
    .from("question_content")
    .select("question_id, audio_url")
    .not("audio_url", "is", null);
  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (r) => r.audio_url && !r.audio_url.startsWith(publicBase)
  );
  console.log(`${rows.length} audio file(s) to move to R2`);

  let done = 0;
  for (const row of rows) {
    const key = (row.audio_url as string).split("/").pop()!; // "<sourceRef>.mp3"

    const src = await fetch(row.audio_url as string);
    if (!src.ok) throw new Error(`fetch ${key} failed: ${src.status}`);
    const body = new Uint8Array(await src.arrayBuffer());

    const put = await client.fetch(r2Endpoint(key), {
      method: "PUT",
      body,
      headers: { "content-type": "audio/mpeg" },
    });
    if (!put.ok) throw new Error(`R2 PUT ${key} failed: ${put.status} ${await put.text()}`);

    const { error: upErr } = await admin
      .from("question_content")
      .update({ audio_url: r2PublicUrl(key) })
      .eq("question_id", row.question_id);
    if (upErr) throw new Error(`DB update ${key} failed: ${upErr.message}`);

    console.log(`moved ${key} (${++done}/${rows.length})`);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
