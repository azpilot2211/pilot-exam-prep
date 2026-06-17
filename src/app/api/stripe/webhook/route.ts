import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Use the service role key to bypass RLS in webhook handler
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function setSubscriber(
  supabaseUserId: string,
  isSubscriber: boolean,
  subscriptionId: string | null,
  subscriptionStatus: string
) {
  const admin = adminClient();
  await admin.from("profiles").upsert({
    id: supabaseUserId,
    is_subscriber: isSubscriber,
    subscription_id: subscriptionId,
    subscription_status: subscriptionStatus,
    updated_at: new Date().toISOString(),
  });
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const customer = await getStripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer as Stripe.Customer).metadata?.supabase_user_id ?? null;
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const subId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
      if (userId) {
        await setSubscriber(userId, true, subId, "active");
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdFromCustomer(sub.customer as string);
      if (userId) {
        const active = ["active", "trialing"].includes(sub.status);
        await setSubscriber(userId, active, sub.id, sub.status);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdFromCustomer(sub.customer as string);
      if (userId) {
        await setSubscriber(userId, false, null, "canceled");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
