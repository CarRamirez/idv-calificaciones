import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import ConcentradoFiltered from "@/components/ConcentradoFiltered";
import { fetchAllGrades } from "@/lib/fetch-all-grades";

export default async function ConcentradosPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);

  // Get all groups
  const { data: groups } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .order("grade")
    .order("letter");

  // Get all subjects by grade
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order, grade")
    .order("sort_order");

  // Get all active students with group_id
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num, group_id")
    .eq("status", "activo")
    .order("list_num");

  // Get ALL grades for all students (paginated to avoid Supabase 1000-row limit)
  const studentIds = (students || []).map((s) => s.id);
  const allGrades = studentIds.length > 0
    ? await fetchAllGrades(supabase, studentIds)
    : [];

  // Build grade map: { studentId: { subjectId: { period: { score, absences } } } }
  const gradeMap: Record<string, Record<string, Record<number, { score: number | null; absences: number; comment?: string }>>> = {};
  allGrades.forEach((g) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id]) gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = { score: g.score, absences: g.absences, comment: g.comment || undefined };
  });

  const safeGroups = (groups || []).map((g) => ({ id: g.id, grade: g.grade, letter: g.letter }));
  const safeSubjects = (subjects || []).map((s) => ({
    id: s.id, name: s.name, short_name: s.short_name,
    counts_for_avg: s.counts_for_avg, sort_order: s.sort_order, grade: s.grade,
  }));
  const safeStudents = (students || []).map((s) => ({
    id: s.id, full_name: s.full_name, list_num: s.list_num, group_id: s.group_id,
  }));

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />
      <main className="max-w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Concentrados
            </h1>
            <p className="text-sm text-gray-500">Filtra por grupo, materia y periodo</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
        </div>

        <ConcentradoFiltered
          groups={safeGroups}
          allSubjects={safeSubjects}
          allStudents={safeStudents}
          gradeMap={gradeMap}
        />
      </main>
    </div>
  );
}
