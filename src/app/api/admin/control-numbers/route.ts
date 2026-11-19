import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET — returns students with their control numbers
 * POST — generates control numbers for all students that don't have one
 *
 * Format: IDV-GGLL-NNNN
 *   IDV = Instituto Don Vasco prefix
 *   GG  = grade (01, 02, 03)
 *   LL  = letter (A, B, C…)
 *   NNNN = sequential per group, zero-padded
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

  // First check if the column exists by trying a select
  const { error: colCheck } = await admin
    .from("students")
    .select("control_number")
    .limit(1);

  if (colCheck) {
    // Column doesn't exist, need to add it via raw SQL
    // We'll use the Supabase admin client's rpc or a direct query
    // Since we can't run raw SQL from the JS client easily,
    // let's try a different approach - use rpc
    const { error: alterErr } = await admin.rpc("exec_sql", {
      query: "ALTER TABLE students ADD COLUMN IF NOT EXISTS control_number TEXT;",
    });
    // If rpc doesn't exist, try alternative
    if (alterErr) {
      // The column might already exist or we need a migration
      // Let's try to continue anyway - the POST body handles both cases
      console.warn("Could not add column via rpc:", alterErr.message);
    }
  }

  // Fetch all groups and students
  const { data: groups } = await admin
    .from("groups")
    .select("id, grade, letter")
    .order("grade")
    .order("letter");
  if (!groups) return NextResponse.json({ error: "No se pudieron cargar grupos" }, { status: 500 });

  const { data: students } = await admin
    .from("students")
    .select("id, full_name, group_id, control_number, list_num, status")
    .order("full_name");
  if (!students) return NextResponse.json({ error: "No se pudieron cargar alumnos" }, { status: 500 });

  const groupMap = new Map(groups.map((g) => [g.id, g]));
  let assigned = 0;

  // Group students by group_id
  const byGroup = new Map<number, typeof students>();
  for (const s of students) {
    if (!byGroup.has(s.group_id)) byGroup.set(s.group_id, []);
    byGroup.get(s.group_id)!.push(s);
  }

  // Generate control numbers per group
  for (const [groupId, groupStudents] of Array.from(byGroup)) {
    const g = groupMap.get(groupId);
    if (!g) continue;

    // Sort by list_num then by name
    groupStudents.sort((a: any, b: any) => (a.list_num || 999) - (b.list_num || 999) || a.full_name.localeCompare(b.full_name));

    let seq = 1;
    for (const s of groupStudents) {
      if (s.control_number) {
        seq++;
        continue;
      }
      const grade = String(g.grade).padStart(2, "0");
      const cn = `IDV-${grade}${g.letter}-${String(seq).padStart(4, "0")}`;

      const { error } = await admin
        .from("students")
        .update({ control_number: cn })
        .eq("id", s.id);

      if (!error) assigned++;
      seq++;
    }
  }

  return NextResponse.json({
    message: `Se asignaron ${assigned} números de control`,
    assigned,
    total: students.length,
  });
}
