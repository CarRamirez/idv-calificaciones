import { NextResponse } from "next/server";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { permisosParaRol, type Cambios, PERFILES, type Rol } from "@/lib/roles";

/**
 * GET /api/auth/permissions
 * Returns the effective permissions array for the current user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ permissions: [] });
  }

  // Get user's role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ permissions: [] });
  }

  const rol = profile.role as string;

  // Superadmin gets everything
  if (rol === "superadmin") {
    return NextResponse.json({ permissions: ["*"] });
  }

  // Fetch overrides from permisos_rol
  const { data: overrides } = await supabase
    .from("permisos_rol")
    .select("rol, modulo, habilitado")
    .in("rol", PERFILES as unknown as string[]);

  // Build cambios map
  const cambios: Cambios = {};
  for (const o of overrides || []) {
    cambios[`${o.rol}:${o.modulo}`] = o.habilitado;
  }

  // Calculate effective permissions for this role
  const permissions = permisosParaRol(rol, cambios);

  return NextResponse.json({ permissions });
}
