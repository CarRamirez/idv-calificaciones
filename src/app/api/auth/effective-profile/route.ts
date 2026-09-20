import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const { effectiveProfile, isImpersonating, impersonatedUserId } = await getEffectiveProfile(
    user.id,
    profile
  );

  return NextResponse.json({
    full_name: effectiveProfile.full_name,
    role: effectiveProfile.role,
    isImpersonating,
    effectiveUserId: impersonatedUserId || user.id,
  });
}
