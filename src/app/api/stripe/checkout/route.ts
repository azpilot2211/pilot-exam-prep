import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_BASIC, PRICE_PRO } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { parseTier } from "@/lib/entitlement";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tier = parseTier(body?.tier);
  if (tier !== "basic" && tier !== "pro") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const price = tier === "basic" ? PRICE_BASIC : PRICE_PRO;
  if (!price) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: profile } = await supabaseAny
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabaseAny.from("profiles").upsert({ id: user.id, stripe_customer_id: customerId });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://flyingaceexams.com";

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/account?purchased=${tier}`,
      cancel_url: `${origin}/course`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id, tier },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
