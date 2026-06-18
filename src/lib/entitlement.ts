import { createClient } from "./supabase/server";

export type Tier = "free" | "basic" | "pro";

const RANK: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };

/** True if `owned` meets or exceeds `required`. */
export function hasAccess(owned: Tier, required: Tier): boolean {
  return RANK[owned] >= RANK[required];
}

/** Narrow an arbitrary string to a Tier, or null if invalid. */
export function parseTier(value: string | undefined | null): Tier | null {
  if (value === "free" || value === "basic" || value === "pro") return value;
  return null;
}

/** Read the current user's tier. Returns "free" when logged out or unset. */
export async function getTier(): Promise<Tier> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  return parseTier(data?.tier) ?? "free";
}
