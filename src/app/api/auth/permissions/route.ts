import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUILTIN_PERMS: Record<string, string[]> = {
  admin: [
    "dashboard", "calificaciones", "captura", "boleta", "periodos",
    "usuarios", "tareas", "concentrado",
    "admin_profesores", "admin_alumnos", "admin_grupos",
    "admin_materias", "admin_sesiones", "admin_roles",
  ],
  teacher: ["dashboard", "calificaciones", "captura", "boleta"],
  direccion_secundaria: [
    "dashboard", "calificaciones", "captura", "boleta", "periodos",
    "usuarios", "tareas", "concentrado",
    "admin_profesores", "admin_alumnos",
  ],
  viewer: ["dashboard", "concentrado"],
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ permissions: [] }, { status: 401 });
  }

  // Check for impersonation
  const cookieStore = cookies();
  const impersonateAs = cookieStore.get("impersonate_as")?.value;
  const impersonateAdminId = cookieStore.get("impersonate_admin_id")?.value;

  let effectiveRole: string = "";

  if (impersonateAs && impersonateAdminId === user.id) {
    // Admin is impersonating — verify admin is still admin
    const admin = createAdminClient();
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role === "admin") {
      // Get the target user's role
      const { data: targetProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", impersonateAs)
        .single();

      if (targetProfile) {
        effectiveRole = targetProfile.role;
      }
    }
  }

  if (effectiveRole === "") {
    // Normal flow — get own role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ permissions: [] });
    }
    effectiveRole = profile.role;
  }

  if (BUILTIN_PERMS[effectiveRole]) {
    return NextResponse.json({ permissions: BUILTIN_PERMS[effectiveRole] });
  }

  // Custom role — use admin client to bypass RLS
  const admin = createAdminClient();
  const { data: roleData } = await admin
    .from("roles")
    .select("permissions")
    .eq("name", effectiveRole)
    .single();

  return NextResponse.json({ permissions: roleData?.permissions || [] });
}
