"use client";

import { useEffect, useState, useCallback } from "react";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

type Student = {
  id: string;
  full_name: string;
  list_num: number;
};

type GradeData = {
  [studentId: string]: {
    [period: number]: { score: number | null; absences: number };
  };
};

type Props = {
  params: { groupId: string; subjectId: string };
};

export default function CapturaPage({ params }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const { groupId, subjectId } = params;

  const [profile, setProfile] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [subject, setSubject] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeData>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [profileRes, groupRes, subjectRes, studentsRes, gradesRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("groups").select("*").eq("id", groupId).single(),
          supabase.from("subjects").select("*").eq("id", subjectId).single(),
          supabase
            .from("students")
            .select("id, full_name, list_num")
            .eq("group_id", groupId)
            .eq("is_active", true)
            .order("list_num"),
          supabase
            .from("grades")
            .select("*")
            .eq("subject_id", subjectId)
            .in(
              "student_id",
              (
                await supabase
                  .from("students")
                  .select("id")
                  .eq("group_id", groupId)
              ).data?.map((s) => s.id) || []
            ),
        ]);

      setProfile(profileRes.data);
      setGroup(groupRes.data);
      setSubject(subjectRes.data);
      setStudents(studentsRes.data || []);

      const gradeMap: GradeData = {};
      (studentsRes.data || []).forEach((s) => {
        gradeMap[s.id] = {
          1: { score: null, absences: 0 },
          2: { score: null, absences: 0 },
          3: { score: null, absences: 0 },
        };
      });
      (gradesRes.data || []).forEach((g: any) => {
        if (gradeMap[g.student_id]) {
          gradeMap[g.student_id][g.period] = {
            score: g.score,
            absences: g.absences,
          };
        }
      });
      setGrades(gradeMap);
      setLoading(false);
    }

    loadData();
  }, [groupId, subjectId, supabase, router]);

  const saveGrade = useCallback(
    async (studentId: string, period: number, score: number | null, absences: number) => {
      const key = `${studentId}-${period}`;
      setSaving(key);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("grades").upsert(
        {
          student_id: studentId,
          subject_id: subjectId,
          period,
          score,
          absences,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,subject_id,period" }
      );

      if (error) {
        console.error("Error al guardar:", error);
      }

      setTimeout(() => setSaving(null), 600);
    },
    [supabase, subjectId]
  );

  function handleScoreChange(studentId: string, period: number, value: string) {
    const num = value === "" ? null : parseFloat(value);
    if (num !== null && (num < 5 || num > 10)) return;

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: { ...prev[studentId][period], score: num },
      },
    }));
  }

  function handleAbsencesChange(studentId: string, period: number, value: string) {
    const num = value === "" ? 0 : parseInt(value);
    if (isNaN(num) || num < 0) return;

    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: { ...prev[studentId][period], absences: num },
      },
    }));
  }

  function handleBlur(studentId: string, period: number) {
    const data = grades[studentId]?.[period];
    if (data) {
      saveGrade(studentId, period, data.score, data.absences);
    }
  }

  function getAverage(studentId: string): string {
    const data = grades[studentId];
    if (!data) return "—";
    const scores = [1, 2, 3]
      .map((p) => data[p]?.score)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return "—";
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  }

  function getSemaforoClass(score: number | null): string {
    if (score === null) return "";
    if (score < 7) return "semaforo-rojo";
    if (score < 8) return "semaforo-amarillo";
    return "semaforo-verde";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {subject?.name}
            </h1>
            <p className="text-sm text-gray-500">
              {group?.grade}° {group?.letter} — Ciclo 2026-2027
            </p>
          </div>
          <button onClick={() => router.back()} className="btn-secondary text-sm">
            ← Volver
          </button>
        </div>

        <div className="flex gap-4 mb-4 text-xs">
          <span className="px-2 py-1 rounded semaforo-rojo">Requiere Apoyo (5-6.9)</span>
          <span className="px-2 py-1 rounded semaforo-amarillo">En Desarrollo (7-7.9)</span>
          <span className="px-2 py-1 rounded semaforo-verde">Nivel Esperado (8-10)</span>
        </div>

        <div className="card overflow-x-auto">
          <table className="grade-table">
            <thead>
              <tr>
                <th className="w-12">N°</th>
                <th className="min-w-[200px]">Nombre del Alumno</th>
                <th className="w-20 text-center">1er Per.</th>
                <th className="w-16 text-center">IA</th>
                <th className="w-20 text-center">2do Per.</th>
                <th className="w-16 text-center">IA</th>
                <th className="w-20 text-center">3er Per.</th>
                <th className="w-16 text-center">IA</th>
                <th className="w-20 text-center">Prom.</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const avg = getAverage(student.id);
                const avgNum = avg === "—" ? null : parseFloat(avg);
                return (
                  <tr key={student.id}>
                    <td className="text-center text-gray-500 tabular-nums">
                      {student.list_num}
                    </td>
                    <td className="font-medium text-gray-900 text-xs">
                      {student.full_name}
                    </td>
                    {[1, 2, 3].map((period) => {
                      const data = grades[student.id]?.[period];
                      const isSaving = saving === `${student.id}-${period}`;
                      return (
                        <React.Fragment key={period}>
                          <td className={`text-center ${getSemaforoClass(data?.score ?? null)}`}>
                            <input
                              type="number"
                              min="5"
                              max="10"
                              step="0.1"
                              value={data?.score ?? ""}
                              onChange={(e) => handleScoreChange(student.id, period, e.target.value)}
                              onBlur={() => handleBlur(student.id, period)}
                              className={`grade-cell ${isSaving ? "bg-green-50" : "bg-transparent"}`}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="number"
                              min="0"
                              value={data?.absences ?? 0}
                              onChange={(e) => handleAbsencesChange(student.id, period, e.target.value)}
                              onBlur={() => handleBlur(student.id, period)}
                              className={`grade-cell ${isSaving ? "bg-green-50" : "bg-transparent"}`}
                            />
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`text-center font-semibold tabular-nums ${getSemaforoClass(avgNum)}`}>
                      {avg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Los cambios se guardan automáticamente al salir de cada celda.
        </p>
      </main>
    </div>
  );
}
