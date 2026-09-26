import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);
  const isAdmin = effectiveProfile.role === "admin" || effectiveProfile.role === "directora_anita" || effectiveProfile.role === "viewer";

  if (!isAdmin) return NextResponse.json({ error: "No access" }, { status: 403 });

  // ── Get active period ──
  const { data: periods } = await supabase
    .from("evaluation_periods")
    .select("period_number, name, is_open, open_date, close_date, school_years!inner(is_current)")
    .eq("school_years.is_current", true)
    .order("period_number");

  const now = new Date();
  const allPeriods = (periods || []).map((p: any) => {
    let effectively_open = p.is_open;
    if (effectively_open && p.open_date) effectively_open = now >= new Date(p.open_date);
    if (effectively_open && p.close_date) effectively_open = now <= new Date(p.close_date);
    return { ...p, effectively_open };
  });

  const activePeriod = allPeriods.find((p: any) => p.effectively_open);

  // ── Get all groups ──
  const { data: groups } = await supabase
    .from("groups")
    .select("id, grade, letter, school_years!inner(is_current)")
    .eq("school_years.is_current", true)
    .order("grade")
    .order("letter");

  // ── Get all teacher assignments ──
  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("id, teacher_id, subject_id, group_id, profiles:teacher_id(full_name), subjects(id, name, short_name, grade, counts_for_avg), groups(id, grade, letter)");

  // ── Get active students ──
  const { data: students } = await supabase
    .from("students")
    .select("id, group_id, full_name")
    .eq("is_active", true);

  // Students by group (reused)
  const studentsByGroup: Record<string, any[]> = {};
  (students || []).forEach((s: any) => {
    if (!studentsByGroup[s.group_id]) studentsByGroup[s.group_id] = [];
    studentsByGroup[s.group_id].push(s);
  });

  // ══════════════════════════════════════════════
  // 1) CAPTURE ALERTS — teachers with incomplete capture
  // ══════════════════════════════════════════════
  let captureAlerts: any[] = [];

  if (activePeriod && assignments && students) {
    const { data: gradesData } = await supabase
      .from("grades")
      .select("student_id, subject_id, score")
      .eq("period", activePeriod.period_number)
      .not("score", "is", null);

    const gradedSet = new Set(
      (gradesData || []).map((g: any) => `${g.student_id}-${g.subject_id}`)
    );

    const teacherProgress: Record<string, {
      name: string;
      assignments: { group: string; subject: string; captured: number; total: number }[];
    }> = {};

    (assignments || []).forEach((a: any) => {
      if (!a.subjects || !a.groups || !a.profiles) return;
      const groupStudents = studentsByGroup[a.groups.id] || [];
      const total = groupStudents.length;
      if (total === 0) return;

      const captured = groupStudents.filter(
        (s: any) => gradedSet.has(`${s.id}-${a.subjects.id}`)
      ).length;

      const tid = a.teacher_id;
      if (!teacherProgress[tid]) {
        teacherProgress[tid] = { name: a.profiles.full_name, assignments: [] };
      }
      teacherProgress[tid].assignments.push({
        group: `${a.groups.grade}°${a.groups.letter}`,
        subject: a.subjects.short_name || a.subjects.name,
        captured,
        total,
      });
    });

    captureAlerts = Object.entries(teacherProgress)
      .map(([tid, info]) => {
        const pending = info.assignments.filter((a) => a.captured < a.total);
        const totalExpected = info.assignments.reduce((s, a) => s + a.total, 0);
        const totalCaptured = info.assignments.reduce((s, a) => s + a.captured, 0);
        const pct = totalExpected > 0 ? Math.round((totalCaptured / totalExpected) * 100) : 100;
        return {
          teacherId: tid,
          teacherName: info.name,
          pct,
          totalCaptured,
          totalExpected,
          pendingDetails: pending.map((p) => `${p.group} ${p.subject} (${p.captured}/${p.total})`),
        };
      })
      .filter((a) => a.pct < 100)
      .sort((a, b) => a.pct - b.pct);
  }

  // ══════════════════════════════════════════════
  // 2) PERFORMANCE STATS — averages and at-risk students
  // ══════════════════════════════════════════════
  let performanceByGroup: any[] = [];

  if (activePeriod && groups && students) {
    const { data: allGrades } = await supabase
      .from("grades")
      .select("student_id, subject_id, score")
      .eq("period", activePeriod.period_number)
      .not("score", "is", null);

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, short_name, grade, counts_for_avg");

    const countingSubjects = new Set(
      (subjects || []).filter((s: any) => s.counts_for_avg).map((s: any) => s.id)
    );

    const subjectMap: Record<string, any> = {};
    (subjects || []).forEach((s: any) => { subjectMap[s.id] = s; });

    const gradesByStudent: Record<string, Record<string, number>> = {};
    (allGrades || []).forEach((g: any) => {
      if (!gradesByStudent[g.student_id]) gradesByStudent[g.student_id] = {};
      gradesByStudent[g.student_id][g.subject_id] = g.score;
    });

    (groups || []).forEach((g: any) => {
      const grpStudents = studentsByGroup[g.id] || [];
      if (grpStudents.length === 0) return;

      let totalAvg = 0;
      let avgCount = 0;
      let atRiskCount = 0;
      const subjectFailCounts: Record<string, number> = {};

      grpStudents.forEach((s: any) => {
        const sGrades = gradesByStudent[s.id] || {};
        let sum = 0;
        let cnt = 0;

        Object.entries(sGrades).forEach(([subId, score]) => {
          if (countingSubjects.has(subId)) {
            sum += score;
            cnt++;
            if (score < 6) {
              subjectFailCounts[subId] = (subjectFailCounts[subId] || 0) + 1;
            }
          }
        });

        if (cnt > 0) {
          const avg = sum / cnt;
          totalAvg += avg;
          avgCount++;
          if (avg < 6) atRiskCount++;
        }
      });

      const failingSubjects = Object.entries(subjectFailCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([subId, count]) => ({
          name: subjectMap[subId]?.short_name || subjectMap[subId]?.name || "?",
          count,
        }));

      performanceByGroup.push({
        groupId: g.id,
        grade: g.grade,
        letter: g.letter,
        label: `${g.grade}°${g.letter}`,
        studentCount: grpStudents.length,
        avgScore: avgCount > 0 ? Math.round((totalAvg / avgCount) * 10) / 10 : null,
        atRiskCount,
        failingSubjects,
      });
    });
  }

  // ══════════════════════════════════════════════
  // 3) PERIODS TIMELINE
  // ══════════════════════════════════════════════
  const periodsTimeline = allPeriods.map((p: any) => ({
    period_number: p.period_number,
    name: p.name,
    is_open: p.is_open,
    effectively_open: p.effectively_open,
    open_date: p.open_date,
    close_date: p.close_date,
  }));

  return NextResponse.json({
    activePeriod: activePeriod
      ? { period_number: activePeriod.period_number, name: activePeriod.name }
      : null,
    captureAlerts,
    performanceByGroup,
    periodsTimeline,
  });
}
