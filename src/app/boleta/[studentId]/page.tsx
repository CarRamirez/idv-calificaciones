import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import BoletaView from "@/components/BoletaView";
import Link from "next/link";

type Props = {
  params: { studentId: string };
};

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept",
  2: "Oct",
  3: "Nov-Dic",
  4: "Ene-Feb",
  5: "Mar-Abr",
  6: "Mayo",
  7: "Junio",
  8: "Julio",
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
  if (profile.role === "viewer") redirect("/dashboard");

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
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
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
