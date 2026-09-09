import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function DashboardPage() {
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

  // ──── TEACHER DATA ────
  let teacherAssignments: any[] = [];
  let teacherGroupIds: string[] = [];
  const teacherStudentCounts: Record<string, number> = {};

  if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_assignments")
      .select("id, subjects ( id, name, short_name ), groups ( id, grade, letter )")
      .eq("teacher_id", user.id);
    teacherAssignments = data || [];

    // Unique group IDs
    teacherGroupIds = Array.from(
      new Set(teacherAssignments.map((a: any) => a.groups.id))
    );

    // Student counts per group
    if (teacherGroupIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id, group_id")
        .in("group_id", teacherGroupIds)
        .eq("is_active", true);
      (students || []).forEach((s: any) => {
        teacherStudentCounts[s.group_id] =
          (teacherStudentCounts[s.group_id] || 0) + 1;
      });
    }
  }

  // Group assignments by group for teacher view
  const teacherByGroup: Record<
    string,
    { group: any; subjects: any[] }
  > = {};
  teacherAssignments.forEach((a: any) => {
    const gId = a.groups.id;
    if (!teacherByGroup[gId]) {
      teacherByGroup[gId] = { group: a.groups, subjects: [] };
    }
    teacherByGroup[gId].subjects.push(a.subjects);
  });

  // ──── ADMIN / VIEWER DATA ────
  let groups: any[] = [];
  let totalStudents = 0;
  let totalTeachers = 0;
  const groupStudentCounts: Record<string, number> = {};

  if (profile.role === "admin" || profile.role === "viewer") {
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter, school_years ( name )")
      .order("grade")
      .order("letter");
    groups = data || [];

    const { data: students } = await supabase
      .from("students")
      .select("id, group_id")
      .eq("is_active", true);

    totalStudents = students?.length || 0;
    (students || []).forEach((s: any) => {
      groupStudentCounts[s.group_id] =
        (groupStudentCounts[s.group_id] || 0) + 1;
    });

    const { data: teachers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "teacher");
    totalTeachers = teachers?.length || 0;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">
          Bienvenido, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Mnemósine — Ciclo escolar 2026-2027
        </p>

        {/* ════════════ TEACHER DASHBOARD ════════════ */}
        {profile.role === "teacher" && (
          <div className="space-y-6">
            {/* Stats rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📚</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {teacherAssignments.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Asignaturas</p>
                <p className="text-xs text-gray-400">asignadas</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🏫</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {teacherGroupIds.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Grupos</p>
                <p className="text-xs text-gray-400">a mi cargo</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">👥</span>
                  <span className="text-2xl font-bold text-accent-600">
                    {Object.values(teacherStudentCounts).reduce(
                      (a, b) => a + b,
                      0
                    )}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Alumnos</p>
                <p className="text-xs text-gray-400">en mis grupos</p>
              </div>
            </div>

            {/* Mis grupos con materias */}
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Mis grupos
            </h2>
            {Object.keys(teacherByGroup).length === 0 ? (
              <div className="card p-8 text-center text-gray-500 text-sm">
                No tienes asignaturas asignadas. Contacta al administrador.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(teacherByGroup)
                  .sort(
                    ([, a], [, b]) =>
                      a.group.grade - b.group.grade ||
                      a.group.letter.localeCompare(b.group.letter)
                  )
                  .map(([gId, { group, subjects }]) => {
                    const studentCount = teacherStudentCounts[gId] || 0;
                    return (
                      <div
                        key={gId}
                        className="card overflow-hidden"
                      >
                        {/* Header del grupo */}
                        <div className="bg-primary-600 px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-white">
                              {group.grade}° {group.letter}
                            </p>
                            <p className="text-xs text-primary-200">
                              {studentCount} alumno{studentCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-3xl font-bold text-white/20">
                            {group.grade}°{group.letter}
                          </span>
                        </div>

                        {/* Materias */}
                        <div className="px-4 py-3 space-y-1.5">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Materias asignadas
                          </p>
                          {subjects.map((s: any) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">{s.name}</span>
                              <span className="text-xs text-gray-400 font-mono">
                                {s.short_name}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Botones de acción */}
                        <div className="px-4 pb-4 pt-2 flex gap-2">
                          <Link
                            href={`/captura/${gId}/${subjects[0]?.id || ""}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Calificar
                          </Link>
                          <Link
                            href={`/concentrado/${gId}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-primary-600 text-xs font-medium rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Concentrado
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ════════════ ADMIN / VIEWER DASHBOARD ════════════ */}
        {(profile.role === "admin" || profile.role === "viewer") && (
          <div className="space-y-6">
            {profile.role === "admin" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/admin/alumnos"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👥</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {totalStudents}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Alumnos
                  </p>
                  <p className="text-xs text-gray-400">activos</p>
                </Link>
                <Link
                  href="/admin/profesores"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👨‍🏫</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {totalTeachers}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Profesores
                  </p>
                  <p className="text-xs text-gray-400">registrados</p>
                </Link>
                <Link
                  href="/admin/ciclo"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">📅</span>
                    <span className="text-2xl font-bold text-accent-600">
                      {groups.length}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Grupos
                  </p>
                  <p className="text-xs text-gray-400">ciclo actual</p>
                </Link>
                <Link
                  href="/captura"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">✏️</span>
                    <span className="text-lg font-bold text-accent-600">→</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Captura
                  </p>
                  <p className="text-xs text-gray-400">ir a calificar</p>
                </Link>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Concentrado por grupo
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {groups.map((g: any) => {
                  const count = groupStudentCounts[g.id] || 0;
                  return (
                    <Link
                      key={g.id}
                      href={`/concentrado/${g.id}`}
                      className="card p-3 text-center hover:border-primary-300 hover:shadow-md transition-all group"
                    >
                      <p className="text-lg font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
                        {g.grade}° {g.letter}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {count} alumno{count !== 1 ? "s" : ""}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
