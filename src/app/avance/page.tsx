import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import AvanceCliente from "./AvanceCliente";

export const dynamic = "force-dynamic";

/* ── Types ── */
type Period = {
  period_number: number;
  name: string;
  trimester: number;
  is_open: boolean;
};

type TeacherRow = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  capturadas: number;
  total: number;
  filas: {
    group_id: string;
    subject_id: string;
    group_label: string;
    subject_name: string;
    grade: number;
    alumnos: number;
    capturadas: number;
  }[];
};

export default async function AvancePage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);
  if (
    effectiveProfile.role === "viewer" ||
    effectiveProfile.role === "teacher"
  )
    redirect("/dashboard");

  const admin = createAdminClient();

  /* ── School year & periods ── */
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("id, name")
    .eq("is_current", true)
    .single();

  if (!schoolYear) {
    return (
      <Navbar
        userName={effectiveProfile.full_name}
        userRole={effectiveProfile.role}
      >
        <main className="page-content space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <svg
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Avance de captura
              </h1>
              <p className="text-sm text-slate-500">
                No hay ciclo escolar activo.
              </p>
            </div>
          </div>
        </main>
      </Navbar>
    );
  }

  /* ── Evaluation periods ── */
  const { data: evalPeriods } = await admin
    .from("evaluation_periods")
    .select(
      "id, period_number, name, trimester, is_open, open_date, close_date"
    )
    .eq("school_year_id", schoolYear.id)
    .order("period_number");

  const periods: (Period & { id: string })[] = (evalPeriods || []).map(
    (p: any) => ({
      id: p.id,
      period_number: p.period_number,
      name: p.name,
      trimester: p.trimester,
      is_open: p.is_open,
    })
  );

  /* ── Active period: chosen (?t=), or the open one, or the last ── */
  const abierto = periods.find((p) => p.is_open);
  const elegido =
    periods.find((p) => p.id === searchParams.t) ??
    abierto ??
    periods[periods.length - 1] ??
    null;

  const esAbierto = !!elegido && elegido.id === abierto?.id;

  if (!elegido) {
    return (
      <Navbar
        userName={effectiveProfile.full_name}
        userRole={effectiveProfile.role}
      >
        <main className="page-content space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <svg
                className="h-[22px] w-[22px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Avance de captura
              </h1>
              <p className="text-sm text-slate-500">
                Ciclo {schoolYear.name} · No hay periodos configurados.
              </p>
            </div>
          </div>
        </main>
      </Navbar>
    );
  }

  /* ── Load avance data ── */
  // Teachers
  const { data: teachers } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "teacher")
    .order("full_name");

  // Assignments
  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select(
      "teacher_id, group_id, subject_id, groups(id, grade, letter), subjects(id, name, short_name, counts_for_avg)"
    );

  // Active students
  const { data: students } = await admin
    .from("students")
    .select("id, group_id")
    .eq("status", "activo");

  const studentsByGroup: Record<string, string[]> = {};
  (students || []).forEach((s: any) => {
    if (!studentsByGroup[s.group_id]) studentsByGroup[s.group_id] = [];
    studentsByGroup[s.group_id].push(s.id);
  });

  // Grades for the chosen period
  const { data: gradesData } = await admin
    .from("grades")
    .select("student_id, subject_id")
    .eq("period", elegido.period_number)
    .not("score", "is", null);

  const capturedSet = new Set<string>();
  (gradesData || []).forEach((g: any) => {
    capturedSet.add(`${g.student_id}:${g.subject_id}`);
  });

  /* ── Build teacher progress ── */
  const teacherMap: Record<string, TeacherRow> = {};
  (teachers || []).forEach((t: any) => {
    teacherMap[t.id] = {
      teacher_id: t.id,
      full_name: t.full_name,
      email: t.email,
      capturadas: 0,
      total: 0,
      filas: [],
    };
  });

  // All groups for sinProfe detection
  const { data: allGroups } = await admin
    .from("groups")
    .select("id, grade, letter")
    .neq("letter", "Bajas")
    .order("grade")
    .order("letter");

  const { data: allSubjects } = await admin
    .from("subjects")
    .select("id, name, short_name, grade, counts_for_avg")
    .order("sort_order");

  const assignedSet = new Set<string>();

  (assignments || []).forEach((a: any) => {
    if (!a.groups || !a.subjects) return;
    if (!teacherMap[a.teacher_id]) return;

    assignedSet.add(`${a.group_id}-${a.subject_id}`);

    const groupStudents = studentsByGroup[a.group_id] || [];
    const groupLabel = `${a.groups.grade}°${a.groups.letter}`;

    let captured = 0;
    for (const sid of groupStudents) {
      if (capturedSet.has(`${sid}:${a.subject_id}`)) captured++;
    }

    teacherMap[a.teacher_id].filas.push({
      group_id: a.group_id,
      subject_id: a.subject_id,
      group_label: groupLabel,
      subject_name: a.subjects.short_name || a.subjects.name,
      grade: a.groups.grade,
      alumnos: groupStudents.length,
      capturadas: captured,
    });

    teacherMap[a.teacher_id].capturadas += captured;
    teacherMap[a.teacher_id].total += groupStudents.length;
  });

  // Build teacher list sorted by % ascending (least progress first)
  const docentes = Object.values(teacherMap)
    .filter((t) => t.filas.length > 0)
    .sort((a, b) => {
      const pctA = a.total ? a.capturadas / a.total : 0;
      const pctB = b.total ? b.capturadas / b.total : 0;
      return pctA - pctB || a.full_name.localeCompare(b.full_name, "es");
    });

  // Global stats
  const totalCapturadas = docentes.reduce((s, d) => s + d.capturadas, 0);
  const totalExpected = docentes.reduce((s, d) => s + d.total, 0);
  const pct = totalExpected
    ? Math.round((totalCapturadas / totalExpected) * 100)
    : 0;
  const pendientes = docentes.filter((d) => d.capturadas < d.total).length;

  // Sin profesor: groups×subjects that should have an assignment but don't
  const sinProfe: { group_label: string; subject_name: string; grade: number }[] = [];
  (allGroups || []).forEach((g: any) => {
    (allSubjects || [])
      .filter((s: any) => s.grade === g.grade && s.counts_for_avg !== false)
      .forEach((s: any) => {
        if (!assignedSet.has(`${g.id}-${s.id}`)) {
          sinProfe.push({
            group_label: `${g.grade}°${g.letter}`,
            subject_name: s.short_name || s.name,
            grade: g.grade,
          });
        }
      });
  });

  /* ── Period nav data ── */
  const periodsNav = periods.map((p) => ({
    id: p.id,
    name: p.name,
    is_open: p.is_open,
    active: p.id === elegido.id,
  }));

  return (
    <Navbar
      userName={effectiveProfile.full_name}
      userRole={effectiveProfile.role}
    >
      <main className="page-content space-y-6">
        <AvanceCliente
          ciclo={schoolYear.name}
          periodoNombre={elegido.name}
          esAbierto={esAbierto}
          pct={pct}
          totalCapturadas={totalCapturadas}
          totalExpected={totalExpected}
          pendientes={pendientes}
          docentes={docentes}
          sinProfe={sinProfe}
          periodsNav={periodsNav}
        />
      </main>
    </Navbar>
  );
}
