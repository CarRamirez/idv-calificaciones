import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import AnnouncementWall from "@/components/AnnouncementWall";

/* ── SVG Icon helpers ── */
function IconUsers({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconTeacher({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  );
}

function IconGroups({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
    </svg>
  );
}

function IconPencil({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function IconBook({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function IconMail({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function IconSubjects({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function IconCalendar({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function IconDocument({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

/* ── Grade color config ── */
const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; header: string; badge: string }> = {
  1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", header: "bg-blue-600", badge: "bg-blue-100 text-blue-700" },
  2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", header: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  3: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", header: "bg-purple-600", badge: "bg-purple-100 text-purple-700" },
};

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

    teacherGroupIds = Array.from(
      new Set(teacherAssignments.map((a: any) => a.groups.id))
    );

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
  const teacherByGroup: Record<string, { group: any; subjects: any[] }> = {};
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
  let totalSubjects = 0;
  const groupStudentCounts: Record<string, number> = {};

  // ──── SHARED DATA (periods, progress) ────
  let activePeriod: { period_number: number; name: string } | null = null;
  let captureProgress = { entered: 0, total: 0 };
  let recentActivity: { teacher: string; group: string; subject: string; count: number; updated_at: string }[] = [];

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

    // Subject count
    const { data: subjectRows } = await supabase
      .from("subjects")
      .select("id");
    totalSubjects = subjectRows?.length || 0;

    // Active period
    const { data: periods } = await supabase
      .from("evaluation_periods")
      .select("period_number, name, is_open")
      .eq("is_open", true)
      .limit(1);
    if (periods && periods.length > 0) {
      activePeriod = { period_number: periods[0].period_number, name: periods[0].name };
    }

    // Capture progress: count grades entered vs total possible
    // Total possible = active students × subjects that count for avg (per grade) × open period
    if (activePeriod && students && students.length > 0) {
      // Get subjects per grade that count for avg
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, grade, counts_for_avg");

      const subjectsByGrade: Record<number, number> = {};
      (subjects || []).forEach((s: any) => {
        if (s.counts_for_avg) {
          subjectsByGrade[s.grade] = (subjectsByGrade[s.grade] || 0) + 1;
        }
      });

      // Students per grade (from groups)
      const studentsByGrade: Record<number, number> = {};
      (students || []).forEach((s: any) => {
        const grp = groups.find((g: any) => g.id === s.group_id);
        if (grp) {
          studentsByGrade[grp.grade] = (studentsByGrade[grp.grade] || 0) + 1;
        }
      });

      // Total expected
      let totalExpected = 0;
      [1, 2, 3].forEach((grade) => {
        totalExpected += (studentsByGrade[grade] || 0) * (subjectsByGrade[grade] || 0);
      });

      // Grades entered for active period
      const { count: gradesEntered } = await supabase
        .from("grades")
        .select("id", { count: "exact", head: true })
        .eq("period", activePeriod.period_number)
        .not("score", "is", null);

      captureProgress = { entered: gradesEntered || 0, total: totalExpected };
    }

    // Recent activity: last 5 grade updates
    const { data: recentGrades } = await supabase
      .from("grades")
      .select("updated_at, updated_by, subject_id, student_id, students!inner(group_id, groups!inner(grade, letter)), subjects!inner(short_name), profiles:updated_by(full_name)")
      .not("score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (recentGrades && recentGrades.length > 0) {
      // Group by teacher + group + subject combo for a compact log
      const activityMap = new Map<string, { teacher: string; group: string; subject: string; count: number; updated_at: string }>();
      for (const g of recentGrades as any[]) {
        const teacherName = g.profiles?.full_name || "Desconocido";
        const groupLabel = `${g.students?.groups?.grade}°${g.students?.groups?.letter}`;
        const subjectName = g.subjects?.short_name || "?";
        const key = `${g.updated_by}-${g.student_id ? g.students?.group_id : ""}-${g.subject_id}`;
        if (!activityMap.has(key)) {
          activityMap.set(key, {
            teacher: teacherName.split(" ")[0],
            group: groupLabel,
            subject: subjectName,
            count: 1,
            updated_at: g.updated_at,
          });
        } else {
          activityMap.get(key)!.count++;
        }
      }
      recentActivity = Array.from(activityMap.values()).slice(0, 5);
    }
  }

  // Time ago helper
  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }

  const progressPct = captureProgress.total > 0
    ? Math.round((captureProgress.entered / captureProgress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header con periodo activo */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Bienvenido, {profile.full_name.split(" ")[0]}
            </h1>
            <p className="text-sm text-gray-500">
              Mnemósine — Ciclo escolar 2026-2027
            </p>
          </div>
          {activePeriod && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {activePeriod.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ═══ Columna principal ═══ */}
        <div>

        {/* ════════════ TEACHER DASHBOARD ════════════ */}
        {profile.role === "teacher" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <IconBook className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-2xl font-bold text-primary-600">
                    {teacherAssignments.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Asignaturas</p>
                <p className="text-xs text-gray-400">asignadas</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <IconGroups className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-2xl font-bold text-primary-600">
                    {teacherGroupIds.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Grupos</p>
                <p className="text-xs text-gray-400">a mi cargo</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <IconUsers className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-2xl font-bold text-accent-600">
                    {Object.values(teacherStudentCounts).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">Alumnos</p>
                <p className="text-xs text-gray-400">en mis grupos</p>
              </div>
            </div>

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
                    const colors = GRADE_COLORS[group.grade as number] || GRADE_COLORS[1];
                    return (
                      <div key={gId} className={`card overflow-hidden border ${colors.border}`}>
                        <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
                          <div>
                            <p className="text-lg font-bold text-white">
                              {group.grade}° {group.letter}
                            </p>
                            <p className="text-xs text-white/70">
                              {studentCount} alumno{studentCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-3xl font-bold text-white/20">
                            {group.grade}°{group.letter}
                          </span>
                        </div>

                        <div className="px-4 py-3 space-y-1.5">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Materias asignadas
                          </p>
                          {subjects.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{s.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{s.short_name}</span>
                            </div>
                          ))}
                        </div>

                        <div className="px-4 pb-4 pt-2 flex gap-2">
                          <Link
                            href={`/captura/${gId}/${subjects[0]?.id || ""}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <IconPencil className="w-3.5 h-3.5" />
                            Calificar
                          </Link>
                          <Link
                            href={`/concentrado/${gId}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-primary-600 text-xs font-medium rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                          >
                            <IconDocument className="w-3.5 h-3.5" />
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
            {/* ── Stat Cards ── */}
            {profile.role === "admin" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Link
                  href="/admin/alumnos"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <IconUsers className="w-5 h-5 text-blue-600" />
                    </div>
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
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <IconTeacher className="w-5 h-5 text-emerald-600" />
                    </div>
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
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                      <IconGroups className="w-5 h-5 text-amber-600" />
                    </div>
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
                  href="/admin/materias"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <IconSubjects className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-2xl font-bold text-indigo-600">
                      {totalSubjects}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Materias
                  </p>
                  <p className="text-xs text-gray-400">registradas</p>
                </Link>
                <Link
                  href="/captura"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                      <IconPencil className="w-5 h-5 text-rose-600" />
                    </div>
                    <span className="text-lg font-bold text-rose-600">→</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Captura
                  </p>
                  <p className="text-xs text-gray-400">ir a calificar</p>
                </Link>
                <Link
                  href="/tareas"
                  className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                      <IconMail className="w-5 h-5 text-violet-600" />
                    </div>
                    <span className="text-lg font-bold text-violet-600">→</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                    Tareas
                  </p>
                  <p className="text-xs text-gray-400">notificar padres</p>
                </Link>
              </div>
            )}

            {/* ── Progress bar ── */}
            {activePeriod && captureProgress.total > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <IconCalendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Progreso de captura — {activePeriod.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{progressPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      progressPct >= 80
                        ? "bg-green-500"
                        : progressPct >= 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {captureProgress.entered.toLocaleString()} de {captureProgress.total.toLocaleString()} calificaciones registradas
                </p>
              </div>
            )}

            {/* ── Group cards ── */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Concentrado por grupo
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {groups.map((g: any) => {
                  const count = groupStudentCounts[g.id] || 0;
                  const colors = GRADE_COLORS[g.grade as number] || GRADE_COLORS[1];
                  return (
                    <div
                      key={g.id}
                      className={`card overflow-hidden border ${colors.border} hover:shadow-md transition-all group`}
                    >
                      <div className={`${colors.header} px-3 py-2`}>
                        <p className="text-lg font-bold text-white text-center">
                          {g.grade}° {g.letter}
                        </p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-xs text-gray-500 mb-2">
                          {count} alumno{count !== 1 ? "s" : ""}
                        </p>
                        <div className="flex gap-1.5">
                          <Link
                            href={`/concentrado/${g.id}`}
                            className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md text-center ${colors.badge} hover:opacity-80 transition-opacity`}
                          >
                            Concentrado
                          </Link>
                          <Link
                            href={`/boleta/${g.id}`}
                            className="flex-1 text-xs font-medium px-2 py-1.5 rounded-md text-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Boleta
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Recent activity ── */}
            {recentActivity.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Actividad reciente
                </h3>
                <div className="space-y-2">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold">
                          {a.teacher.charAt(0)}
                        </span>
                        <span className="text-gray-700">
                          <span className="font-medium">{a.teacher}</span>
                          {" capturó "}
                          <span className="font-medium">{a.group}</span>
                          {" "}
                          <span className="text-gray-500">{a.subject}</span>
                          {a.count > 1 && (
                            <span className="text-gray-400"> ({a.count} cal.)</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {timeAgo(a.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* ═══ Muro de avisos (columna derecha) ═══ */}
        <div className="hidden lg:block">
          <AnnouncementWall />
        </div>

        {/* Muro móvil */}
        <div className="lg:hidden">
          <AnnouncementWall />
        </div>
        </div>
      </main>
    </div>
  );
}
