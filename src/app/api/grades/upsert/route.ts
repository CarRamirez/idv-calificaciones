import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROLES = ["admin", "directora_anita"];

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Sin perfil" }, { status: 401 });
  }

  const { effectiveProfile, impersonatedUserId } = await getEffectiveProfile(user.id, profile);
  const effectiveUserId = impersonatedUserId || user.id;
  const isAdmin = ADMIN_ROLES.includes(effectiveProfile.role);

  let body: {
    groupId: string;
    subjectId: string;
    grades: Array<{
      student_id: string;
      period: number;
      score: number | null;
      absences: number;
      comment?: string;
    }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { groupId, subjectId, grades } = body;

  if (!groupId || !subjectId || !Array.isArray(grades) || grades.length === 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Authorization: verify teacher is assigned to this group+subject
  if (!isAdmin) {
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", effectiveUserId)
      .eq("group_id", groupId)
      .eq("subject_id", subjectId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "No tienes asignacion para este grupo y materia" },
        { status: 403 }
      );
    }
  }

  // Validate students belong to the group
  const studentIds = Array.from(new Set(grades.map((g) => g.student_id)));
  const { data: validStudents } = await supabase
    .from("students")
    .select("id")
    .eq("group_id", groupId)
    .in("id", studentIds);

  const validIds = new Set((validStudents || []).map((s: any) => s.id));
  const invalidIds = studentIds.filter((id) => !validIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Alumnos no pertenecen al grupo: " + invalidIds.length + " invalidos" },
      { status: 400 }
    );
  }

  // Validate score ranges
  for (const g of grades) {
    if (g.score !== null && (typeof g.score !== "number" || g.score < 0 || g.score > 10)) {
      return NextResponse.json(
        { error: "Calificacion invalida: " + g.score },
        { status: 400 }
      );
    }
    if (typeof g.period !== "number" || g.period < 1 || g.period > 8) {
      return NextResponse.json(
        { error: "Periodo invalido: " + g.period },
        { status: 400 }
      );
    }
  }

  // Write grades with admin client (bypasses RLS, already authorized above)
  const adminDb = createAdminClient();
  const now = new Date().toISOString();

  const upserts = grades.map((g) => ({
    student_id: g.student_id,
    subject_id: subjectId,
    period: g.period,
    score: g.score,
    absences: g.absences ?? 0,
    comment: g.comment || null,
    updated_by: user.id,
    updated_at: now,
  }));

  const { error } = await adminDb
    .from("grades")
    .upsert(upserts, { onConflict: "student_id,subject_id,period" });

  if (error) {
    console.error("Grade upsert error:", error);
    return NextResponse.json(
      { error: "Error al guardar: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, count: upserts.length });
}
