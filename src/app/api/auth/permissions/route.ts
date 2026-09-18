import { NextResponse } from "next/server";
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
  viewer: ["dashboard", "concentrado"],
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ permissions: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ permissions: [] });
  }

  if (BUILTIN_PERMS[profile.role]) {
    return NextResponse.json({ permissions: BUILTIN_PERMS[profile.role] });
  }

  // Custom role — use admin client to bypass RLS
  const admin = createAdminClient();
  const { data: roleData } = await admin
    .from("roles")
    .select("permissions")
    .eq("name", profile.role)
    .single();

  return NextResponse.json({ permissions: roleData?.permissions || [] });
}
