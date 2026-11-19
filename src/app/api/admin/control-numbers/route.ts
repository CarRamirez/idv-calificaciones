import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET — returns students with their control numbers
 * POST — generates control numbers for all students that don't have one
 *
 * Format: YYYYNNN
 *   YYYY = current year
 *   NNN  = sequential, zero-padded (001, 002, … 999)
 */
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
  if (!profile || !["admin", "directora_anita"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: students } = await admin
    .from("students")
    .select("id, full_name, group_id, control_number, status, groups(grade, letter)")
    .order("full_name");

  return NextResponse.json({ students: students ?? [] });
}

export async function POST() {
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
  if (!profile || !["admin", "directora_anita"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const admin = createAdminClient();
  const year = new Date().getFullYear();
  const prefix = String(year);

  // Find the highest existing number for this year
  const { data: maxRow } = await admin
    .from("students")
    .select("control_number")
    .like("control_number", `${prefix}%`)
    .order("control_number", { ascending: false })
    .limit(1);

  let nextSeq = 1;
  if (maxRow && maxRow.length > 0 && maxRow[0].control_number) {
    const numPart = maxRow[0].control_number.replace(prefix, "");
    nextSeq = parseInt(numPart, 10) + 1;
  }

  // Fetch students without control number, sorted by grade > letter > list_num > name
  const { data: students } = await admin
    .from("students")
    .select("id, full_name, group_id, list_num, status, control_number, groups!inner(grade, letter)")
    .is("control_number", null)
    .eq("status", "activo")
    .order("full_name");

  if (!students || students.length === 0) {
    return NextResponse.json({
      message: "Todos los alumnos activos ya tienen número de control",
      assigned: 0,
    });
  }

  // Sort by grade, letter, list_num, name
  const sorted = [...students].sort((a: any, b: any) => {
    const ga = a.groups?.grade ?? 99;
    const gb = b.groups?.grade ?? 99;
    if (ga !== gb) return ga - gb;
    const la = a.groups?.letter ?? "Z";
    const lb = b.groups?.letter ?? "Z";
    if (la !== lb) return la.localeCompare(lb);
    const na = a.list_num || 999;
    const nb = b.list_num || 999;
    if (na !== nb) return na - nb;
    return a.full_name.localeCompare(b.full_name);
  });

  let assigned = 0;
  for (const s of sorted) {
    const cn = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    const { error } = await admin
      .from("students")
      .update({ control_number: cn })
      .eq("id", s.id);
    if (!error) {
      assigned++;
      nextSeq++;
    }
  }

  return NextResponse.json({
    message: `Se asignaron ${assigned} números de control`,
    assigned,
    total: students.length,
  });
}
