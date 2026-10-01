"use client";

import { formatStudentName } from "@/lib/format-name";
import React, { useState, useMemo } from "react";

/* ── Types ── */
type Group = { id: string; grade: number; letter: string };
type Subject = { id: string; name: string; short_name: string; counts_for_avg: boolean; sort_order: number; grade: number };
type Student = { id: string; full_name: string; list_num: number; group_id: string };
type GradeEntry = { score: number | null; absences: number; comment?: string };
type GradeMap = Record<string, Record<string, Record<number, GradeEntry>>>;

type Props = {
  groups: Group[];
  allSubjects: Subject[];
  allStudents: Student[];
  gradeMap: GradeMap;
};

/* ── Constants ── */
const PERIODS = [
  { id: 1, short: "SEPT", name: "Septiembre" },
  { id: 2, short: "OCT", name: "Octubre" },
  { id: 3, short: "NOV-DIC", name: "Nov-Dic" },
  { id: 4, short: "ENE-FEB", name: "Ene-Feb" },
  { id: 5, short: "MARZO", name: "Marzo" },
  { id: 6, short: "ABRIL", name: "Abril" },
  { id: 7, short: "MAYO", name: "Mayo" },
  { id: 8, short: "JUNIO", name: "Junio" },
];

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7, 8] },
];

type FilterMode = "month" | "trimester" | "general";

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800";
  if (score < 8) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function fmt(n: number | null): string {
  return n !== null ? Math.round(n).toString() : "—";
}

export default function ConcentradoFiltered({ groups, allSubjects, allStudents, gradeMap }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("month");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedTrimester, setSelectedTrimester] = useState<number>(1);

  // Derived data
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const subjectsForGroup = useMemo(
    () => selectedGroup ? allSubjects.filter((s) => s.grade === selectedGroup.grade).sort((a, b) => a.sort_order - b.sort_order) : [],
    [selectedGroup, allSubjects]
  );
  const studentsForGroup = useMemo(
    () => allStudents.filter((s) => s.group_id === selectedGroupId).sort((a, b) => a.list_num - b.list_num),
    [selectedGroupId, allStudents]
  );

  const displaySubjects = selectedSubjectId === "all"
    ? subjectsForGroup
    : subjectsForGroup.filter((s) => s.id === selectedSubjectId);

  // Which periods to show
  const visiblePeriods: number[] = useMemo(() => {
    if (filterMode === "month") return [selectedPeriod];
    if (filterMode === "trimester") {
      const t = TRIMESTERS.find((t) => t.id === selectedTrimester);
      return t ? t.periods : [];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, [filterMode, selectedPeriod, selectedTrimester]);

  const activeTrimester = filterMode === "trimester" ? TRIMESTERS.find((t) => t.id === selectedTrimester) : null;

  // Helper functions
  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
  }
  function getAbsences(studentId: string, subjectId: string, period: number): number {
    return gradeMap[studentId]?.[subjectId]?.[period]?.absences ?? 0;
  }
  function getComment(studentId: string, subjectId: string, period: number): string | undefined {
    return gradeMap[studentId]?.[subjectId]?.[period]?.comment;
  }
  function getTrimesterAvg(studentId: string, subjectId: string, periods: number[]): number | null {
    const scores = periods.map((p) => getScore(studentId, subjectId, p)).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  function getSubjectFinal(studentId: string, subjectId: string): number | null {
    const avgs = TRIMESTERS.map((t) => getTrimesterAvg(studentId, subjectId, t.periods)).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  // Title for print header
  const filterTitle = filterMode === "month"
    ? PERIODS.find((p) => p.id === selectedPeriod)?.name ?? ""
    : filterMode === "trimester"
    ? TRIMESTERS.find((t) => t.id === selectedTrimester)?.name ?? ""
    : "General";

  const subjectTitle = selectedSubjectId === "all"
    ? "Todas las materias"
    : displaySubjects[0]?.name ?? "";

  return (
    <div>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 6mm 4mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .card { box-shadow: none !important; border: 1px solid #d1d5db !important; }
          .concentrado-f-print-header { display: flex !important; }
          .print-hidden { display: none !important; }
        }
      `}} />

      {/* Filters */}
      <div className="card p-4 mb-4 print-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Group selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Grupo</label>
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedSubjectId("all");
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">— Seleccionar grupo —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.grade}° &ldquo;{g.letter}&rdquo;</option>
              ))}
            </select>
          </div>

          {/* Subject selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Materia</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={!selectedGroupId}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            >
              <option value="all">Todas las materias</option>
              {subjectsForGroup.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Filter mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Vista</label>
            <div className="flex gap-1">
              {([
                { key: "month" as FilterMode, label: "Mes" },
                { key: "trimester" as FilterMode, label: "Trimestre" },
                { key: "general" as FilterMode, label: "General" },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterMode(opt.key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterMode === opt.key
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period/Trimester sub-selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {filterMode === "month" ? "Periodo" : filterMode === "trimester" ? "Trimestre" : "—"}
            </label>
            {filterMode === "month" && (
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {filterMode === "trimester" && (
              <select
                value={selectedTrimester}
                onChange={(e) => setSelectedTrimester(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {TRIMESTERS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            {filterMode === "general" && (
              <div className="px-3 py-2 text-sm text-gray-400 italic">Todos los periodos</div>
            )}
          </div>
        </div>
      </div>

      {/* No group selected */}
      {!selectedGroupId && (
        <div className="empty-state py-16 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-gray-500 font-medium">Selecciona un grupo para ver el concentrado</p>
        </div>
      )}

      {/* Table */}
      {selectedGroupId && studentsForGroup.length > 0 && (
        <>
          {/* Action buttons */}
          <div className="flex justify-end gap-2 mb-3 print-hidden">
            <button
              onClick={() => window.print()}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>

          {/* Print header */}
          <div className="hidden concentrado-f-print-header items-center justify-between mb-3 pb-2 border-b-2 border-indigo-600">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-idv.png" alt="IDV" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-sm font-bold text-gray-900">Instituto Don Vasco — Secundaria</h1>
                <p className="text-[10px] text-gray-500">Concentrado de Calificaciones — Ciclo Escolar 2026-2027</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                {selectedGroup?.grade}° &ldquo;{selectedGroup?.letter}&rdquo;
              </p>
              <p className="text-[10px] text-gray-500">
                {filterTitle} — {subjectTitle}
              </p>
            </div>
          </div>

          {/* Semáforo */}
          <div className="flex gap-4 mb-3 text-xs">
            <span className="px-2 py-1 rounded bg-red-100 text-red-800">5-6.9</span>
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">7-7.9</span>
            <span className="px-2 py-1 rounded bg-green-100 text-green-800">8-10</span>
          </div>

          <div className="card overflow-x-auto">
            {/* ── Month view: single period, all subjects ── */}
            {filterMode === "month" && (
              <table className="grade-table">
                <thead>
                  <tr>
                    <th className="w-10">N°</th>
                    <th className="min-w-[180px]">Nombre</th>
                    {displaySubjects.map((s) => (
                      <React.Fragment key={s.id}>
                        <th className={`text-center text-xs border-l border-gray-200 ${!s.counts_for_avg ? "bg-gray-50 text-gray-400 italic" : ""}`}>
                          {s.short_name}
                          {!s.counts_for_avg && <span className="block text-[10px] font-normal not-italic text-gray-400">N/C</span>}
                        </th>
                        <th className={`text-center text-xs w-10 ${!s.counts_for_avg ? "bg-gray-50" : ""}`}>IA</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsForGroup.map((student) => (
                    <tr key={student.id}>
                      <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                      <td className="text-xs font-medium text-gray-900">{formatStudentName(student.full_name)}</td>
                      {displaySubjects.map((s) => {
                        const score = getScore(student.id, s.id, selectedPeriod);
                        const abs = getAbsences(student.id, s.id, selectedPeriod);
                        const comment = getComment(student.id, s.id, selectedPeriod);
                        return (
                          <React.Fragment key={s.id}>
                            <td className={`text-center text-xs tabular-nums border-l border-gray-100 ${semaforoClass(score)} ${comment ? "relative group/c cursor-help" : ""}`}>
                              {fmt(score)}
                              {comment && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full print:hidden" />}
                              {comment && (
                                <div className="absolute z-50 hidden group-hover/c:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[11px] text-left font-normal text-white bg-gray-800 rounded shadow-lg whitespace-pre-wrap max-w-[200px] print:hidden">
                                  {comment}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                                </div>
                              )}
                            </td>
                            <td className="text-center text-xs tabular-nums text-gray-400">{abs || "—"}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Trimester view: periods + average for trimester ── */}
            {filterMode === "trimester" && activeTrimester && (
              <table className="grade-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="w-10">N°</th>
                    <th rowSpan={2} className="min-w-[180px]">Nombre</th>
                    {displaySubjects.map((s) => (
                      <th
                        key={s.id}
                        colSpan={activeTrimester.periods.length * 2 + 2}
                        className={`text-center text-xs border-l border-gray-200 ${!s.counts_for_avg ? "bg-gray-50 text-gray-400 italic" : ""}`}
                      >
                        {s.short_name}
                        {!s.counts_for_avg && <span className="ml-1 text-[10px] font-normal not-italic text-gray-400">(N/C)</span>}
                      </th>
                    ))}
                    <th rowSpan={2} className="w-16 text-center border-l border-gray-300 bg-gray-100">Prom. Trim.</th>
                  </tr>
                  <tr>
                    {displaySubjects.map((s) => (
                      <React.Fragment key={s.id}>
                        {activeTrimester.periods.map((p) => (
                          <React.Fragment key={p}>
                            <th className="text-center text-xs w-12 border-l border-gray-200">{PERIODS.find((pp) => pp.id === p)?.short ?? ""}</th>
                            <th className="text-center text-xs w-10">IA</th>
                          </React.Fragment>
                        ))}
                        <th className="text-center text-xs w-12 border-l border-gray-200 bg-primary-50/50 font-bold">Prom.</th>
                        <th className="text-center text-xs w-10 bg-primary-50/50">IA</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsForGroup.map((student) => {
                    // Trimester general avg across curricular subjects
                    const curAvgs = allSubjects
                      .filter((s) => s.grade === selectedGroup!.grade && s.counts_for_avg)
                      .map((s) => getTrimesterAvg(student.id, s.id, activeTrimester.periods))
                      .filter((a): a is number => a !== null);
                    const trimGenAvg = curAvgs.length > 0 ? curAvgs.reduce((a, b) => a + b, 0) / curAvgs.length : null;
                    return (
                      <tr key={student.id}>
                        <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                        <td className="text-xs font-medium text-gray-900">{formatStudentName(student.full_name)}</td>
                        {displaySubjects.map((s) => {
                          const trimAvg = getTrimesterAvg(student.id, s.id, activeTrimester.periods);
                          const trimAbs = activeTrimester.periods.reduce((sum, p) => sum + getAbsences(student.id, s.id, p), 0);
                          return (
                            <React.Fragment key={s.id}>
                              {activeTrimester.periods.map((p) => {
                                const score = getScore(student.id, s.id, p);
                                const abs = getAbsences(student.id, s.id, p);
                                const comment = getComment(student.id, s.id, p);
                                return (
                                  <React.Fragment key={p}>
                                    <td className={`text-center text-xs tabular-nums border-l border-gray-100 ${semaforoClass(score)} ${comment ? "relative group/c cursor-help" : ""}`}>
                                      {fmt(score)}
                                      {comment && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full print:hidden" />}
                                      {comment && (
                                        <div className="absolute z-50 hidden group-hover/c:block bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[11px] text-left font-normal text-white bg-gray-800 rounded shadow-lg whitespace-pre-wrap max-w-[200px] print:hidden">
                                          {comment}
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center text-xs tabular-nums text-gray-400">{abs || "—"}</td>
                                  </React.Fragment>
                                );
                              })}
                              <td className={`text-center text-xs tabular-nums border-l border-gray-100 font-semibold ${semaforoClass(trimAvg)}`}>{fmt(trimAvg)}</td>
                              <td className="text-center text-xs tabular-nums text-gray-500 font-medium">{trimAbs || "—"}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(trimGenAvg)}`}>{fmt(trimGenAvg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* ── General view: all subjects with final average ── */}
            {filterMode === "general" && (
              <table className="grade-table">
                <thead>
                  <tr>
                    <th className="w-10">N°</th>
                    <th className="min-w-[180px]">Nombre</th>
                    {displaySubjects.map((s) => (
                      <React.Fragment key={s.id}>
                        <th className={`text-center text-xs border-l border-gray-200 ${!s.counts_for_avg ? "bg-gray-50 text-gray-400 italic" : ""}`}>
                          {s.short_name}
                          {!s.counts_for_avg && <span className="block text-[10px] font-normal not-italic text-gray-400">N/C</span>}
                        </th>
                        <th className={`text-center text-xs w-12 ${!s.counts_for_avg ? "bg-gray-50" : ""}`}>IA</th>
                      </React.Fragment>
                    ))}
                    <th className="w-16 text-center border-l border-gray-300 bg-gray-100">Prom. Gral.</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsForGroup.map((student) => {
                    const curAvgs = allSubjects
                      .filter((s) => s.grade === selectedGroup!.grade && s.counts_for_avg)
                      .map((s) => getSubjectFinal(student.id, s.id))
                      .filter((a): a is number => a !== null);
                    const genAvg = curAvgs.length > 0 ? curAvgs.reduce((a, b) => a + b, 0) / curAvgs.length : null;
                    return (
                      <tr key={student.id}>
                        <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                        <td className="text-xs font-medium text-gray-900">{formatStudentName(student.full_name)}</td>
                        {displaySubjects.map((s) => {
                          const final = getSubjectFinal(student.id, s.id);
                          const totalAbs = [1,2,3,4,5,6,7,8].reduce((sum, p) => sum + getAbsences(student.id, s.id, p), 0);
                          return (
                            <React.Fragment key={s.id}>
                              <td className={`text-center text-xs tabular-nums border-l border-gray-100 ${semaforoClass(final)}`}>{fmt(final)}</td>
                              <td className="text-center text-xs tabular-nums text-gray-500">{totalAbs || "—"}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(genAvg)}`}>{fmt(genAvg)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Print footer — signature */}
          <div className="hidden concentrado-f-print-header mt-6 px-4">
            <div className="flex justify-between items-end">
              <div className="text-center">
                <div className="w-48 border-t border-gray-400 pt-1">
                  <p className="text-[9px] font-semibold text-gray-700">Profesor(a)</p>
                </div>
              </div>
              <div className="text-center">
                <div className="w-52 border-t border-gray-400 pt-1">
                  <p className="text-[9px] font-semibold text-gray-700">Lic. Ana Laura Zúñiga García</p>
                  <p className="text-[8px] text-gray-500">Directora de Secundaria</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
