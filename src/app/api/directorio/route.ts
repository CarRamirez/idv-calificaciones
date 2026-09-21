import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveProfile } from "@/lib/impersonation";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 403 });

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);

  const ALLOWED_ROLES = ["admin", "directora_anita", "teacher", "viewer"];
  if (!ALLOWED_ROLES.includes(effectiveProfile.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("profiles")
    .select("id, full_name, role, celular, correo_personal, telefono_emergencia, nombre_emergencia, relacion_emergencia")
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: users || [] });
}
