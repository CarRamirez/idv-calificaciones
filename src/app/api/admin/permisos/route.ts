import { NextResponse } from "next/server";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { PERFILES, SECCIONES, type Rol } from "@/lib/roles";

/**
 * GET /api/admin/permisos
 * Returns all overrides from permisos_rol (only valid new roles).
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verify superadmin or admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["superadmin", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { data: permisos, error } = await supabase
    .from("permisos_rol")
    .select("*")
    .in("rol", PERFILES as unknown as string[]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ permisos: permisos || [] });
}

/**
 * POST /api/admin/permisos
 * Upsert a single permission override.
 * Body: { rol, modulo, habilitado }
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["superadmin", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const { rol, modulo, habilitado } = body;

  if (!rol || !modulo || typeof habilitado !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // Validate rol is a configurable profile
  if (!PERFILES.includes(rol as Rol)) {
    return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
  }

  // Check if this is actually a default value — if so, delete the override
  const ruta = SECCIONES.flatMap((s) => s.rutas).find((r) => r.id === modulo);
  if (!ruta) {
    return NextResponse.json({ error: "Módulo no válido" }, { status: 400 });
  }

  const isDefault = ruta.roles.includes(rol as Rol) === habilitado;

  if (isDefault) {
    // Remove override (revert to default)
    await supabase
      .from("permisos_rol")
      .delete()
      .eq("rol", rol)
      .eq("modulo", modulo);
  } else {
    // Upsert override
    const { error } = await supabase
      .from("permisos_rol")
      .upsert(
        { rol, modulo, habilitado },
        { onConflict: "rol,modulo" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Audit log
  try { await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "permiso_updated",
    details: { rol, modulo, habilitado },
  }); } catch {}

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/permisos
 * Reset all overrides to defaults (delete all rows).
 */
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["superadmin", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Delete only overrides for valid roles
  for (const rol of PERFILES) {
    await supabase
      .from("permisos_rol")
      .delete()
      .eq("rol", rol);
  }

  // Audit log
  try { await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "permisos_reset",
    details: { message: "Todos los permisos restablecidos a valores predeterminados" },
  }); } catch {}

  return NextResponse.json({ ok: true });
}
