"use client";

import { formatStudentName } from "@/lib/format-name";

import { useEffect, useState, useCallback } from "react";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PeriodBanner from "@/components/PeriodBanner";

type Student = {
  id: string;
  full_name: string;
  list_num: number;
};

type GradeEntry = { score: number | null; absences: number; comment?: string };

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
  const [activePeriodInfo, setActivePeriodInfo] = useState<{ name: string; open_date: string | null; close_date: string | null } | null>(null);

  // Comment popover state
  const [commentPopover, setCommentPopover] = useState<{ studentId: string; period: number } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

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
            .eq("status", "activo")
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
            comment: g.comment || undefined,
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
              .filter((p: any) => p.effectively_open)
              .map((p: any) => p.period_number)
          );
          setOpenPeriods(openSet);
          const activePeriod = periodsData.periods.find((p: any) => p.effectively_open);
          if (activePeriod) {
            setActivePeriodInfo({ name: activePeriod.name, open_date: activePeriod.open_date, close_date: activePeriod.close_date });
          }
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
      absences: number,
      comment?: string
    ) => {
      if (isPeriodLocked(period)) return;
      const key = `${studentId}-${period}`;
      setSaving(key);

      try {
        const res = await fetch("/api/grades/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            subjectId,
            grades: [{
              student_id: studentId,
              period,
              score,
              absences,
              comment: comment !== undefined ? comment : undefined,
            }],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Error al guardar:", data.error);
          setSaveError(data.error || "Error al guardar calificación.");
          setTimeout(() => setSaveError(null), 5000);
        }
      } catch (err) {
        console.error("Error de red:", err);
        setSaveError("Error de conexión al guardar.");
        setTimeout(() => setSaveError(null), 5000);
      }

      setTimeout(() => setSaving(null), 600);
    },
    [groupId, subjectId, isPeriodLocked]
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

    const gradeRows: any[] = [];
    students.forEach((student) => {
      periodIds.forEach((pid) => {
        const data = grades[student.id]?.[pid];
        if (data) {
          gradeRows.push({
            student_id: student.id,
            period: pid,
            score: data.score,
            absences: data.absences,
            comment: data.comment || undefined,
          });
        }
      });
    });

    try {
      const res = await fetch("/api/grades/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          subjectId,
          grades: gradeRows,
        }),
      });

      setBulkSaving(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Error al guardar masivo:", data.error);
        setSaveError("Error al guardar calificaciones: " + (data.error || "Contacta al administrador."));
        setTimeout(() => setSaveError(null), 6000);
        setSaveStatus("idle");
        return;
      }
    } catch (err) {
      setBulkSaving(false);
      console.error("Error de red:", err);
      setSaveError("Error de conexión al guardar.");
      setTimeout(() => setSaveError(null), 6000);
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
    saveGrade(studentId, period, score, 0, data.comment);
  }

  function handleEnterKey(e: React.KeyboardEvent<HTMLInputElement>, studentId: string, period: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Trigger blur on current input to save
      (e.target as HTMLInputElement).blur();
      // Find next student's score input in the same column (period)
      const allInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[data-score-col="${period}"]`)
      );
      const currentIdx = allInputs.findIndex((inp) => inp.dataset.scoreStudent === studentId);
      if (currentIdx >= 0 && currentIdx < allInputs.length - 1) {
        const next = allInputs[currentIdx + 1];
        setTimeout(() => {
          next.focus();
          next.select();
        }, 50);
      }
    }
  }

  function openCommentPopover(studentId: string, period: number) {
    const current = grades[studentId]?.[period]?.comment || "";
    setCommentDraft(current);
    setCommentPopover({ studentId, period });
  }

  function saveComment() {
    if (!commentPopover) return;
    const { studentId, period } = commentPopover;
    const trimmed = commentDraft.trim();
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [period]: { ...prev[studentId][period], comment: trimmed || undefined },
      },
    }));
    const data = grades[studentId]?.[period];
    if (data) {
      saveGrade(studentId, period, data.score, 0, trimmed || undefined);
    }
    setCommentPopover(null);
    setCommentDraft("");
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


  /* --- Descargar Excel --- */
  function handleDownloadExcel() {
    const link = document.createElement("a");
    link.href = `/api/captura/${groupId}/${subjectId}/excel`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* --- Imprimir registro de captura --- */
  function handlePrint() {
    const trimester = activeTab >= 1 && activeTab <= 3
      ? TRIMESTERS.find((t) => t.id === activeTab)
      : null;
    const isJulio = activeTab === 4;
    const isResumen = activeTab === 0;
    const inputType = subject?.input_type || "score";
    const isCounter = inputType === "counter" || inputType === "counter_max";

    const rows = students.map((student) => {
      if (isResumen) {
        const t1 = getTrimesterAvg(student.id, 1);
        const t2 = getTrimesterAvg(student.id, 2);
        const t3 = getTrimesterAvg(student.id, 3);
        const julio = grades[student.id]?.[JULIO_FINAL.id]?.score;
        const pf = getPromedioFinal(student.id);
        return `<tr>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${student.list_num}</td>
          <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${formatStudentName(student.full_name)}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${t1}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${t2}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${t3}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${julio !== null && julio !== undefined ? julio : "—"}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;font-weight:bold;">${pf}</td>
        </tr>`;
      }
      if (isJulio) {
        const data = grades[student.id]?.[JULIO_FINAL.id];
        return `<tr>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${student.list_num}</td>
          <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${formatStudentName(student.full_name)}</td>
          <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${data?.score ?? "—"}</td>
        </tr>`;
      }
      // Trimestre
      const periodCells = (trimester?.periods || []).map((p) => {
        const data = grades[student.id]?.[p.id];
        return `<td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${data?.score ?? "—"}</td>`;
      }).join("");
      const trimAvg = getTrimesterAvg(student.id, activeTab);
      return `<tr>
        <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;">${student.list_num}</td>
        <td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;">${formatStudentName(student.full_name)}</td>
        ${periodCells}
        <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:11px;font-weight:bold;">${trimAvg}</td>
      </tr>`;
    }).join("");

    let headerRow = "";
    const subHeaderRow = "";
    if (isResumen) {
      headerRow = `<tr style="background:#1d4e9e;color:#fff;">
        <th style="padding:6px;border:1px solid #999;font-size:11px;">N°</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;text-align:left;">Nombre del Alumno</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">1er Trim.</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">2do Trim.</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">3er Trim.</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">Julio</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">Prom. Final</th>
      </tr>`;
    } else if (isJulio) {
      headerRow = `<tr style="background:#1d4e9e;color:#fff;">
        <th style="padding:6px;border:1px solid #999;font-size:11px;">N°</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;text-align:left;">Nombre del Alumno</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;">Calif.</th>
      </tr>`;
    } else {
      const periodHeaders = (trimester?.periods || []).map((p) =>
        `<th style="padding:6px;border:1px solid #999;font-size:11px;">${p.short}</th>`
      ).join("");
      headerRow = `<tr style="background:#1d4e9e;color:#fff;">
        <th style="padding:6px;border:1px solid #999;font-size:11px;">N°</th>
        <th style="padding:6px;border:1px solid #999;font-size:11px;text-align:left;">Nombre del Alumno</th>
        ${periodHeaders}
        <th style="padding:6px;border:1px solid #999;font-size:11px;">${isCounter ? "Total" : "Prom."}</th>
      </tr>`;
    }

    const tabName = isResumen ? "Resumen Anual" : isJulio ? "Julio (Final)" : trimester?.name || "";
    const now = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long", timeStyle: "short" });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Registro - ${subject?.name} - ${group?.grade}° ${group?.letter}</title>
      <style>
        @page { size: landscape; margin: 1.5cm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .school-name { font-size: 14px; font-weight: bold; color: #1d4e9e; }
        .school-sub { font-size: 11px; color: #666; }
        .info-section { text-align: right; font-size: 11px; color: #555; }
        h2 { font-size: 16px; margin: 0 0 4px 0; color: #1a1a1a; }
        .meta { font-size: 12px; color: #666; margin-bottom: 12px; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; }
        .sign-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 4px; font-size: 11px; color: #555; }
      </style>
    </head><body>
      <div class="header">
        <div class="logo-section">
          <div>
            <div class="school-name">Instituto Don Vasco</div>
            <div class="school-sub">Secundaria — Ciclo 2026-2027</div>
          </div>
        </div>
        <div class="info-section">
          <div>Impreso: ${now}</div>
          <div>Profesor: ${(effectiveProfile || profile)?.full_name || ""}</div>
        </div>
      </div>
      <h2>${subject?.name} — ${group?.grade}° "${group?.letter}"</h2>
      <div class="meta">${tabName} · ${students.length} alumnos</div>
      <table>
        <thead>${headerRow}${subHeaderRow}</thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sign-line">Firma del Profesor</div>
        <div class="sign-line">Firma de Dirección</div>
      </div>
    </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
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

        {activePeriodInfo && profile?.role === "teacher" && (
          <PeriodBanner
            periodName={activePeriodInfo.name}
            openDate={activePeriodInfo.open_date}
            closeDate={activePeriodInfo.close_date}
            compact
          />
        )}

        {/* Error toast */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 animate-slide-down">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 flex-1">{saveError}</p>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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
                  <th className="w-12 !rounded-tl-2xl">N°</th>
                  <th className="min-w-[200px]">Nombre del Alumno</th>
                  {currentTrimester.periods.map((p) => (
                    <th key={p.id} className="text-center w-24 border-l" style={{ borderColor: 'rgba(29,78,158,0.08)' }}>
                      {p.short}
                    </th>
                  ))}
                  <th className="w-16 text-center border-l !rounded-tr-2xl" style={{ borderColor: 'rgba(29,78,158,0.12)', background: 'rgba(29,78,158,0.06)' }}>
                    {subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? 'TOTAL' : 'PROM.'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const trimAvg = getTrimesterAvg(student.id, activeTab);
                  const trimAvgNum = trimAvg === "—" ? null : parseFloat(trimAvg);
                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-white/30"}>
                      <td className="text-center text-gray-400 tabular-nums text-xs font-medium">
                        {student.list_num}
                      </td>
                      <td className="font-medium text-gray-800 text-xs">
                        {formatStudentName(student.full_name)}
                      </td>
                      {currentTrimester.periods.map((p) => {
                        const data = grades[student.id]?.[p.id];
                        const isSaving = saving === `${student.id}-${p.id}`;
                        const locked = isPeriodLocked(p.id);
                        const hasComment = !!data?.comment;
                        return (
                          <React.Fragment key={p.id}>
                            <td className={`text-center border-l ${(subject?.input_type === 'counter' || subject?.input_type === 'counter_max') ? '' : getSemaforoClass(data?.score ?? null)}`} style={{ borderColor: 'rgba(0,0,0,0.03)' }}>
                              <div className="flex items-center justify-center gap-0.5">
                                <input
                                  type="number"
                                  min="0"
                                  max={subject?.input_type === 'counter_max' ? "10" : subject?.input_type === 'counter' ? "999" : "10"}
                                  step="1"
                                  data-score-col={p.id}
                                  data-score-student={student.id}
                                  value={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? (data?.score ?? 0) : (data?.score ?? "")}
                                  onChange={(e) => handleScoreChange(student.id, p.id, e.target.value)}
                                  onBlur={() => handleBlur(student.id, p.id)}
                                  onKeyDown={(e) => handleEnterKey(e, student.id, p.id)}
                                  disabled={locked}
                                  className={`grade-cell ${
                                    locked
                                      ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed"
                                      : isSaving
                                      ? "!bg-green-50/60 !border-green-300"
                                      : ""
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => openCommentPopover(student.id, p.id)}
                                  title={hasComment ? data.comment : "Agregar justificación"}
                                  className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                    hasComment
                                      ? "text-primary-600 hover:bg-primary-50"
                                      : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill={hasComment ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={hasComment ? 0 : 2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`text-center font-bold tabular-nums border-l ${getSemaforoClass(trimAvgNum)}`} style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                        {trimAvg}
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
                  <th className="text-center w-24">CALIF.</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const data = grades[student.id]?.[JULIO_FINAL.id];
                  const isSaving = saving === `${student.id}-${JULIO_FINAL.id}`;
                  const locked = isPeriodLocked(JULIO_FINAL.id);
                  const hasComment = !!data?.comment;
                  return (
                    <tr key={student.id} className={idx % 2 === 0 ? "" : "bg-white/30"}>
                      <td className="text-center text-gray-400 tabular-nums text-xs font-medium">{student.list_num}</td>
                      <td className="font-medium text-gray-800 text-xs">{formatStudentName(student.full_name)}</td>
                      <td className={`text-center ${(subject?.input_type === 'counter' || subject?.input_type === 'counter_max') ? '' : getSemaforoClass(data?.score ?? null)}`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            max={subject?.input_type === 'counter_max' ? "10" : subject?.input_type === 'counter' ? "999" : "10"}
                            step="1"
                            data-score-col={JULIO_FINAL.id}
                            data-score-student={student.id}
                            value={subject?.input_type === 'counter' || subject?.input_type === 'counter_max' ? (data?.score ?? 0) : (data?.score ?? "")}
                            onChange={(e) => handleScoreChange(student.id, JULIO_FINAL.id, e.target.value)}
                            onBlur={() => handleBlur(student.id, JULIO_FINAL.id)}
                            onKeyDown={(e) => handleEnterKey(e, student.id, JULIO_FINAL.id)}
                            disabled={locked}
                            className={`grade-cell ${locked ? "!bg-gray-100/60 text-gray-400 cursor-not-allowed" : isSaving ? "!bg-green-50/60 !border-green-300" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => openCommentPopover(student.id, JULIO_FINAL.id)}
                            title={hasComment ? data.comment : "Agregar justificación"}
                            className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              hasComment
                                ? "text-primary-600 hover:bg-primary-50"
                                : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill={hasComment ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={hasComment ? 0 : 2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                        </div>
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
                  <th className="text-center w-20">2do Trim.</th>
                  <th className="text-center w-20">3er Trim.</th>
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
                      <td className="font-medium text-gray-800 text-xs">{formatStudentName(student.full_name)}</td>
                      {[1, 2, 3].map((t) => {
                        const avg = getTrimesterAvg(student.id, t);
                        const avgNum = avg === "—" ? null : parseFloat(avg);
                        return (
                          <td key={t} className={`text-center tabular-nums font-semibold ${getSemaforoClass(avgNum)}`}>{avg}</td>
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
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.01)' }}>
              <p className="text-xs text-gray-400">
                Julio (Final) se muestra como referencia — no se incluye en el promedio final.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir Resumen
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 active:scale-[0.98]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Barra de guardado (tabs 1-4) ===== */}
        {activeTab !== 0 && (
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Registro
              </button>
              <button
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Excel
              </button>
            </div>
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

      {/* ===== Modal de justificación / comentario ===== */}
      {commentPopover && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setCommentPopover(null)}>
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden !bg-white/95" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(29,78,158,0.1)', background: 'rgba(29,78,158,0.03)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100/80 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Justificación de calificación</h3>
                  <p className="text-sm text-gray-500">
                    {formatStudentName(students.find((s) => s.id === commentPopover.studentId)?.full_name || "")}
                    {" — "}
                    Calif: {grades[commentPopover.studentId]?.[commentPopover.period]?.score ?? "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentario (opcional)
              </label>
              <textarea
                autoFocus
                rows={3}
                maxLength={500}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Ej. No entregó actividades, faltó al examen..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none"
              />
              <p className="mt-1.5 text-xs text-gray-400">{commentDraft.length}/500 · Solo visible para maestros y administración</p>
            </div>
            <div className="px-5 py-4 border-t flex gap-3 justify-end" style={{ borderColor: 'rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.01)' }}>
              <button onClick={() => setCommentPopover(null)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={saveComment} className="btn-primary text-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
