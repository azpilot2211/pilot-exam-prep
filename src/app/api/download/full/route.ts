import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCourseAudioUrls } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Stitching the whole course can take a while; give it room.
export const maxDuration = 300;

const FILENAME = "flying-ace-full-course.mp3";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to download" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.tier !== "pro") {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const urls = await getCourseAudioUrls();
  if (urls.length === 0) {
    return NextResponse.json({ error: "No course audio available" }, { status: 404 });
  }

  // Preflight: sum file sizes so the browser can show a real progress bar.
  // Byte-concatenated MP3 output length === sum of part sizes. If any size is
  // missing, omit Content-Length and fall back to chunked transfer.
  let totalBytes = 0;
  let haveAllSizes = true;
  for (const url of urls) {
    try {
      const head = await fetch(url, { method: "HEAD" });
      const len = head.headers.get("Content-Length");
      if (head.ok && len) {
        totalBytes += parseInt(len, 10);
      } else {
        haveAllSizes = false;
        break;
      }
    } catch {
      haveAllSizes = false;
      break;
    }
  }

  // Stream each MP3's bytes sequentially — never buffers the whole course in memory.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const url of urls) {
        const res = await fetch(url);
        if (!res.ok || !res.body) continue; // skip a missing file rather than abort
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      }
      controller.close();
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Content-Disposition", `attachment; filename="${FILENAME}"`);
  if (haveAllSizes && totalBytes > 0) {
    headers.set("Content-Length", String(totalBytes));
  }

  return new NextResponse(stream, { headers });
}
