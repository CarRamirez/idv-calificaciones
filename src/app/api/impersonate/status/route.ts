import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ active: false });
  }

  const cookieStore = cookies();
  const targetId = cookieStore.get("impersonate_as")?.value;
  const adminId = cookieStore.get("impersonate_admin_id")?.value;

  if (!targetId || !adminId || adminId !== user.id) {
    return NextResponse.json({ active: false });
  }

  const admin = createAdminClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", targetId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ active: false });
  }

  // Get role display name
  const { data: roleInfo } = await admin
    .from("roles")
    .select("display_name")
    .eq("name", targetProfile.role)
    .single();

  const roleLabel = roleInfo?.display_name || (
    targetProfile.role === "admin" ? "Administrador" :
    targetProfile.role === "teacher" ? "Profesor" :
    targetProfile.role === "viewer" ? "Consulta" : targetProfile.role
  );

  return NextResponse.json({
    active: true,
    name: targetProfile.full_name,
    role: roleLabel,
    targetId,
  });
}
