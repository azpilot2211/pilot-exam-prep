import { createClient } from "./supabase/server";

export async function getSubscription(): Promise<{
  isSubscriber: boolean;
  stripeCustomerId: string | null;
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("is_subscriber, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    isSubscriber: data?.is_subscriber ?? false,
    stripeCustomerId: data?.stripe_customer_id ?? null,
  };
}
