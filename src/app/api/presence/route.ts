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
// Admin roles also get the list of who is online
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const threshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  // Check if caller is admin
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const ADMIN_ROLES = ["admin", "directora_anita"];
  const isAdmin = callerProfile && ADMIN_ROLES.includes(callerProfile.role);

  if (isAdmin) {
    // Return full list for admins
    const { data: onlineUsers, error } = await admin
      .from("profiles")
      .select("id, full_name, role, last_active")
      .gte("last_active", threshold)
      .order("full_name");

    return NextResponse.json({
      count: error ? 0 : (onlineUsers?.length || 0),
      users: error ? [] : (onlineUsers || []),
    });
  }

  // Non-admin: just the count
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("last_active", threshold);

  return NextResponse.json({ count: error ? 0 : (count || 0) });
}
