"use client";

import { formatStudentName } from "@/lib/format-name";

import React from "react";

type Subject = {
  id: string;
  name: string;
  short_name: string;
  counts_for_avg: boolean;
  sort_order: number;
};

type GradeEntry = { score: number | null; absences: number };
type GradeMap = Record<string, Record<number, GradeEntry>>;

type Props = {
  students: { id: string; full_name: string; list_num: number }[];
  group: { grade: number; letter: string };
  subjects: Subject[];
  gradeMaps: Record<string, GradeMap>;
};

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", shortName: "1er Trim.", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", shortName: "2do Trim.", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", shortName: "3er Trim.", periods: [5, 6, 7, 8] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept", 2: "Oct", 3: "Nov-Dic", 4: "Ene-Feb",
  5: "Marzo", 6: "Abril", 7: "Mayo", 8: "Junio",
};

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800";
  if (score < 8) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function fmt(n: number | null): string {
  return n !== null ? Math.round(n).toString() : "—";
}

function SingleBoleta({
  student,
  group,
  subjects,
  gradeMap,
}: {
  student: { id: string; full_name: string; list_num: number };
  group: { grade: number; letter: string };
  subjects: Subject[];
  gradeMap: GradeMap;
}) {
  const curricular = subjects.filter((s) => s.counts_for_avg);
  const noCurricular = subjects.filter((s) => !s.counts_for_avg);

  function getScore(subjectId: string, period: number): number | null {
    return gradeMap[subjectId]?.[period]?.score ?? null;
  }

  function getTrimesterAvg(subjectId: string, trimester: { periods: number[] }): number | null {
    const scores = trimester.periods
      .map((p) => getScore(subjectId, p))
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  function getSubjectFinal(subjectId: string): number | null {
    const avgs = TRIMESTERS.map((t) => getTrimesterAvg(subjectId, t)).filter(
      (a): a is number => a !== null
    );
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function getTotalAbsences(subjectId: string): number {
    return [1, 2, 3, 4, 5, 6, 7, 8].reduce(
      (sum, p) => sum + (gradeMap[subjectId]?.[p]?.absences ?? 0),
      0
    );
  }

  const generalAvg = (() => {
    const avgs = curricular
      .map((s) => getSubjectFinal(s.id))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  })();

  function renderRows(list: Subject[]) {
    return list.map((s) => {
      const final = getSubjectFinal(s.id);
      const totalAbs = getTotalAbsences(s.id);
      return (
        <tr key={s.id}>
          <td className="px-1 py-0.5 text-left font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
          {TRIMESTERS.map((t) => (
            <React.Fragment key={t.id}>
              {t.periods.map((p) => (
                <td key={p} className={`text-center tabular-nums border-l border-gray-100 ${semaforoClass(getScore(s.id, p))}`}>
                  {fmt(getScore(s.id, p))}
                </td>
              ))}
              <td className={`text-center font-semibold tabular-nums border-l border-gray-200 ${semaforoClass(getTrimesterAvg(s.id, t))}`}>
                {fmt(getTrimesterAvg(s.id, t))}
              </td>
            </React.Fragment>
          ))}
          <td className={`text-center font-bold tabular-nums border-l-2 border-gray-300 ${semaforoClass(final)}`}>{fmt(final)}</td>
          <td className="text-center tabular-nums text-gray-500 border-l border-gray-100">{totalAbs || "—"}</td>
        </tr>
      );
    });
  }

  return (
    <div className="boleta-single">
      {/* Header */}
      <div className="boleta-header flex items-center justify-between mb-1 pb-1 border-b-2 border-indigo-600">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-idv.png" alt="IDV" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: "9px" }}>Instituto Don Vasco</h1>
            <p className="text-gray-500" style={{ fontSize: "7px" }}>Sección Secundaria</p>
          </div>
        </div>
        <div className="text-center">
          <h2 className="font-semibold text-indigo-700 uppercase tracking-wide" style={{ fontSize: "8px" }}>Boleta de Calificaciones</h2>
          <p className="text-gray-500" style={{ fontSize: "7px" }}>Ciclo Escolar 2026-2027</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900" style={{ fontSize: "9px" }}>{formatStudentName(student.full_name)}</p>
          <p className="text-gray-600" style={{ fontSize: "7px" }}>
            {group.grade}° &ldquo;{group.letter}&rdquo; — N° Lista: {student.list_num}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-2 mb-1 justify-center" style={{ fontSize: "6px" }}>
        <span className="px-1 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Requiere Apoyo (&lt;7)</span>
        <span className="px-1 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">En Desarrollo (7-7.9)</span>
        <span className="px-1 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Nivel Esperado (8+)</span>
      </div>

      {/* Table */}
      <table className="w-full border-collapse boleta-table" style={{ fontSize: "6px" }}>
        <thead>
          <tr className="bg-indigo-50">
            <th rowSpan={2} className="px-1 py-0.5 text-left font-semibold text-indigo-800 uppercase border-b border-indigo-200" style={{ minWidth: "80px" }}>Asignatura</th>
            {TRIMESTERS.map((t) => (
              <th key={t.id} colSpan={t.periods.length + 1} className="text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l border-gray-200 py-0.5">
                {t.shortName}
              </th>
            ))}
            <th rowSpan={2} className="text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l-2 border-gray-300 py-0.5" style={{ width: "28px" }}>Final</th>
            <th rowSpan={2} className="text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l border-gray-100 py-0.5" style={{ width: "22px" }}>IA</th>
          </tr>
          <tr className="bg-indigo-50/60">
            {TRIMESTERS.map((t) => (
              <React.Fragment key={t.id}>
                {t.periods.map((p) => (
                  <th key={p} className="text-center font-medium text-indigo-700 border-b border-indigo-200 border-l border-gray-200 py-0.5" style={{ width: "24px" }}>
                    {PERIOD_NAMES[p]}
                  </th>
                ))}
                <th className="text-center font-bold text-indigo-700 border-b border-indigo-200 border-l border-gray-200 py-0.5 bg-indigo-100/50" style={{ width: "24px" }}>Prom.</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderRows(curricular)}
          <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
            <td className="px-1 py-0.5 text-gray-900">Promedio General</td>
            {TRIMESTERS.map((t) => {
              const trimAvgs = curricular.map((s) => getTrimesterAvg(s.id, t)).filter((a): a is number => a !== null);
              const trimGenAvg = trimAvgs.length > 0 ? trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length : null;
              return (
                <React.Fragment key={t.id}>
                  {t.periods.map((p) => (<td key={p} className="border-l border-gray-200" />))}
                  <td className={`text-center font-bold tabular-nums border-l border-gray-200 ${semaforoClass(trimGenAvg)}`}>{fmt(trimGenAvg)}</td>
                </React.Fragment>
              );
            })}
            <td className={`text-center font-bold tabular-nums border-l-2 border-gray-300 ${semaforoClass(generalAvg)}`}>{fmt(generalAvg)}</td>
            <td className="border-l border-gray-100" />
          </tr>
          {noCurricular.length > 0 && (
            <>
              <tr>
                <td colSpan={100} className="px-1 py-0.5 font-semibold text-gray-400 uppercase bg-gray-50 border-t-2 border-gray-200" style={{ fontSize: "5px" }}>
                  No curriculares
                </td>
              </tr>
              {renderRows(noCurricular)}
            </>
          )}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="mt-3 px-4">
        <div className="flex justify-between items-end">
          <div className="text-center">
            <div style={{ width: "35mm", borderTop: "1px solid #9ca3af", paddingTop: "1px" }}>
              <p className="font-semibold text-gray-800" style={{ fontSize: "7px" }}>Padre / Madre / Tutor</p>
            </div>
          </div>
          <div className="text-center">
            <div style={{ width: "45mm", borderTop: "1px solid #9ca3af", paddingTop: "1px" }}>
              <p className="font-semibold text-gray-800" style={{ fontSize: "7px" }}>Lic. Ana Laura Zúñiga García</p>
              <p className="text-gray-500" style={{ fontSize: "6px" }}>Directora de Secundaria</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoletaAllGroup({ students, group, subjects, gradeMaps }: Props) {
  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .boleta-all-print-area { display: none; }
        }
        @media print {
          @page { size: letter portrait; margin: 5mm 6mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .boleta-all-screen { display: none !important; }
          .boleta-all-print-area { display: block !important; }
          .boleta-single {
            height: 48vh;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .boleta-single + .boleta-single {
            border-top: 1px dashed #999;
            padding-top: 2mm;
          }
          .boleta-page-break {
            page-break-after: always;
          }
        }
      `}} />

      {/* Screen preview */}
      <div className="boleta-all-screen">
        <div className="flex justify-end mb-4">
          <button onClick={handlePrint} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir todas ({students.length} boletas)
          </button>
        </div>
        <div className="space-y-2">
          {students.map((s, i) => (
            <div key={s.id} className="card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-6 text-right">{s.list_num}</span>
                <span className="text-sm font-medium text-gray-900">{formatStudentName(s.full_name)}</span>
              </div>
              <span className="text-xs text-gray-400">Boleta {i + 1} de {students.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Print area: 2 boletas per page */}
      <div className="boleta-all-print-area">
        {students.map((s, i) => (
          <React.Fragment key={s.id}>
            <SingleBoleta
              student={s}
              group={group}
              subjects={subjects}
              gradeMap={gradeMaps[s.id] || {}}
            />
            {/* After every 2nd boleta (odd index), add page break */}
            {i % 2 === 1 && i < students.length - 1 && (
              <div className="boleta-page-break" />
            )}
            {/* If last student is on a first slot (even index), no need for page break */}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
