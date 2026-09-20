import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import BoletaView from "@/components/BoletaView";
import Link from "next/link";

type Props = {
  params: { studentId: string };
};

export default async function BoletaDetailPage({ params }: Props) {
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
  if (effectiveProfile.role === "viewer") redirect("/dashboard");

  // Datos del alumno
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, list_num, curp, group_id")
    .eq("id", params.studentId)
    .single();

  if (!student) redirect("/boleta");

  // Grupo del alumno
  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", student.group_id)
    .single();

  if (!group) redirect("/boleta");

  // ── Lista de alumnos del grupo (para nav anterior/siguiente) ──
  const { data: classmatesRaw } = await supabase
    .from("students")
    .select("id, full_name, list_num")
    .eq("group_id", student.group_id)
    .eq("is_active", true)
    .order("list_num");

  const classmates = classmatesRaw || [];
  const currentIndex = classmates.findIndex((s) => s.id === student.id);
  const prevStudent = currentIndex > 0 ? classmates[currentIndex - 1] : null;
  const nextStudent = currentIndex < classmates.length - 1 ? classmates[currentIndex + 1] : null;

  // ── Todos los grupos (para selector de grupo) ──
  let allGroups: { id: string; grade: number; letter: string }[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter")
      .order("grade")
      .order("letter");
    allGroups = data || [];
  } else if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_assignments")
      .select("groups ( id, grade, letter )")
      .eq("teacher_id", user.id);
    const seen = new Set<string>();
    (data || []).forEach((a: any) => {
      if (a.groups && !seen.has(a.groups.id)) {
        seen.add(a.groups.id);
        allGroups.push(a.groups);
      }
    });
    allGroups.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
  }

  // ── Primer alumno de cada grupo (para saltar de grupo) ──
  const groupFirstStudent: Record<string, string> = {};
  if (allGroups.length > 0) {
    const groupIds = allGroups.map((g) => g.id);
    const { data: firstStudents } = await supabase
      .from("students")
      .select("id, group_id, list_num")
      .in("group_id", groupIds)
      .eq("is_active", true)
      .order("list_num");
    (firstStudents || []).forEach((s) => {
      if (!groupFirstStudent[s.group_id]) {
        groupFirstStudent[s.group_id] = s.id;
      }
    });
  }

  // Materias del grado
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order")
    .eq("grade", group.grade)
    .order("sort_order");

  // Calificaciones del alumno
  const { data: grades } = await supabase
    .from("grades")
    .select("subject_id, period, score, absences")
    .eq("student_id", student.id);

  // Construir mapa: subject_id -> period -> { score, absences }
  const gradeMap: Record<string, Record<number, { score: number | null; absences: number }>> = {};
  (grades || []).forEach((g) => {
    if (!gradeMap[g.subject_id]) gradeMap[g.subject_id] = {};
    gradeMap[g.subject_id][g.period] = {
      score: g.score,
      absences: g.absences,
    };
  });

  const safeSubjects = (subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    short_name: s.short_name,
    counts_for_avg: s.counts_for_avg,
    sort_order: s.sort_order,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
                {group.grade}° {group.letter}
              </span>
              <span className="text-sm text-gray-500">N° Lista: {student.list_num}</span>
              {student.curp && (
                <span className="text-xs text-gray-400 font-mono">{student.curp}</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Ciclo Escolar 2026-2027</p>
          </div>
          <Link href="/boleta" className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
        </div>

        {/* ── Navegación entre alumnos y grupos ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
          {/* Anterior / Siguiente alumno */}
          <div className="flex items-center gap-2">
            {prevStudent ? (
              <Link
                href={`/boleta/${prevStudent.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={prevStudent.full_name}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Anterior</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Anterior</span>
              </span>
            )}

            <span className="text-xs text-gray-400 tabular-nums">
              {currentIndex + 1} / {classmates.length}
            </span>

            {nextStudent ? (
              <Link
                href={`/boleta/${nextStudent.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={nextStudent.full_name}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed">
                <span className="hidden sm:inline">Siguiente</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </div>

          {/* Selector de grupo */}
          {allGroups.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Grupo:</span>
              {allGroups.map((g) => {
                const isActive = g.id === group.id;
                const firstId = groupFirstStudent[g.id];
                if (!firstId) return null;
                return isActive ? (
                  <span
                    key={g.id}
                    className="px-2.5 py-1 text-xs font-bold rounded-md bg-primary-600 text-white"
                  >
                    {g.grade}°{g.letter}
                  </span>
                ) : (
                  <Link
                    key={g.id}
                    href={`/boleta/${firstId}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {g.grade}°{g.letter}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <BoletaView
          student={{ id: student.id, full_name: student.full_name, list_num: student.list_num }}
          group={{ grade: group.grade, letter: group.letter }}
          subjects={safeSubjects}
          gradeMap={gradeMap}
        />
      </main>
    </div>
  );
}
