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

type GradeEntry = { score: number | null; absences: number };

type GradeData = {
  [studentId: string]: {
    [period: number]: GradeEntry;
  };
};

type Props = {
  params: { groupId: string; subjectId: string };
};

// Estructura de periodos corregida
// 1er Trim: Septiembre + Octubre
// 2do Trim: Nov-Dic + Ene-Feb
// 3er Trim: Mar-Abr + Mayo + Junio
// Julio (Final): referencia, NO promedia
const TRIMESTERS = [
  {
    id: 1,
    name: "1er Trimestre",
    periods: [
      { id: 1, name: "Septiembre", short: "SEPT" },
      { id: 2, name: "Octubre", short: "OCT" },
    ],
  },
  {
    id: 2,
    name: "2do Trimestre",
    periods: [
      { id: 3, name: "Nov - Dic", short: "NOV-DIC" },
      { id: 4, name: "Ene - Feb", short: "ENE-FEB" },
    ],
  },
  {
    id: 3,
    name: "3er Trimestre",
    periods: [
      { id: 5, name: "Mar - Abr", short: "MAR-ABR" },
      { id: 6, name: "Mayo", short: "MAYO" },
      { id: 7, name: "Junio", short: "JUNIO" },
    ],
  },
];

const JULIO_FINAL = { id: 8, name: "Julio (Final)", short: "JULIO" };

const ALL_PERIOD_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

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
  // Tabs: 1,2,3 = trimestres, 4 = julio final, 0 = resumen
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const [profileRes, groupRes, subjectRes, studentsRes] =
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
        ]);

      const studentIds = studentsRes.data?.map((s) => s.id) || [];

      const { data: gradesData } = await supabase
        .from("grades")
        .select("*")
        .eq("subject_id", subjectId)
        .in("student_id", studentIds);

      setProfile(profileRes.data);
      setGroup(groupRes.data);
      setSubject(subjectRes.data);
      setStudents(studentsRes.data || []);

      const gradeMap: GradeData = {};
      (studentsRes.data || []).forEach((s) => {
        gradeMap[s.id] = {};
        ALL_PERIOD_IDS.forEach((p) => {
          gradeMap[s.id][p] = { score: null, absences: 0 };
        });
      });
      (gradesData || []).forEach((g: any) => {
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
    async (
      studentId: string,
      period: number,
      score: number | null,
      absences: number
    ) => {
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

  function handleScoreChange(
    studentId: string,
    period: number,
    value: string
  ) {
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

  function handleAbsencesChange(
    studentId: string,
    period: number,
    value: string
  ) {
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

  function getTrimesterAvg(studentId: string, trimesterId: number): string {
    const trimester = TRIMESTERS.find((t) => t.id === trimesterId);
    if (!trimester) return "—";
    const data = grades[studentId];
    if (!data) return "—";
    const scores = trimester.periods
      .map((p) => data[p.id]?.score)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return "—";
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  }

  // Promedio final = promedio de los 3 trimestres (Julio NO cuenta)
  function getPromedioFinal(studentId: string): string {
    const trimAvgs = [1, 2, 3]
      .map((t) => {
        const avg = getTrimesterAvg(studentId, t);
        return avg === "—" ? null : parseFloat(avg);
      })
      .filter((a): a is number => a !== null);
    if (trimAvgs.length === 0) return "—";
    return (trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length).toFixed(1);
  }

  function getTrimesterAbsences(
    studentId: string,
    trimesterId: number
  ): number {
    const trimester = TRIMESTERS.find((t) => t.id === trimesterId);
    if (!trimester) return 0;
    const data = grades[studentId];
    if (!data) return 0;
    return trimester.periods.reduce(
      (sum, p) => sum + (data[p.id]?.absences ?? 0),
      0
    );
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

  const currentTrimester =
    activeTab >= 1 && activeTab <= 3
      ? TRIMESTERS.find((t) => t.id === activeTab)!
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {subject?.name}
            </h1>
            <p className="text-sm text-gray-500">
              {group?.grade}° {group?.letter} — Ciclo 2026-2027
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="btn-secondary text-sm"
          >
            ← Volver
          </button>
        </div>

        {/* Leyenda semáforo */}
        <div className="flex gap-4 mb-4 text-xs">
          <span className="px-2 py-1 rounded semaforo-rojo">
            Requiere Apoyo (5-6.9)
          </span>
          <span className="px-2 py-1 rounded semaforo-amarillo">
            En Desarrollo (7-7.9)
          </span>
          <span className="px-2 py-1 rounded semaforo-verde">
            Nivel Esperado (8-10)
          </span>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200">
          {TRIMESTERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === t.id
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => setActiveTab(4)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 4
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Julio (Final)
          </button>
          <button
            onClick={() => setActiveTab(0)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 0
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Resumen
          </button>
        </div>

        {/* ===== Tabla de captura por trimestre (tabs 1-3) ===== */}
        {currentTrimester && (
          <div className="card overflow-x-auto">
            <table className="grade-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="w-12">
                    N°
                  </th>
                  <th rowSpan={2} className="min-w-[200px]">
                    Nombre del Alumno
                  </th>
                  {currentTrimester.periods.map((p) => (
                    <th
                      key={p.id}
                      colSpan={2}
                      className="text-center border-l border-gray-200"
                    >
                      {p.short}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="w-16 text-center border-l border-gray-300 bg-gray-100"
                  >
                    PROM.
                  </th>
                  <th rowSpan={2} className="w-14 text-center bg-gray-100">
                    IA
                  </th>
                </tr>
                <tr>
                  {currentTrimester.periods.map((p) => (
                    <React.Fragment key={p.id}>
                      <th className="text-center text-xs w-16 border-l border-gray-200">
                        CALIF.
                      </th>
                      <th className="text-center text-xs w-14">ASIST.</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const trimAvg = getTrimesterAvg(student.id, activeTab);
                  const trimAvgNum =
                    trimAvg === "—" ? null : parseFloat(trimAvg);
                  const totalAbs = getTrimesterAbsences(
                    student.id,
                    activeTab
                  );
                  return (
                    <tr key={student.id}>
                      <td className="text-center text-gray-500 tabular-nums">
                        {student.list_num}
                      </td>
                      <td className="font-medium text-gray-900 text-xs">
                        {student.full_name}
                      </td>
                      {currentTrimester.periods.map((p) => {
                        const data = grades[student.id]?.[p.id];
                        const isSaving =
                          saving === `${student.id}-${p.id}`;
                        return (
                          <React.Fragment key={p.id}>
                            <td
                              className={`text-center border-l border-gray-100 ${getSemaforoClass(
                                data?.score ?? null
                              )}`}
                            >
                              <input
                                type="number"
                                min="5"
                                max="10"
                                step="0.1"
                                value={data?.score ?? ""}
                                onChange={(e) =>
                                  handleScoreChange(
                                    student.id,
                                    p.id,
                                    e.target.value
                                  )
                                }
                                onBlur={() => handleBlur(student.id, p.id)}
                                className={`grade-cell ${
                                  isSaving
                                    ? "bg-green-50"
                                    : "bg-transparent"
                                }`}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="number"
                                min="0"
                                value={data?.absences ?? 0}
                                onChange={(e) =>
                                  handleAbsencesChange(
                                    student.id,
                                    p.id,
                                    e.target.value
                                  )
                                }
                                onBlur={() => handleBlur(student.id, p.id)}
                                className={`grade-cell ${
                                  isSaving
                                    ? "bg-green-50"
                                    : "bg-transparent"
                                }`}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td
                        className={`text-center font-semibold tabular-nums border-l border-gray-200 ${getSemaforoClass(
                          trimAvgNum
                        )}`}
                      >
                        {trimAvg}
                      </td>
                      <td className="text-center tabular-nums text-gray-500 text-xs">
                        {totalAbs || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== Tab Julio (Final) - solo referencia ===== */}
        {activeTab === 4 && (
          <div className="card overflow-x-auto">
            <div className="mb-3 px-1">
              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                Julio (Final) es solo referencia — no se incluye en el promedio final.
              </span>
            </div>
            <table className="grade-table">
              <thead>
                <tr>
                  <th className="w-12">N°</th>
                  <th className="min-w-[200px]">Nombre del Alumno</th>
                  <th className="text-center w-20">CALIF.</th>
                  <th className="text-center w-16">ASIST.</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const data = grades[student.id]?.[JULIO_FINAL.id];
                  const isSaving =
                    saving === `${student.id}-${JULIO_FINAL.id}`;
                  return (
                    <tr key={student.id}>
                      <td className="text-center text-gray-500 tabular-nums">
                        {student.list_num}
                      </td>
                      <td className="font-medium text-gray-900 text-xs">
                        {student.full_name}
                      </td>
                      <td
                        className={`text-center ${getSemaforoClass(
                          data?.score ?? null
                        )}`}
                      >
                        <input
                          type="number"
                          min="5"
                          max="10"
                          step="0.1"
                          value={data?.score ?? ""}
                          onChange={(e) =>
                            handleScoreChange(
                              student.id,
                              JULIO_FINAL.id,
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleBlur(student.id, JULIO_FINAL.id)
                          }
                          className={`grade-cell ${
                            isSaving ? "bg-green-50" : "bg-transparent"
                          }`}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          value={data?.absences ?? 0}
                          onChange={(e) =>
                            handleAbsencesChange(
                              student.id,
                              JULIO_FINAL.id,
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleBlur(student.id, JULIO_FINAL.id)
                          }
                          className={`grade-cell ${
                            isSaving ? "bg-green-50" : "bg-transparent"
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== Vista Resumen ===== */}
        {activeTab === 0 && (
          <div className="card overflow-x-auto">
            <table className="grade-table">
              <thead>
                <tr>
                  <th className="w-12">N°</th>
                  <th className="min-w-[200px]">Nombre del Alumno</th>
                  <th className="text-center w-20">1er Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20">2do Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20">3er Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20 border-l border-gray-300">
                    Julio
                  </th>
                  <th className="text-center w-20 bg-gray-100 font-bold border-l border-gray-300">
                    PROM. FINAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const pf = getPromedioFinal(student.id);
                  const pfNum = pf === "—" ? null : parseFloat(pf);
                  const julioScore =
                    grades[student.id]?.[JULIO_FINAL.id]?.score ?? null;
                  return (
                    <tr key={student.id}>
                      <td className="text-center text-gray-500 tabular-nums">
                        {student.list_num}
                      </td>
                      <td className="font-medium text-gray-900 text-xs">
                        {student.full_name}
                      </td>
                      {[1, 2, 3].map((t) => {
                        const avg = getTrimesterAvg(student.id, t);
                        const avgNum =
                          avg === "—" ? null : parseFloat(avg);
                        const abs = getTrimesterAbsences(student.id, t);
                        return (
                          <React.Fragment key={t}>
                            <td
                              className={`text-center tabular-nums font-semibold ${getSemaforoClass(
                                avgNum
                              )}`}
                            >
                              {avg}
                            </td>
                            <td className="text-center tabular-nums text-gray-500 text-xs">
                              {abs || "—"}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td
                        className={`text-center tabular-nums border-l border-gray-200 italic text-gray-500 ${getSemaforoClass(
                          julioScore
                        )}`}
                      >
                        {julioScore !== null ? julioScore.toFixed(1) : "—"}
                      </td>
                      <td
                        className={`text-center font-bold tabular-nums border-l border-gray-200 ${getSemaforoClass(
                          pfNum
                        )}`}
                      >
                        {pf}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">
              Julio (Final) se muestra como referencia — no se incluye en el
              promedio final.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Los cambios se guardan automáticamente al salir de cada celda. IA =
          Inasistencias Acumuladas.
        </p>
      </main>
    </div>
  );
}
