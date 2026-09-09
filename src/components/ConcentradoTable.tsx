"use client";

import React, { useState } from "react";

const PERIODS = [
  { id: 1, short: "SEPT" },
  { id: 2, short: "OCT" },
  { id: 3, short: "NOV-DIC" },
  { id: 4, short: "ENE-FEB" },
  { id: 5, short: "MAR-ABR" },
  { id: 6, short: "MAYO" },
  { id: 7, short: "JUNIO" },
  { id: 8, short: "JULIO" },
];

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7] },
];

type Subject = { id: string; name: string; short_name: string; counts_for_avg: boolean };
type Student = { id: string; full_name: string; list_num: number };
type GradeEntry = { score: number | null; absences: number };
type GradeMap = Record<string, Record<string, Record<number, GradeEntry>>>;

type Props = {
  subjects: Subject[];
  students: Student[];
  gradeMap: GradeMap;
};

type ViewType = "general" | "t1" | "t2" | "t3";

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800";
  if (score < 8) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function periodShort(id: number): string {
  return PERIODS.find((p) => p.id === id)?.short ?? "";
}

export default function ConcentradoTable({ subjects, students, gradeMap }: Props) {
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

  function getTotalAbsences(studentId: string, subjectId: string): number {
    const subGrades = gradeMap[studentId]?.[subjectId];
    if (!subGrades) return 0;
    return [1, 2, 3, 4, 5, 6, 7, 8].reduce((sum, p) => sum + (subGrades[p]?.absences ?? 0), 0);
  }

  function getTrimAbsences(studentId: string, subjectId: string, periods: number[]): number {
    const subGrades = gradeMap[studentId]?.[subjectId];
    if (!subGrades) return 0;
    return periods.reduce((sum, p) => sum + (subGrades[p]?.absences ?? 0), 0);
  }

  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
  }

  function getAbsences(studentId: string, subjectId: string, period: number): number {
    return gradeMap[studentId]?.[subjectId]?.[period]?.absences ?? 0;
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

      {/* Semáforo */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">5-6.9</span>
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">7-7.9</span>
        <span className="px-2 py-1 rounded bg-green-100 text-green-800">8-10</span>
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
                  <th key={s.id} colSpan={2} className="text-center text-xs border-l border-gray-200">
                    {s.short_name}
                  </th>
                ))}
                <th rowSpan={2} className="w-16 text-center border-l border-gray-300 bg-gray-100">
                  Prom. Gral.
                </th>
              </tr>
              <tr>
                {subjects.map((s) => (
                  <React.Fragment key={s.id}>
                    <th className="text-center text-xs w-14 border-l border-gray-200">Cal.</th>
                    <th className="text-center text-xs w-12">IA</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const genAvg = getGeneralAvg(student.id);
                return (
                  <tr key={student.id}>
                    <td className="text-center text-gray-500 tabular-nums text-xs">{student.list_num}</td>
                    <td className="text-xs font-medium text-gray-900">{student.full_name}</td>
                    {subjects.map((s) => {
                      const curricular = getSubjectCurricular(student.id, s.id);
                      const totalAbs = getTotalAbsences(student.id, s.id);
                      return (
                        <React.Fragment key={s.id}>
                          <td className={`text-center text-xs tabular-nums border-l border-gray-100 ${semaforoClass(curricular)}`}>
                            {curricular !== null ? curricular.toFixed(1) : "—"}
                          </td>
                          <td className="text-center text-xs tabular-nums text-gray-500">
                            {totalAbs || "—"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(genAvg)}`}>
                      {genAvg !== null ? genAvg.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
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
                    colSpan={activeTrimester.periods.length * 2 + 2}
                    className="text-center text-xs border-l border-gray-200"
                  >
                    {s.short_name}
                  </th>
                ))}
                <th rowSpan={3} className="w-16 text-center border-l border-gray-300 bg-gray-100">
                  Prom. Trim.
                </th>
              </tr>
              {/* Row 2: period names spanning Cal + IA each, then Prom + IA */}
              <tr>
                {subjects.map((s) => (
                  <React.Fragment key={s.id}>
                    {activeTrimester.periods.map((p) => (
                      <th key={p} colSpan={2} className="text-center text-xs border-l border-gray-200">
                        {periodShort(p)}
                      </th>
                    ))}
                    <th colSpan={2} className="text-center text-xs border-l border-gray-200 bg-primary-50/50 font-bold">
                      Trimestre
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              {/* Row 3: Cal / IA under each period and under Trimestre */}
              <tr>
                {subjects.map((s) => (
                  <React.Fragment key={s.id}>
                    {activeTrimester.periods.map((p) => (
                      <React.Fragment key={p}>
                        <th className="text-center text-xs w-12 border-l border-gray-200">Cal.</th>
                        <th className="text-center text-xs w-10">IA</th>
                      </React.Fragment>
                    ))}
                    <th className="text-center text-xs w-12 border-l border-gray-200 bg-primary-50/50">Prom.</th>
                    <th className="text-center text-xs w-10 bg-primary-50/50">IA</th>
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
                    <td className="text-xs font-medium text-gray-900">{student.full_name}</td>
                    {subjects.map((s) => {
                      const trimAvg = getTrimesterAvg(student.id, s.id, activeTrimester);
                      const trimAbs = getTrimAbsences(student.id, s.id, activeTrimester.periods);
                      return (
                        <React.Fragment key={s.id}>
                          {activeTrimester.periods.map((p) => {
                            const score = getScore(student.id, s.id, p);
                            const abs = getAbsences(student.id, s.id, p);
                            return (
                              <React.Fragment key={p}>
                                <td className={`text-center text-xs tabular-nums border-l border-gray-100 ${semaforoClass(score)}`}>
                                  {score !== null ? score.toFixed(1) : "—"}
                                </td>
                                <td className="text-center text-xs tabular-nums text-gray-400">
                                  {abs || "—"}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className={`text-center text-xs tabular-nums border-l border-gray-100 font-semibold ${semaforoClass(trimAvg)}`}>
                            {trimAvg !== null ? trimAvg.toFixed(1) : "—"}
                          </td>
                          <td className="text-center text-xs tabular-nums text-gray-500 font-medium">
                            {trimAbs || "—"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`text-center text-xs font-bold tabular-nums border-l border-gray-200 ${semaforoClass(trimGenAvg)}`}>
                      {trimGenAvg !== null ? trimGenAvg.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
