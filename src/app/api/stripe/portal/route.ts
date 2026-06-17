import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://flyingaceexams.com";

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
