import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import ConcentradoTable from "@/components/ConcentradoTable";

type Props = {
  params: { groupId: string };
};

export default async function ConcentradoPage({ params }: Props) {
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

  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", params.groupId)
    .single();

  if (!group) redirect("/dashboard");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order")
    .eq("grade", group.grade)
    .order("sort_order");

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num, curp")
    .eq("group_id", params.groupId)
    .eq("is_active", true)
    .order("list_num");

  const studentIds = (students || []).map((s) => s.id);
  const { data: allGrades } = await supabase
    .from("grades")
    .select("student_id, subject_id, period, score, absences")
    .in("student_id", studentIds);

  // Build grade map for client component
  const gradeMap: Record<
    string,
    Record<string, Record<number, { score: number | null; absences: number }>>
  > = {};
  (allGrades || []).forEach((g) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id])
      gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = {
      score: g.score,
      absences: g.absences,
    };
  });

  const safeSubjects = (subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    short_name: s.short_name,
    counts_for_avg: s.counts_for_avg,
  }));

  const safeStudents = (students || []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    list_num: s.list_num,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Concentrado — {group.grade}° {group.letter}
            </h1>
            <p className="text-sm text-gray-500">
              Promedios por materia — Ciclo 2026-2027
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Volver
          </Link>
        </div>

        <ConcentradoTable
          subjects={safeSubjects}
          students={safeStudents}
          gradeMap={gradeMap}
        />
      </main>
    </div>
  );
}
