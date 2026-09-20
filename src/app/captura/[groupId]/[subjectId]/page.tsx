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
    short: "1T",
    periods: [
      { id: 1, name: "Septiembre", short: "SEPT" },
      { id: 2, name: "Octubre", short: "OCT" },
    ],
  },
  {
    id: 2,
    name: "2do Trimestre",
    short: "2T",
    periods: [
      { id: 3, name: "Nov - Dic", short: "NOV-DIC" },
      { id: 4, name: "Ene - Feb", short: "ENE-FEB" },
    ],
  },
  {
    id: 3,
    name: "3er Trimestre",
    short: "3T",
    periods: [
      { id: 5, name: "Marzo", short: "MARZO" },
      { id: 6, name: "Abril", short: "ABRIL" },
      { id: 7, name: "Mayo", short: "MAYO" },
      { id: 8, name: "Junio", short: "JUNIO" },
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
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/effective-profile")
      .then((r) => r.json())
      .then((data) => { if (data.full_name) setEffectiveProfile(data); })
      .catch(() => {});
  }, []);
  const [group, setGroup] = useState<any>(null);
  const [subject, setSubject] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeData>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [missingInfo, setMissingInfo] = useState<MissingInfo>({ count: 0, names: [] });
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [openPeriods, setOpenPeriods] = useState<Set<number>>(new Set());

  const isPeriodLocked = useCallback(
    (periodId: number) => {
      if (!profile || profile.role === "admin" || profile.role === "directora_anita") return false;
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

      if (error) console.error("Error al guardar:", error);

      setTimeout(() => setSaving(null), 600);
    },
    [supabase, subjectId, isPeriodLocked]
  );

  function getCurrentPeriodIds(): number[] {
    if (activeTab >= 1 && activeTab <= 3) {
      const trim = TRIMESTERS.find((t) => t.id === activeTab);
      return trim ? trim.periods.map((p) => p.id) : [];
    }
    if (activeTab === 4) return [JULIO_FINAL.id];
    return [];
  }

  function checkMissing(): MissingInfo {
    const periodIds = getCurrentPeriodIds();
    const missing: string[] = [];
    students.forEach((student) => {
      const data = grades[student.id];
      if (!data) { missing.push(student.full_name); return; }
      const hasAnyMissing = periodIds.some((pid) => data[pid]?.score === null);
      if (hasAnyMissing) missing.push(student.full_name);
    });
    return { count: missing.length, names: missing };
  }

  async function handleBulkSave(forceSave = false) {
    const periodIds = getCurrentPeriodIds();
    if (periodIds.length === 0) return;

    const info = checkMissing();
    setMissingInfo(info);

    if (info.count > 0 && !forceSave) {
      setShowMissingModal(true);
      return;
    }

    setBulkSaving(true);
    setSaveStatus("saving");

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    setSaveStatus(info.count > 0 ? "warning" : "success");
    setTimeout(() => setSaveStatus("idle"), 4000);
  }

  function handleScoreChange(studentId: string, period: number, value: string) {
    const inputType = subject?.input_type || 'score';
    if (inputType === 'counter' || inputType === 'counter_max') {
      const num = value === "" ? 0 : parseInt(value);
      if (isNaN(num) || num < 0) return;
      if (inputType === 'counter_max' && num > 10) return;
      setGrades((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [period]: { ...prev[studentId][period], score: num },
        },
      }));
    } else {
      const num = value === "" ? null : parseInt(value);
      if (num !== null && isNaN(num)) return;
      setGrades((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [period]: { ...prev[studentId][period], score: num },
        },
      }));
    }
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
    if (!data) return;
    const inputType = subject?.input_type || 'score';
    let score = data.score;
    if (inputType === 'counter' || inputType === 'counter_max') {
      if (score === null) score = 0;
      score = Math.max(0, Math.round(score));
      if (inputType === 'counter_max') score = Math.min(10, score);
    } else if (score !== null) {
      score = Math.round(score);
      if (score < 5) score = 5;
      if (score > 10) score = 10;
    }
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
    const inputType = subject?.input_type || 'score';
    if (inputType === 'counter' || inputType === 'counter_max') {
      // For counters, show the sum instead of average
      const trimester = TRIMESTERS.find((t) => t.id === trimesterId);
      if (!trimester) return "—";
      const data = grades[studentId];
      if (!data) return "—";
      const scores = trimester.periods
        .map((p) => data[p.id]?.score)
        .filter((s): s is number => s !== null);
      if (scores.length === 0) return "—";
      return scores.reduce((a, b) => a + b, 0).toString();
    }
    const trimester = TRIMESTERS.find((t) => t.id === trimesterId);
    if (!trimester) return "—";
    const data = grades[studentId];
    if (!data) return "—";
    const scores = trimester.periods
      .map((p) => data[p.id]?.score)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return "—";
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg).toString();
  }

  function getPromedioFinal(studentId: string): string {
    const trimAvgs = [1, 2, 3]
      .map((t) => {
        const avg = getTrimesterAvg(studentId, t);
        return avg === "—" ? null : parseFloat(avg);
      })
      .filter((a): a is number => a !== null);
    if (trimAvgs.length === 0) return "—";
    const avg = trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length;
    return Math.round(avg).toString();
  }

  function getTrimesterAbsences(studentId: string, trimesterId: number): number {
    const trimester = TRIMESTERS.find((t) => t.id === trimesterId);
    if (!trimester) return 0;
    const data = grades[studentId];
    if (!data) return 0;
    return trimester.periods.reduce((sum, p) => sum + (data[p.id]?.absences ?? 0), 0);
  }

  function getSemaforoClass(score: number | null): string {
    if (score === null) return "";
    if (score < 7) return "semaforo-rojo";
    if (score < 8) return "semaforo-amarillo";
    return "semaforo-verde";
  }

  function currentTabName(): string {
    if (activeTab >= 1 && activeTab <= 3)
      return TRIMESTERS.find((t) => t.id === activeTab)?.name || "";
    if (activeTab === 4) return "Julio (Final)";
    return "";
  }

  /* --- Stats rápidos por periodo --- */
  function getPerPeriodStats() {
    const periodIds = getCurrentPeriodIds();
    const trim = activeTab >= 1 && activeTab <= 3
      ? TRIMESTERS.find((t) => t.id === activeTab)
      : null;
    return periodIds.map((pid) => {
      let filled = 0;
      const total = students.length;
      students.forEach((s) => {
        if (grades[s.id]?.[pid]?.score !== null) filled++;
      });
      const pLabel = trim
        ? trim.periods.find((p) => p.id === pid)?.short || `P${pid}`
        : pid === 9 ? "JULIO" : `P${pid}`;
      return { pid, label: pLabel, filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
    });
  }

  function getQuickStats() {
    const perPeriod = getPerPeriodStats();
    const filled = perPeriod.reduce((a, p) => a + p.filled, 0);
    const total = perPeriod.reduce((a, p) => a + p.total, 0);
    return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0, perPeriod };
  }

  if (loading) {
    return (
      <div className="bg-mesh flex items-center justify-center">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-4">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm font-medium">Cargando calificaciones...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const currentTrimester =
    activeTab >= 1 && activeTab <= 3
      ? TRIMESTERS.find((t) => t.id === activeTab)!
      : null;

  const liveMissing = activeTab !== 0 ? checkMissing() : { count: 0, names: [] };
  const stats = activeTab !== 0 ? getQuickStats() : null;

  return (
    <div className="bg-mesh">
      <Navbar userName={(effectiveProfile || profile)!.full_name} userRole={(effectiveProfile || profile)!.role} />

      <main className="page-content animate-fade-in">
        {/* Banner de periodo cerrado */}
        {(profile?.role === "teacher") && openPeriods.size > 0 && (() => {
          const ct = TRIMESTERS.find((t) => t.id === activeTab);
          const lockedPeriods = ct ? ct.periods.filter((p) => !openPeriods.has(p.id)) : [];
          if (lockedPeriods.length === 0) return null;
          const allLocked = ct && lockedPeriods.length === ct.periods.length;
          return (
            <div className={`mb-4 glass rounded-xl px-4 py-3 text-sm flex items-center gap-3 ${
              allLocked
                ? "!border-red-200/60 !bg-red-50/60"
                : "!border-yellow-200/60 !bg-yellow-50/60"
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                allLocked ? "bg-red-100/80 text-red-600" : "bg-yellow-100/80 text-yellow-600"
              }`}>
                {allLocked ? "🔒" : "⚠️"}
              </div>
              <span className={allLocked ? "text-red-700" : "text-yellow-700"}>
                {allLocked
                  ? "Este trimestre está cerrado para captura. Solo puedes consultar las calificaciones."
                  : `Periodo(s) cerrado(s): ${lockedPeriods.map((p) => p.name).join(", ")}. Solo lectura en esos periodos.`}
              </span>
            </div>
          );
        })()}

        {/* Header */}
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {subject?.name}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-700">
                {group?.grade}° {group?.letter}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Ciclo 2026-2027 &middot; {students.length} alumnos
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
        </div>


        {/* Banner no curricular */}
        {subject && subject.counts_for_avg === false && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl glass-subtle border border-amber-200/50 text-amber-800 text-sm">
            <span className="text-lg">ℹ️</span>
            <div>
              <span className="font-semibold">Materia no curricular</span>
              <span className="mx-1.5 text-amber-400">·</span>
              <span className="text-amber-700">Las calificaciones de esta materia no abonan al promedio general del alumno.</span>
            </div>
          </div>
        )}

        {/* Semáforo leyenda */}
        <div className="flex flex-wrap gap-2 mb-5 text-xs">
          <span className="px-3 py-1.5 rounded-full semaforo-rojo font-medium">
            Requiere Apoyo (5-6.9)
          </span>
          <span className="px-3 py-1.5 rounded-full semaforo-amarillo font-medium">
            En Desarrollo (7-7.9)
          </span>
          <span className="px-3 py-1.5 rounded-full semaforo-verde font-medium">
            Nivel Esperado (8-10)
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 glass-subtle rounded-xl w-fit">
          {TRIMESTERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === t.id
                  ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <span className="hidden sm:inline">{t.name}</span>
              <span className="sm:hidden">{t.short}</span>
            </button>
          ))}
          <button
            onClick={() => setActiveTab(4)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 4
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <span className="hidden sm:inline">Julio Final</span>
            <span className="sm:hidden">JUL</span>
          </button>
          <div className="w-px h-6 bg-gray-200/60 mx-1" />
          <button
            onClick={() => setActiveTab(0)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 0
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            Resumen
          </button>
        </div>

        {/* Quick Stats */}
        {stats && activeTab !== 0 && (
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {stats.perPeriod.map((pp) => (
              <div key={pp.pid} className="glass-subtle rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="relative w-9 h-9">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={pp.pct === 100 ? "#16a34a" : "#1d4e9e"} strokeWidth="3"
                      strokeDasharray={`${pp.pct * 0.942} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    {pp.pct}%
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{pp.label}</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {pp.filled} / {pp.total}
                  </p>
                </div>
              </div>
            ))}

            {liveMissing.count > 0 ? (
              <div className="glass-subtle rounded-xl px-4 py-2.5 flex items-center gap-2 !border-amber-200/60 !bg-amber-50/40">
                <div className="w-7 h-7 rounded-lg bg-amber-100/80 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-amber-700">
                  {liveMissing.count} sin calificación
                </span>
              </div>
            ) : (
              <div className="glass-subtle rounded-xl px-4 py-2.5 flex items-center gap-2 !border-green-200/60 !bg-green-50/40">
                <div className="w-7 h-7 rounded-lg bg-green-100/80 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-700">
                  Completo
                </span>
              </div>
            )}
          </div>
        )}

        {/* ===== Tabla de captura por trimestre (tabs 1-3) ===== */}
        {currentTrimester && (
          <div className="card overflow-x-auto !p-0">
            <table className="grade-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="w-12 !rounded-tl-2xl">N°</th>
                  <th rowSpan={2} className="min-w-[200px]">Nombre del Alumno</th>
                  {currentTrimester.periods.map((p) => (
                    <th key={p.id} colSpan={2} className="text-center border-l" style={{ borderColor: 'rgba(29,78,158,0.08)' }}>
                      {p.short}
                    </th>
                  ))}
                  <th rowSpan={2} className="w-16 text-center border-l" style={{ borderColor: 'rgba(29,78,158,0.12)', background: 'rgba(29,78,158,0.06)' }}>
                    {subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? 'TOTAL' : 'PROM.'}
                  </th>
                  <th rowSpan={2} className="w-14 text-center !rounded-tr-2xl" style={{ background: 'rgba(29,78,158,0.06)' }}>IA</th>
                </tr>
                <tr>
                  {currentTrimester.periods.map((p) => (
                    <React.Fragment key={p.id}>
                      <th className="text-center text-xs w-16 border-l" style={{ borderColor: 'rgba(29,78,158,0.08)' }}>CALIF.</th>
                      <th className="text-center text-xs w-14">ASIST.</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const trimAvg = getTrimesterAvg(student.id, activeTab);
                  const trimAvgNum = trimAvg === "—" ? null : parseFloat(trimAvg);
                  const totalAbs = getTrimesterAbsences(student.id, activeTab);
                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-white/30"}>
                      <td className="text-center text-gray-400 tabular-nums text-xs font-medium">
                        {student.list_num}
                      </td>
                      <td className="font-medium text-gray-800 text-xs">
                        {student.full_name}
                      </td>
                      {currentTrimester.periods.map((p) => {
                        const data = grades[student.id]?.[p.id];
                        const isSaving = saving === `${student.id}-${p.id}`;
                        const locked = isPeriodLocked(p.id);
                        return (
                          <React.Fragment key={p.id}>
                            <td className={`text-center border-l ${(subject?.input_type === 'counter' || subject?.input_type === 'counter_max') ? '' : getSemaforoClass(data?.score ?? null)}`} style={{ borderColor: 'rgba(0,0,0,0.03)' }}>
                              <input
                                type="number"
                                min={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? "0" : "5"}
                                max={subject?.input_type === 'counter_max' ? "10" : subject?.input_type === 'counter' ? "999" : "10"}
                                step="1"
                                value={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? (data?.score ?? 0) : (data?.score ?? "")}
                                onChange={(e) => handleScoreChange(student.id, p.id, e.target.value)}
                                onBlur={() => handleBlur(student.id, p.id)}
                                disabled={locked}
                                className={`grade-cell ${
                                  locked
                                    ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed"
                                    : isSaving
                                    ? "!bg-green-50/60 !border-green-300"
                                    : ""
                                }`}
                              />
                            </td>
                            <td className="text-center">
                              <input
                                type="number" min="0"
                                value={data?.absences ?? 0}
                                onChange={(e) => handleAbsencesChange(student.id, p.id, e.target.value)}
                                onBlur={() => handleBlur(student.id, p.id)}
                                disabled={locked}
                                className={`grade-cell ${
                                  locked
                                    ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed"
                                    : isSaving
                                    ? "!bg-green-50/60 !border-green-300"
                                    : ""
                                }`}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`text-center font-bold tabular-nums border-l ${getSemaforoClass(trimAvgNum)}`} style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        {trimAvg}
                      </td>
                      <td className="text-center tabular-nums text-gray-400 text-xs">
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
          <div className="card overflow-x-auto !p-0">
            <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.04)', background: 'rgba(245,158,11,0.04)' }}>
              <span className="text-xs text-amber-700 font-medium">
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
                {students.map((student, idx) => {
                  const data = grades[student.id]?.[JULIO_FINAL.id];
                  const isSaving = saving === `${student.id}-${JULIO_FINAL.id}`;
                  const locked = isPeriodLocked(JULIO_FINAL.id);
                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-white/30"}>
                      <td className="text-center text-gray-400 tabular-nums text-xs font-medium">{student.list_num}</td>
                      <td className="font-medium text-gray-800 text-xs">{student.full_name}</td>
                      <td className={`text-center ${(subject?.input_type === 'counter' || subject?.input_type === 'counter_max') ? '' : getSemaforoClass(data?.score ?? null)}`}>
                        <input
                          type="number"
                          min={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? "0" : "5"}
                          max={subject?.input_type === 'counter_max' ? "10" : subject?.input_type === 'counter' ? "999" : "10"}
                          step="1"
                          value={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? (data?.score ?? 0) : (data?.score ?? "")}
                          onChange={(e) => handleScoreChange(student.id, JULIO_FINAL.id, e.target.value)}
                          onBlur={() => handleBlur(student.id, JULIO_FINAL.id)}
                          disabled={locked}
                          className={`grade-cell ${locked ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed" : isSaving ? "!bg-green-50/60 !border-green-300" : ""}`}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="number" min="0"
                          value={data?.absences ?? 0}
                          onChange={(e) => handleAbsencesChange(student.id, JULIO_FINAL.id, e.target.value)}
                          onBlur={() => handleBlur(student.id, JULIO_FINAL.id)}
                          disabled={locked}
                          className={`grade-cell ${locked ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed" : isSaving ? "!bg-green-50/60 !border-green-300" : ""}`}
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
          <div className="card overflow-x-auto !p-0">
            <table className="grade-table">
              <thead>
                <tr>
                  <th className="w-12 !rounded-tl-2xl">N°</th>
                  <th className="min-w-[200px]">Nombre del Alumno</th>
                  <th className="text-center w-20">1er Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20">2do Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20">3er Trim.</th>
                  <th className="text-center w-14">IA</th>
                  <th className="text-center w-20 border-l" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>Julio</th>
                  <th className="text-center w-20 font-bold border-l !rounded-tr-2xl" style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'rgba(29,78,158,0.06)' }}>PROM. FINAL</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const pf = getPromedioFinal(student.id);
                  const pfNum = pf === "—" ? null : parseFloat(pf);
                  const julioScore = grades[student.id]?.[JULIO_FINAL.id]?.score ?? null;
                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-white/30"}>
                      <td className="text-center text-gray-400 tabular-nums text-xs font-medium">{student.list_num}</td>
                      <td className="font-medium text-gray-800 text-xs">{student.full_name}</td>
                      {[1, 2, 3].map((t) => {
                        const avg = getTrimesterAvg(student.id, t);
                        const avgNum = avg === "—" ? null : parseFloat(avg);
                        const abs = getTrimesterAbsences(student.id, t);
                        return (
                          <React.Fragment key={t}>
                            <td className={`text-center tabular-nums font-semibold ${getSemaforoClass(avgNum)}`}>{avg}</td>
                            <td className="text-center tabular-nums text-gray-400 text-xs">{abs || "—"}</td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`text-center tabular-nums border-l italic text-gray-500 ${getSemaforoClass(julioScore)}`} style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                        {julioScore !== null ? julioScore.toFixed(1) : "—"}
                      </td>
                      <td className={`text-center font-bold tabular-nums border-l ${getSemaforoClass(pfNum)}`} style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        {pf}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3" style={{ background: 'rgba(0,0,0,0.01)' }}>
              <p className="text-xs text-gray-400">
                Julio (Final) se muestra como referencia — no se incluye en el promedio final.
              </p>
            </div>
          </div>
        )}

        {/* ===== Barra de guardado (tabs 1-4) ===== */}
        {activeTab !== 0 && (
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Los cambios se guardan automáticamente al salir de cada celda. IA = Inasistencias Acumuladas.
            </p>
            <button
              onClick={() => handleBulkSave(false)}
              disabled={bulkSaving}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
                bulkSaving
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : saveStatus === "success"
                  ? "bg-green-600 text-white shadow-green-600/20"
                  : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/20 active:scale-[0.98]"
              }`}
            >
              {bulkSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        )}

        {/* Toast de status */}
        {saveStatus === "warning" && (
          <div className="mt-3 glass rounded-xl px-4 py-3 flex items-center gap-3 !border-amber-200/60 !bg-amber-50/50 text-sm text-amber-700">
            <div className="w-7 h-7 rounded-lg bg-amber-100/80 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            Calificaciones guardadas, pero {missingInfo.count} alumno{missingInfo.count !== 1 ? "s" : ""} quedaron sin calificación.
          </div>
        )}
        {saveStatus === "success" && (
          <div className="mt-3 glass rounded-xl px-4 py-3 flex items-center gap-3 !border-green-200/60 !bg-green-50/50 text-sm text-green-700">
            <div className="w-7 h-7 rounded-lg bg-green-100/80 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Todas las calificaciones se registraron correctamente.
          </div>
        )}
      </main>

      {/* ===== Modal de alumnos sin calificación ===== */}
      {showMissingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden !bg-white/90">
            {/* Header del modal */}
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 flex items-center justify-center">
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

            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-3">
                Los siguientes alumnos no tienen calificación en uno o más periodos:
              </p>
              <ul className="space-y-1.5">
                {missingInfo.names.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-5 py-4 border-t flex gap-3 justify-end" style={{ borderColor: 'rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
              <button
                onClick={() => setShowMissingModal(false)}
                className="btn-secondary"
              >
                Revisar registro
              </button>
              <button
                onClick={() => { setShowMissingModal(false); handleBulkSave(true); }}
                className="btn-primary text-sm"
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
