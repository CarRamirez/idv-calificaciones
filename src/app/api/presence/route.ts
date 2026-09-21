import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST: Send heartbeat (update last_active)
export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ last_active: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}

// GET: Count online users (active in last 3 minutes)
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const threshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("last_active", threshold);

  return NextResponse.json({ count: error ? 0 : (count || 0) });
}
