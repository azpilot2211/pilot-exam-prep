import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const audioUrl = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") ?? "lesson.mp3";

  if (!audioUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Fetch the audio from Supabase storage and stream it back with download headers
  const response = await fetch(audioUrl);
  if (!response.ok) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  if (response.headers.get("Content-Length")) {
    headers.set("Content-Length", response.headers.get("Content-Length")!);
  }

  return new NextResponse(response.body, { headers });
}
