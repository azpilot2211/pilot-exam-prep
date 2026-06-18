import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { parseTier } from "@/lib/entitlement";
import type Stripe from "stripe";

// Use the service role key to bypass RLS in webhook handler
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function setTier(supabaseUserId: string, tier: "basic" | "pro") {
  const admin = adminClient();
  await admin.from("profiles").upsert({
    id: supabaseUserId,
    tier,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const tier = parseTier(session.metadata?.tier);
    if (userId && (tier === "basic" || tier === "pro")) {
      await setTier(userId, tier);
    }
    // unknown/missing tier: log and no-op (Stripe retries are harmless)
  }

  return NextResponse.json({ received: true });
}
