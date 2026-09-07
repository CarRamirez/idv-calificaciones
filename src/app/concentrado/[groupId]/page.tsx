import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

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

  const gradeMap: Record<string, Record<string, Record<number, { score: number | null; absences: number }>>> = {};
  (allGrades || []).forEach((g) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id]) gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = {
      score: g.score,
      absences: g.absences,
    };
  });

  function getSubjectAvg(studentId: string, subjectId: string): number | null {
    const subGrades = gradeMap[studentId]?.[subjectId];
    if (!subGrades) return null;
    const scores = [1, 2, 3]
      .map((p) => subGrades[p]?.score)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  function getGeneralAvg(studentId: string): number | null {
    const avgs = (subjects || [])
      .filter((s) => s.counts_for_avg)
      .map((s) => getSubjectAvg(studentId, s.id))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function semaforoClass(score: number | null): string {
    if (score === null) return "";
    if (score < 7) return "bg-red-100 text-red-800";
    if (score < 8) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  }

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
              Equivalente a la hoja BASES del Excel
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Volver
          </Link>
        </div>

        <div className="flex gap-4 mb-4 text-xs">
          <span className="px-2 py-1 rounded bg-red-100 text-red-800">5-6.9</span>
          <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">7-7.9</span>
          <span className="px-2 py-1 rounded bg-green-100 text-green-800">8-10</span>
        </div>

        <div className="card overflow-x-auto">
          <table className="grade-table">
            <thead>
              <tr>
                <th rowSpan={2} className="w-10">N°</th>
                <th rowSpan={2} className="min-w-[180px]">Nombre</th>
                {(subjects || []).map((s) => (
                  <th key={s.id} colSpan={2} className="text-center text-xs">
                    {s.short_name}
                  </th>
                ))}
                <th rowSpan={2} className="w-16 text-center">Prom. Gral.</th>
              </tr>
              <tr>
                {(subjects || []).map((s) => (
                  <React.Fragment key={s.id}>
                    <th className="text-center text-xs w-14">Cal.</th>
                    <th className="text-center text-xs w-12">IA</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {(students || []).map((student) => {
                const genAvg = getGeneralAvg(student.id);
                return (
                  <tr key={student.id}>
                    <td className="text-center text-gray-500 tabular-nums text-xs">
                      {student.list_num}
                    </td>
                    <td className="text-xs font-medium text-gray-900">
                      {student.full_name}
                    </td>
                    {(subjects || []).map((s) => {
                      const avg = getSubjectAvg(student.id, s.id);
                      const totalAbs = [1, 2, 3]
                        .map((p) => gradeMap[student.id]?.[s.id]?.[p]?.absences ?? 0)
                        .reduce((a, b) => a + b, 0);
                      return (
                        <React.Fragment key={s.id}>
                          <td className={`text-center text-xs tabular-nums ${semaforoClass(avg)}`}>
                            {avg !== null ? avg.toFixed(1) : "—"}
                          </td>
                          <td className="text-center text-xs tabular-nums text-gray-500">
                            {totalAbs || "—"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`text-center text-xs font-bold tabular-nums ${semaforoClass(genAvg)}`}>
                      {genAvg !== null ? genAvg.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
