import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextResponse } from "next/server";

/**
 * GET /api/rendimiento/alumnos
 *
 * Returns per-student, per-period averages for the whole school.
 * Mirrors SIGEFCP's `cargarAprovechamiento` — the data needed for
 * "en riesgo", "promedio 10", and "primeros 3 lugares" lists.
 *
 * Response shape:
 * {
 *   filas: FilaAprov[],          // one row per student × period
 *   periodos: number[],          // available period numbers with grades
 *   periodLabels: Record<number, string>,
 *   trimesterPeriods: Record<number, number[]>,
 * }
 */

interface GradeRow {
  student_id: string;
  subject_id: string;
  period: number;
  score: number;
}

interface StudentRow {
  id: string;
  full_name: string;
  control_number: string | null;
  group_id: string;
}

interface GroupRow {
  id: string;
  grade: number;
  letter: string;
}

interface SubjectRow {
  id: string;
  short_name: string;
  name: string;
  counts_for_avg: boolean;
}

interface PeriodRow {
  period_number: number;
  name: string;
  trimester: number;
}

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
  const allowed = ["superadmin", "admin", "direccion", "profesor", "visor"];
  if (!allowed.includes(effectiveProfile.role))
    return NextResponse.json({ error: "No access" }, { status: 403 });

  // ── Fetch all required data in parallel ──
  const pageSize = 1000;
  async function fetchAll<T>(builder: () => any): Promise<T[]> {
    const all: T[] = [];
    let from = 0;
    for (;;) {
      const { data } = await builder().range(from, from + pageSize - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const [students, groups, subjects, grades, periods] = await Promise.all([
    fetchAll<StudentRow>(() =>
      supabase
        .from("students")
        .select("id, full_name, control_number, group_id")
        .eq("status", "activo")
        .order("id")
    ),
    supabase
      .from("groups")
      .select("id, grade, letter, school_years!inner(is_current)")
      .eq("school_years.is_current", true)
      .then((r) => (r.data || []) as GroupRow[]),
    supabase
      .from("subjects")
      .select("id, short_name, name, counts_for_avg")
      .then((r) => (r.data || []) as SubjectRow[]),
    fetchAll<GradeRow>(() =>
      supabase
        .from("grades")
        .select("student_id, subject_id, period, score")
        .order("student_id")
    ),
    supabase
      .from("evaluation_periods")
      .select("period_number, name, trimester, school_years!inner(is_current)")
      .eq("school_years.is_current", true)
      .order("period_number")
      .then((r) => (r.data || []) as PeriodRow[]),
  ]);

  // ── Build lookups ──
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const countableSubjects = new Set(
    subjects.filter((s) => s.counts_for_avg).map((s) => s.id)
  );

  // period → trimester mapping
  const periodTrimester: Record<number, number> = {};
  const trimesterPeriods: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  const periodLabels: Record<number, string> = {};
  for (const p of periods) {
    periodTrimester[p.period_number] = p.trimester;
    periodLabels[p.period_number] = p.name;
    if (p.trimester >= 1 && p.trimester <= 3) {
      trimesterPeriods[p.trimester].push(p.period_number);
    }
  }

  // ── Group grades by student × period ──
  // gradeMap: student_id → period → { sum, count, reprobadas, materiasReprobadas[] }
  type Accum = {
    sum: number;
    count: number;
    reprobadas: number;
    materiasReprobadas: string[];
  };
  const gradeMap = new Map<string, Map<number, Accum>>();

  for (const g of grades) {
    if (!countableSubjects.has(g.subject_id)) continue;
    if (!gradeMap.has(g.student_id)) gradeMap.set(g.student_id, new Map());
    const pm = gradeMap.get(g.student_id)!;
    if (!pm.has(g.period)) pm.set(g.period, { sum: 0, count: 0, reprobadas: 0, materiasReprobadas: [] });
    const acc = pm.get(g.period)!;
    acc.sum += Number(g.score);
    acc.count += 1;
    if (Number(g.score) < 6) {
      acc.reprobadas += 1;
      const sub = subjectMap.get(g.subject_id);
      if (sub) acc.materiasReprobadas.push(sub.short_name);
    }
  }

  // ── Build output rows ──
  interface FilaAprov {
    studentId: string;
    nombre: string;
    numeroControl: string | null;
    grupoId: string;
    grado: number;
    letra: string;
    periodo: number; // 0 = general, 1-8 = period
    promedio: number;
    materias: number;
    reprobadas: number;
    materiasReprobadas: string | null;
  }

  const filas: FilaAprov[] = [];
  const activePeriods = new Set<number>();

  for (const student of students) {
    const group = groupMap.get(student.group_id);
    if (!group) continue;
    const pm = gradeMap.get(student.id);
    if (!pm) continue;

    // Per-period rows
    for (const [period, acc] of Array.from(pm)) {
      if (acc.count === 0) continue;
      activePeriods.add(period);
      filas.push({
        studentId: student.id,
        nombre: student.full_name,
        numeroControl: student.control_number,
        grupoId: group.id,
        grado: group.grade,
        letra: group.letter,
        periodo: period,
        promedio: Math.round((acc.sum / acc.count) * 10) / 10,
        materias: acc.count,
        reprobadas: acc.reprobadas,
        materiasReprobadas: acc.materiasReprobadas.length > 0 ? acc.materiasReprobadas.join(", ") : null,
      });
    }

    // Per-trimester rows (avg of period averages within trimester)
    for (const tri of [1, 2, 3]) {
      const triPeriods = trimesterPeriods[tri] || [];
      const avgs: number[] = [];
      let totalRep = 0;
      const repMats: string[] = [];
      let totalMats = 0;
      for (const p of triPeriods) {
        const acc = pm.get(p);
        if (acc && acc.count > 0) {
          avgs.push(acc.sum / acc.count);
          totalRep += acc.reprobadas;
          repMats.push(...acc.materiasReprobadas);
          totalMats += acc.count;
        }
      }
      if (avgs.length > 0) {
        const triAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
        filas.push({
          studentId: student.id,
          nombre: student.full_name,
          numeroControl: student.control_number,
          grupoId: group.id,
          grado: group.grade,
          letra: group.letter,
          periodo: -(tri), // negative = trimester (-1, -2, -3)
          promedio: Math.round(triAvg * 10) / 10,
          materias: totalMats,
          reprobadas: totalRep,
          materiasReprobadas: repMats.length > 0 ? [...Array.from(new Set(repMats))].join(", ") : null,
        });
      }
    }

    // General (periodo = 0): avg of all period averages
    const allAvgs: number[] = [];
    let allRep = 0;
    const allRepMats: string[] = [];
    let allMats = 0;
    for (const [, acc] of Array.from(pm)) {
      if (acc.count === 0) continue;
      allAvgs.push(acc.sum / acc.count);
      allRep += acc.reprobadas;
      allRepMats.push(...acc.materiasReprobadas);
      allMats += acc.count;
    }
    if (allAvgs.length > 0) {
      const genAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
      filas.push({
        studentId: student.id,
        nombre: student.full_name,
        numeroControl: student.control_number,
        grupoId: group.id,
        grado: group.grade,
        letra: group.letter,
        periodo: 0,
        promedio: Math.round(genAvg * 10) / 10,
        materias: allMats,
        reprobadas: allRep,
        materiasReprobadas: allRepMats.length > 0 ? [...Array.from(new Set(allRepMats))].join(", ") : null,
      });
    }
  }

  return NextResponse.json({
    filas,
    periodos: Array.from(activePeriods).sort((a, b) => a - b),
    periodLabels,
    trimesterPeriods,
  });
}
