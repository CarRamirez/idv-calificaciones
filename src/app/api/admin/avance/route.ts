import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllGrades } from "@/lib/fetch-all-grades";

const ADMIN_ROLES = ["admin", "directora_anita"];

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Check admin role or custom role with dashboard permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Sin perfil" }, { status: 403 });
    }

    let isAdmin = ADMIN_ROLES.includes(profile.role);
    if (!isAdmin) {
      const admin = createAdminClient();
      const { data: roleData } = await admin
        .from("roles")
        .select("permissions")
        .eq("name", profile.role)
        .single();
      if (roleData?.permissions?.includes("dashboard")) isAdmin = true;
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Get all teachers
    const { data: teachers } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "teacher")
      .order("full_name");

    // 2. Get all teacher assignments (teacher -> group -> subject)
    const { data: assignments } = await admin
      .from("teacher_assignments")
      .select("teacher_id, group_id, subject_id, groups(grade, letter), subjects(name, short_name, counts_for_avg)")
      .order("teacher_id");

    // 3. Get all active students per group
    const { data: students } = await admin
      .from("students")
      .select("id, group_id")
      .eq("status", "activo");

    // Count students per group
    const studentsPerGroup: Record<string, number> = {};
    (students || []).forEach((s: any) => {
      studentsPerGroup[s.group_id] = (studentsPerGroup[s.group_id] || 0) + 1;
    });

    // 4. Get all grades (just student_id, subject_id, period, score) 
    //    to count how many have been captured
    const studentIds = (students || []).map((s: any) => s.id);
    const allGrades = studentIds.length > 0
      ? await fetchAllGrades(admin, studentIds, {
          columns: "student_id, subject_id, period, score",
          extraFilter: (q: any) => q.not("score", "is", null),
        })
      : [];

    // Build a set of captured grades: "studentId:subjectId:period"
    const capturedSet = new Set<string>();
    allGrades.forEach((g) => {
      capturedSet.add(`${g.student_id}:${g.subject_id}:${g.period}`);
    });

    // 5. Get students per group for assignment matching
    const studentsByGroup: Record<string, string[]> = {};
    (students || []).forEach((s: any) => {
      if (!studentsByGroup[s.group_id]) studentsByGroup[s.group_id] = [];
      studentsByGroup[s.group_id].push(s.id);
    });

    // 6. Build per-teacher, per-period progress
    // For each teacher: for each assignment (group+subject), for each period 1-8:
    //   expected = students in that group
    //   captured = grades that exist for those students + subject + period
    type TeacherProgress = {
      teacher_id: string;
      full_name: string;
      email: string | null;
      assignments: {
        group_id: string;
        group_label: string;
        subject_name: string;
        subject_short: string;
        subject_id: string;
        periods: Record<number, { expected: number; captured: number }>;
      }[];
      periods: Record<number, { expected: number; captured: number }>;
    };

    const teacherMap: Record<string, TeacherProgress> = {};

    (teachers || []).forEach((t: any) => {
      teacherMap[t.id] = {
        teacher_id: t.id,
        full_name: t.full_name,
        email: t.email,
        assignments: [],
        periods: {},
      };
      for (let p = 1; p <= 8; p++) {
        teacherMap[t.id].periods[p] = { expected: 0, captured: 0 };
      }
    });

    (assignments || []).forEach((a: any) => {
      if (!teacherMap[a.teacher_id]) return; // skip if teacher profile missing
      
      const groupStudents = studentsByGroup[a.group_id] || [];
      const groupLabel = `${a.groups?.grade}°${a.groups?.letter}`;

      const assignmentPeriods: Record<number, { expected: number; captured: number }> = {};
      for (let p = 1; p <= 8; p++) {
        let captured = 0;
        for (const sid of groupStudents) {
          if (capturedSet.has(`${sid}:${a.subject_id}:${p}`)) captured++;
        }
        assignmentPeriods[p] = { expected: groupStudents.length, captured };
      }

      teacherMap[a.teacher_id].assignments.push({
        group_id: a.group_id,
        group_label: groupLabel,
        subject_name: a.subjects?.name || "?",
        subject_short: a.subjects?.short_name || "?",
        subject_id: a.subject_id,
        periods: assignmentPeriods,
      });

      for (let p = 1; p <= 8; p++) {
        teacherMap[a.teacher_id].periods[p].expected += groupStudents.length;
        // Count captured
        let captured = 0;
        for (const sid of groupStudents) {
          if (capturedSet.has(`${sid}:${a.subject_id}:${p}`)) captured++;
        }
        teacherMap[a.teacher_id].periods[p].captured += captured;
      }
    });

    // 7. Get evaluation periods info
    const { data: evalPeriods } = await admin
      .from("evaluation_periods")
      .select("period_number, name, trimester, is_open, open_date, close_date, school_years!inner(is_current)")
      .eq("school_years.is_current", true)
      .order("period_number");

    return NextResponse.json({
      teachers: Object.values(teacherMap).filter((t) => t.assignments.length > 0),
      periods: (evalPeriods || []).map((p: any) => ({
        period_number: p.period_number,
        name: p.name,
        trimester: p.trimester,
        is_open: p.is_open,
      })),
    });
  } catch (err) {
    console.error("Avance error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
