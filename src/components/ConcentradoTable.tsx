"use client";

import { formatStudentName } from "@/lib/format-name";

import React, { useState } from "react";

const PERIODS = [
  { id: 1, short: "SEPT" },
  { id: 2, short: "OCT" },
  { id: 3, short: "NOV-DIC" },
  { id: 4, short: "ENE-FEB" },
  { id: 5, short: "MARZO" },
  { id: 6, short: "MAYO" },
  { id: 7, short: "JUNIO" },
  { id: 8, short: "JULIO" },
];

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7, 8] },
];

type Subject = { id: string; name: string; short_name: string; counts_for_avg: boolean };
type Student = { id: string; full_name: string; list_num: number };
type GradeEntry = { score: number | null; absences: number };
type GradeMap = Record<string, Record<string, Record<number, GradeEntry>>>;

type Props = {
  subjects: Subject[];
  students: Student[];
  gradeMap: GradeMap;
  groupName?: string;
  groupId?: string;
  teacherSubjectIds?: string[] | null;
};

type ViewType = "general" | "t1" | "t2" | "t3";

// Subjects where score = count of infractions (not a grade)
const PENALTY_SUBJECTS = new Set(["TAR", "INAS", "INC"]);

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800";
  if (score < 8) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function penaltyClass(score: number | null): string {
  if (score === null || score === 0) return "";
  if (score <= 2) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function periodShort(id: number): string {
  return PERIODS.find((p) => p.id === id)?.short ?? "";
}

export default function ConcentradoTable({ subjects, students, gradeMap, groupName, groupId, teacherSubjectIds }: Props) {
  // If teacher, filter to only their subjects
  const displaySubjects = teacherSubjectIds
    ? subjects.filter((s) => teacherSubjectIds.includes(s.id))
    : subjects;

  const [view, setView] = useState<ViewType>("general");

  const tabs: { key: ViewType; label: string }[] = [
    { key: "general", label: "General" },
    { key: "t1", label: "1er Trim." },
    { key: "t2", label: "2do Trim." },
    { key: "t3", label: "3er Trim." },
  ];

  function getTrimesterAvg(studentId: string, subjectId: string, trimester: { periods: number[] }): number | null {
    const subGrades = gradeMap[studentId]?.[subjectId];
    if (!subGrades) return null;
    const scores = trimester.periods.map((p) => subGrades[p]?.score).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  function getSubjectCurricular(studentId: string, subjectId: string): number | null {
    const avgs = TRIMESTERS.map((t) => getTrimesterAvg(studentId, subjectId, t)).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function getGeneralAvg(studentId: string): number | null {
    const avgs = subjects
      .filter((s) => s.counts_for_avg)
      .map((s) => getSubjectCurricular(studentId, s.id))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
  }

  // Trimester general average (for trimester view)
  function getTrimGeneralAvg(studentId: string, trimester: { periods: number[] }): number | null {
    const avgs = subjects
      .filter((s) => s.counts_for_avg)
      .map((s) => getTrimesterAvg(studentId, s.id, trimester))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  const activeTrimester = view === "t1" ? TRIMESTERS[0] : view === "t2" ? TRIMESTERS[1] : view === "t3" ? TRIMESTERS[2] : null;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === tab.key
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 mb-2 print:hidden">
        {groupId && (
          <button
            onClick={() => window.open("/api/concentrado/" + groupId + "/excel", "_blank")}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar Excel
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir Concentrado
        </button>
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 6mm 4mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .card { box-shadow: none !important; border: 1px solid #d1d5db !important; }
          .concentrado-print-header { display: flex !important; }
          .concentrado-print-footer { display: block !important; }
          .grade-table { font-size: 11px !important; }
          .grade-table th, .grade-table td { padding: 3px 5px !important; }
        }
      `}} />

      {/* Print header */}
      <div className="hidden concentrado-print-header items-center justify-between mb-3 pb-2 border-b-2 border-indigo-600">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-idv.png" alt="IDV" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-gray-900">Instituto Don Vasco — Secundaria</h1>
            <p className="text-[10px] text-gray-500">Concentrado de Calificaciones — Ciclo Escolar 2026-2027</p>
          </div>
        </div>
        {groupName && (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{groupName}</p>
            <p className="text-[10px] text-gray-500">{students.length} alumno{students.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>

      {/* Semáforo */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">5-6.9</span>
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">7-7.9</span>
        <span className="px-2 py-1 rounded bg-green-100 text-green-800">8-10</span>
        <span className="text-gray-300">|</span>
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">≥3 incump.</span>
        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">1-2 incump.</span>
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 italic">N/C = No curricular</span>
      </div>

      <div className="card overflow-x-auto">
        {/* ============ VISTA GENERAL ============ */}
        {view === "general" && (
          <table className="grade-table">
            <thead>
              <tr>
                <th rowSpan={2} className="w-10">N°</th>
                <th rowSpan={2} className="min-w-[180px]">Nombre</th>
                {subjects.map((s) => (
                  <th key={s.id} className={`text-center text-xs border-l border-gray-200 ${!s.counts_for_avg ? "bg-gray-50 text-gray-400 italic" : ""}`}>
                    {s.short_name}
                    {!s.counts_for_avg && <span className="block text-[10px] font-normal not-italic text-gray-400">N/C</span>}
                  </th>
                ))}
                <th className="w-16 text-center border-l border-gray-300 bg-gray-100">
                  Prom. Gral.
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const genAvg = getGeneralAvg(student.id);
                return (
                  <tr key={student.id}>
                    <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                    <td className="text-xs font-medium text-gray-900">{formatStudentName(student.full_name)}</td>
                    {subjects.map((s) => {
                      const curricular = getSubjectCurricular(student.id, s.id);
                      return (
                        <td key={s.id} className={`text-center text-xs tabular-nums border-l border-gray-100 ${PENALTY_SUBJECTS.has(s.short_name) ? penaltyClass(curricular) : semaforoClass(curricular)}`}>
                          {curricular !== null ? Math.round(curricular).toString() : "—"}
                        </td>
                      );
                    })}
                    <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(genAvg)}`}>
                      {genAvg !== null ? Math.round(genAvg).toString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td colSpan={2} className="text-xs text-gray-700 px-2 py-1">TOTAL INCIDENCIAS</td>
                {subjects.map((s) => {
                  if (!PENALTY_SUBJECTS.has(s.short_name)) {
                    return <td key={s.id} className="border-l border-gray-200" />;
                  }
                  const total = students.reduce((sum, st) => {
                    const c = getSubjectCurricular(st.id, s.id);
                    return sum + (c ?? 0);
                  }, 0);
                  return (
                    <td key={s.id} className="text-center text-xs tabular-nums border-l border-gray-200 text-red-600 font-bold">
                      {total}
                    </td>
                  );
                })}
                <td className="border-l border-gray-300" />
              </tr>
            </tfoot>
          </table>
        )}

        {/* ============ VISTA TRIMESTRAL ============ */}
        {activeTrimester && (
          <table className="grade-table">
            <thead>
              <tr>
                <th rowSpan={3} className="w-10">N°</th>
                <th rowSpan={3} className="min-w-[180px]">Nombre</th>
                {subjects.map((s) => (
                  <th
                    key={s.id}
                    colSpan={activeTrimester.periods.length + 1}
                    className={`text-center text-xs border-l border-gray-200 ${!s.counts_for_avg ? "bg-gray-50 text-gray-400 italic" : ""}`}
                  >
                    {s.short_name}
                    {!s.counts_for_avg && <span className="ml-1 text-[10px] font-normal not-italic text-gray-400">(N/C)</span>}
                  </th>
                ))}
                <th rowSpan={2} className="w-16 text-center border-l border-gray-300 bg-gray-100">
                  Prom. Trim.
                </th>
              </tr>
              {/* Row 2: period names + Prom */}
              <tr>
                {subjects.map((s) => (
                  <React.Fragment key={s.id}>
                    {activeTrimester.periods.map((p) => (
                      <th key={p} className="text-center text-xs w-12 border-l border-gray-200">
                        {periodShort(p)}
                      </th>
                    ))}
                    <th className="text-center text-xs w-12 border-l border-gray-200 bg-primary-50/50 font-bold">Prom.</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const trimGenAvg = getTrimGeneralAvg(student.id, activeTrimester);
                return (
                  <tr key={student.id}>
                    <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                    <td className="text-xs font-medium text-gray-900">{formatStudentName(student.full_name)}</td>
                    {subjects.map((s) => {
                      const trimAvg = getTrimesterAvg(student.id, s.id, activeTrimester);
                      return (
                        <React.Fragment key={s.id}>
                          {activeTrimester.periods.map((p) => {
                            const score = getScore(student.id, s.id, p);
                            return (
                              <td key={p} className={`text-center text-xs tabular-nums border-l border-gray-100 ${PENALTY_SUBJECTS.has(s.short_name) ? penaltyClass(score) : semaforoClass(score)}`}>
                                {score !== null ? Math.round(score).toString() : "—"}
                              </td>
                            );
                          })}
                          <td className={`text-center text-xs tabular-nums border-l border-gray-100 font-semibold ${PENALTY_SUBJECTS.has(s.short_name) ? penaltyClass(trimAvg) : semaforoClass(trimAvg)}`}>
                            {trimAvg !== null ? Math.round(trimAvg).toString() : "—"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(trimGenAvg)}`}>
                      {trimGenAvg !== null ? Math.round(trimGenAvg).toString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td colSpan={2} className="text-xs text-gray-700 px-2 py-1">TOTAL INCIDENCIAS</td>
                {subjects.map((s) => {
                  if (!PENALTY_SUBJECTS.has(s.short_name)) {
                    return (
                      <React.Fragment key={s.id}>
                        {activeTrimester!.periods.map((p) => (
                          <td key={p} className="border-l border-gray-200" />
                        ))}
                        <td className="border-l border-gray-200" />
                      </React.Fragment>
                    );
                  }
                  return (
                    <React.Fragment key={s.id}>
                      {activeTrimester!.periods.map((p) => {
                        const periodTotal = students.reduce((sum, st) => sum + (getScore(st.id, s.id, p) ?? 0), 0);
                        return (
                          <td key={p} className="text-center text-xs tabular-nums border-l border-gray-100 text-red-600 font-bold">
                            {periodTotal > 0 ? periodTotal : ""}
                          </td>
                        );
                      })}
                      {(() => {
                        const trimTotal = students.reduce((sum, st) => {
                          const avg = getTrimesterAvg(st.id, s.id, activeTrimester!);
                          return sum + (avg ?? 0);
                        }, 0);
                        return (
                          <td className="text-center text-xs tabular-nums border-l border-gray-100 text-red-600 font-bold">
                            {trimTotal > 0 ? Math.round(trimTotal) : ""}
                          </td>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
                <td className="border-l border-gray-300" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Print footer — signature */}
      <div className="hidden concentrado-print-footer mt-6 px-4">
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
    </div>
  );
}
