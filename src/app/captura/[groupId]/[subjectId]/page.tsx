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

type SaveStatus = "idle" | "saving" | "success" | "warning";
type MissingInfo = { count: number; names: string[] };

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
  const [activeTab, setActiveTab] = useState(1);

  // Estado del guardado masivo
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [missingInfo, setMissingInfo] = useState<MissingInfo>({ count: 0, names: [] });
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [openPeriods, setOpenPeriods] = useState<Set<number>>(new Set());

  const isPeriodLocked = useCallback(
    (periodId: number) => {
      if (!profile || profile.role === "admin") return false;
      return !openPeriods.has(periodId);
    },
    [profile, openPeriods]
  );

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

      // Cargar periodos abiertos
      try {
        const periodsRes = await fetch("/api/admin/periods");
        const periodsData = await periodsRes.json();
        if (periodsData.periods) {
          const openSet = new Set<number>(
            periodsData.periods
              .filter((p: any) => p.is_open)
              .map((p: any) => p.period_number)
          );
          setOpenPeriods(openSet);
        }
      } catch {
        // Si falla, todos abiertos por defecto
        setOpenPeriods(new Set(ALL_PERIOD_IDS));
      }

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
      // Bloquear guardado si el periodo está cerrado para teachers
      if (isPeriodLocked(period)) return;
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
    [supabase, subjectId, isPeriodLocked]
  );

  // Obtener los period IDs de la tab actual
  function getCurrentPeriodIds(): number[] {
    if (activeTab >= 1 && activeTab <= 3) {
      const trim = TRIMESTERS.find((t) => t.id === activeTab);
      return trim ? trim.periods.map((p) => p.id) : [];
    }
    if (activeTab === 4) return [JULIO_FINAL.id];
    return [];
  }

  // Revisar alumnos sin calificación en los periodos actuales
  function checkMissing(): MissingInfo {
    const periodIds = getCurrentPeriodIds();
    const missing: string[] = [];

    students.forEach((student) => {
      const data = grades[student.id];
      if (!data) {
        missing.push(student.full_name);
        return;
      }
      const hasAnyMissing = periodIds.some((pid) => data[pid]?.score === null);
      if (hasAnyMissing) {
        missing.push(student.full_name);
      }
    });

    return { count: missing.length, names: missing };
  }

  // Guardado masivo
  async function handleBulkSave(forceSave = false) {
    const periodIds = getCurrentPeriodIds();
    if (periodIds.length === 0) return;

    // Verificar faltantes
    const info = checkMissing();
    setMissingInfo(info);

    if (info.count > 0 && !forceSave) {
      setShowMissingModal(true);
      return;
    }

    // Proceder con el guardado
    setBulkSaving(true);
    setSaveStatus("saving");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Construir array de upserts
    const upserts: any[] = [];
    students.forEach((student) => {
      periodIds.forEach((pid) => {
        const data = grades[student.id]?.[pid];
        if (data) {
          upserts.push({
            student_id: student.id,
            subject_id: subjectId,
            period: pid,
            score: data.score,
            absences: data.absences,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          });
        }
      });
    });

    const { error } = await supabase
      .from("grades")
      .upsert(upserts, { onConflict: "student_id,subject_id,period" });

    setBulkSaving(false);

    if (error) {
      console.error("Error al guardar masivo:", error);
      setSaveStatus("idle");
      return;
    }

    if (info.count > 0) {
      setSaveStatus("warning");
    } else {
      setSaveStatus("success");
    }

    setTimeout(() => setSaveStatus("idle"), 4000);
  }

  function handleScoreChange(
    studentId: string,
    period: number,
    value: string
  ) {
    const num = value === "" ? null : parseFloat(value);
    // Permitir escritura libre (no bloquear dígitos intermedios como "1" de "10")
    if (num !== null && isNaN(num)) return;

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
    if (!data) return;

    // Validar rango al perder foco: si está fuera de 5-10, corregir
    let score = data.score;
    if (score !== null) {
      if (score < 5) score = 5;
      if (score > 10) score = 10;
      // Redondear a 1 decimal
      score = Math.round(score * 10) / 10;
    }

    // Actualizar el estado con el valor corregido
    if (score !== data.score) {
      setGrades((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [period]: { ...prev[studentId][period], score },
        },
      }));
    }

    saveGrade(studentId, period, score, data.absences);
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

  // Nombre legible del tab actual
  function currentTabName(): string {
    if (activeTab >= 1 && activeTab <= 3) {
      return TRIMESTERS.find((t) => t.id === activeTab)?.name || "";
    }
    if (activeTab === 4) return "Julio (Final)";
    return "";
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

  // Conteo en vivo de faltantes para el badge
  const liveMissing = activeTab !== 0 ? checkMissing() : { count: 0, names: [] };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        {/* Banner de periodo cerrado */}
        {profile?.role === "teacher" && openPeriods.size > 0 && (() => {
          const currentTrimester = TRIMESTERS.find((t) => t.id === activeTab);
          const lockedPeriods = currentTrimester
            ? currentTrimester.periods.filter((p) => !openPeriods.has(p.id))
            : [];
          if (lockedPeriods.length === 0) return null;
          const allLocked = currentTrimester && lockedPeriods.length === currentTrimester.periods.length;
          return (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              allLocked
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
            }`}>
              <span>{allLocked ? "🔒" : "⚠️"}</span>
              <span>
                {allLocked
                  ? "Este trimestre está cerrado para captura. Solo puedes consultar las calificaciones."
                  : `Periodo(s) cerrado(s): ${lockedPeriods.map((p) => p.name).join(", ")}. Solo lectura en esos periodos.`}
              </span>
            </div>
          );
        })()}

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
                                disabled={isPeriodLocked(p.id)}
                                className={`grade-cell ${
                                  isPeriodLocked(p.id)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : isSaving
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
                                disabled={isPeriodLocked(p.id)}
                                className={`grade-cell ${
                                  isPeriodLocked(p.id)
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : isSaving
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

        {/* ===== Tab Julio (Final) ===== */}
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
                          disabled={isPeriodLocked(JULIO_FINAL.id)}
                          className={`grade-cell ${
                            isPeriodLocked(JULIO_FINAL.id)
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : isSaving ? "bg-green-50" : "bg-transparent"
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
                          disabled={isPeriodLocked(JULIO_FINAL.id)}
                          className={`grade-cell ${
                            isPeriodLocked(JULIO_FINAL.id)
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : isSaving ? "bg-green-50" : "bg-transparent"
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

        {/* ===== Barra de guardado (tabs 1-4, no en resumen) ===== */}
        {activeTab !== 0 && (
          <div className="mt-4 card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Indicador de faltantes en vivo */}
              <div className="flex items-center gap-2">
                {liveMissing.count > 0 ? (
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {liveMissing.count} alumno{liveMissing.count !== 1 ? "s" : ""} sin calificación
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">
                      Todos los alumnos tienen calificación
                    </span>
                  </div>
                )}
              </div>

              {/* Botón guardar */}
              <button
                onClick={() => handleBulkSave(false)}
                disabled={bulkSaving}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  bulkSaving
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : saveStatus === "success"
                    ? "bg-green-600 text-white"
                    : "bg-primary-600 text-white hover:bg-primary-700 active:scale-95"
                }`}
              >
                {bulkSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : saveStatus === "success" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardado
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Registrar Calificaciones
                  </>
                )}
              </button>
            </div>

            {/* Toast de éxito con warning */}
            {saveStatus === "warning" && (
              <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Calificaciones guardadas, pero {missingInfo.count} alumno{missingInfo.count !== 1 ? "s" : ""} quedaron sin calificación.
              </div>
            )}
            {saveStatus === "success" && (
              <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Todas las calificaciones se registraron correctamente.
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Los cambios también se guardan automáticamente al salir de cada celda. IA =
          Inasistencias Acumuladas.
        </p>
      </main>

      {/* ===== Modal de alumnos sin calificación ===== */}
      {showMissingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header del modal */}
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-900">
                    Alumnos sin calificación
                  </h3>
                  <p className="text-sm text-amber-700">
                    {currentTabName()} — {missingInfo.count} de {students.length} alumnos
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de alumnos faltantes */}
            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">
                Los siguientes alumnos no tienen calificación registrada en uno o más periodos:
              </p>
              <ul className="space-y-1">
                {missingInfo.names.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Acciones del modal */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowMissingModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Revisar registro
              </button>
              <button
                onClick={() => {
                  setShowMissingModal(false);
                  handleBulkSave(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Guardar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
