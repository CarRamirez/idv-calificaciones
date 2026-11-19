import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: permisos } = await admin
    .from("permisos_rol")
    .select("*")
    .order("rol")
    .order("modulo");

  return NextResponse.json({ permisos: permisos ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { rol, modulo, habilitado } = body;

  if (!rol || !modulo || typeof habilitado !== "boolean") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("permisos_rol")
    .upsert(
      { rol, modulo, habilitado, updated_at: new Date().toISOString() },
      { onConflict: "rol,modulo" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Reset to defaults
export async function DELETE() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  // Delete all and re-insert defaults
  await admin.from("permisos_rol").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const defaults: { rol: string; modulo: string; habilitado: boolean }[] = [];
  const modulos = [
    "dashboard", "captura", "boleta", "concentrado", "avance", "reportes",
    "lista", "alumnos", "materias", "profesores", "asignar", "directorio",
    "servicios_escolares", "ciclo", "usuarios", "roles", "sesiones", "auditoria", "periodos",
  ];

  const rolDefaults: Record<string, string[]> = {
    directora_anita: [
      "dashboard", "captura", "boleta", "concentrado", "avance", "reportes",
      "lista", "alumnos", "materias", "profesores", "asignar", "directorio",
      "servicios_escolares", "ciclo", "usuarios", "sesiones", "auditoria", "periodos",
    ],
    teacher: ["dashboard", "captura", "boleta", "concentrado", "avance", "reportes", "directorio", "servicios_escolares"],
    viewer: ["dashboard", "boleta", "concentrado", "avance", "reportes", "directorio"],
  };

  for (const rol of Object.keys(rolDefaults)) {
    for (const modulo of modulos) {
      defaults.push({ rol, modulo, habilitado: rolDefaults[rol].includes(modulo) });
    }
  }

  await admin.from("permisos_rol").insert(defaults);

  return NextResponse.json({ ok: true, message: "Permisos restablecidos" });
}
