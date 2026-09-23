import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import BoletaAllGroup from "@/components/BoletaAllGroup";
import Link from "next/link";

type Props = { params: { groupId: string } };

export default async function BoletaGroupPage({ params }: Props) {
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
  if (effectiveProfile.role === "viewer") redirect("/dashboard");

  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", params.groupId)
    .single();
  if (!group) redirect("/boleta");

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num, curp")
    .eq("group_id", params.groupId)
    .eq("is_active", true)
    .order("list_num");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order")
    .eq("grade", group.grade)
    .order("sort_order");

  const studentIds = (students || []).map((s) => s.id);
  const { data: grades } = await supabase
    .from("grades")
    .select("student_id, subject_id, period, score, absences")
    .in("student_id", studentIds);

  const gradeMaps: Record<string, Record<string, Record<number, { score: number | null; absences: number }>>> = {};
  (students || []).forEach((s) => { gradeMaps[s.id] = {}; });
  (grades || []).forEach((g) => {
    if (!gradeMaps[g.student_id]) return;
    if (!gradeMaps[g.student_id][g.subject_id]) gradeMaps[g.student_id][g.subject_id] = {};
    gradeMaps[g.student_id][g.subject_id][g.period] = { score: g.score, absences: g.absences };
  });

  const safeSubjects = (subjects || []).map((s) => ({
    id: s.id, name: s.name, short_name: s.short_name,
    counts_for_avg: s.counts_for_avg, sort_order: s.sort_order,
  }));

  const safeStudents = (students || []).map((s) => ({
    id: s.id, full_name: s.full_name, list_num: s.list_num,
  }));

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />
      <main className="page-content animate-fade-in">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Boletas — {group.grade}° &ldquo;{group.letter}&rdquo;
            </h1>
            <p className="text-sm text-gray-500">{safeStudents.length} alumnos</p>
          </div>
          <Link href="/boleta" className="btn-secondary text-sm">← Volver</Link>
        </div>

        <BoletaAllGroup
          students={safeStudents}
          group={{ grade: group.grade, letter: group.letter }}
          subjects={safeSubjects}
          gradeMaps={gradeMaps}
        />
      </main>
    </div>
  );
}
