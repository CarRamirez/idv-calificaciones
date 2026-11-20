import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Índice compacto para el buscador: se descarga una vez y la búsqueda corre
 * en el navegador (instantánea). Adaptado del patrón de SIGEFCP.
 * alumnos: [id, group_id, full_name, list_num, status, control_number?]
 * profesores: [id, full_name, role, label]
 * grupos: [id, grade, letter]
 * materias: [id, name, grade]
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Sin perfil" }, { status: 403 });
  }

  const admin = createAdminClient();

  const isAdmin = ["superadmin", "admin"].includes(profile.role);

  // Fetch all data in parallel
  const [studentsRes, groupsRes, profilesRes, subjectsRes] = await Promise.all([
    admin
      .from("students")
      .select("id, full_name, group_id, list_num, status, control_number")
      .order("full_name"),
    admin.from("groups").select("id, grade, letter").order("grade").order("letter"),
    isAdmin
      ? admin.from("profiles").select("id, full_name, role, label").order("full_name")
      : Promise.resolve({ data: [] }),
    isAdmin
      ? admin
          .from("subjects")
          .select("id, name, grade")
          .order("grade")
          .order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);

  const canViewBoleta = ["superadmin", "admin", "direccion", "profesor", "secretaria", "visor"].includes(
    profile.role
  );

  return NextResponse.json(
    {
      verBoleta: canViewBoleta,
      role: profile.role,
      grupos: (groupsRes.data ?? []).map((g) => [g.id, g.grade, g.letter]),
      alumnos: (studentsRes.data ?? []).map((s) => [
        s.id,
        s.group_id,
        s.full_name,
        s.list_num ?? 0,
        s.status === "activo" ? 0 : 1,
        s.control_number ?? "",
      ]),
      profesores: (profilesRes.data ?? []).map((p) => [
        p.id,
        p.full_name,
        p.role,
        p.label ?? "",
      ]),
      materias: (subjectsRes.data ?? []).map((m) => [m.id, m.name, m.grade]),
    },
    { headers: { "Cache-Control": "private, max-age=300" } }
  );
}
