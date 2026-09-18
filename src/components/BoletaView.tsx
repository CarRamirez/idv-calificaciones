"use client";

import React, { useRef } from "react";

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
  student: { id: string; full_name: string; list_num: number };
  group: { grade: number; letter: string };
  subjects: Subject[];
  gradeMap: GradeMap;
};

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", shortName: "1er Trim.", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", shortName: "2do Trim.", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", shortName: "3er Trim.", periods: [5, 6, 7, 8] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept",
  2: "Oct",
  3: "Nov-Dic",
  4: "Ene-Feb",
  5: "Marzo",
  6: "Abril",
  7: "Mayo",
  8: "Junio",
};

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800";
  if (score < 8) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

function semaforoBorder(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "border-red-200";
  if (score < 8) return "border-yellow-200";
  return "border-green-200";
}

export default function BoletaView({ student, group, subjects, gradeMap }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const curricular = subjects.filter((s) => s.counts_for_avg);
  const noCurricular = subjects.filter((s) => !s.counts_for_avg);

  function getScore(subjectId: string, period: number): number | null {
    return gradeMap[subjectId]?.[period]?.score ?? null;
  }

  function getAbsences(subjectId: string, period: number): number {
    return gradeMap[subjectId]?.[period]?.absences ?? 0;
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
      (sum, p) => sum + getAbsences(subjectId, p),
      0
    );
  }

  function getGeneralAvg(): number | null {
    const avgs = curricular
      .map((s) => getSubjectFinal(s.id))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function fmt(n: number | null): string {
    return n !== null ? Math.round(n).toString() : "—";
  }

  const generalAvg = getGeneralAvg();

  function handlePrint() {
    window.print();
  }

  function renderSubjectRows(subjectList: Subject[]) {
    return subjectList.map((s) => {
      const final = getSubjectFinal(s.id);
      const totalAbs = getTotalAbsences(s.id);
      return (
        <tr key={s.id} className="hover:bg-gray-50/50">
          <td className="px-3 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
            {s.name}
          </td>
          {TRIMESTERS.map((t) => (
            <React.Fragment key={t.id}>
              {t.periods.map((p) => (
                <td
                  key={p}
                  className={`text-center text-sm tabular-nums border-l border-gray-100 ${semaforoClass(
                    getScore(s.id, p)
                  )}`}
                >
                  {fmt(getScore(s.id, p))}
                </td>
              ))}
              <td
                className={`text-center text-sm font-semibold tabular-nums border-l border-gray-200 ${semaforoClass(
                  getTrimesterAvg(s.id, t)
                )}`}
              >
                {fmt(getTrimesterAvg(s.id, t))}
              </td>
            </React.Fragment>
          ))}
          <td
            className={`text-center text-sm font-bold tabular-nums border-l-2 border-gray-300 ${semaforoClass(
              final
            )}`}
          >
            {fmt(final)}
          </td>
          <td className="text-center text-sm tabular-nums text-gray-500 border-l border-gray-100">
            {totalAbs || "—"}
          </td>
        </tr>
      );
    });
  }

  return (
    <div>
      {/* Botón de impresión/PDF */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimir / PDF
        </button>
      </div>

      {/* Semáforo leyenda */}
      <div className="flex gap-3 mb-4 text-xs print:hidden">
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">Requiere Apoyo (5-6.9)</span>
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">En Desarrollo (7-7.9)</span>
        <span className="px-2 py-1 rounded bg-green-100 text-green-800">Nivel Esperado (8-10)</span>
      </div>

      {/* Contenido imprimible */}
      <div ref={printRef}>
        {/* Header para impresión */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-lg font-bold">Instituto Don Vasco</h1>
          <p className="text-sm text-gray-600">Boleta de Calificaciones — Ciclo Escolar 2026-2027</p>
          <div className="mt-2 text-sm">
            <span className="font-semibold">{student.full_name}</span>
            <span className="mx-2">·</span>
            <span>{group.grade}° {group.letter}</span>
            <span className="mx-2">·</span>
            <span>N° Lista: {student.list_num}</span>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Fila 1: Trimestres agrupados */}
              <tr className="bg-primary-50">
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 min-w-[180px]"
                >
                  Asignatura
                </th>
                {TRIMESTERS.map((t) => (
                  <th
                    key={t.id}
                    colSpan={t.periods.length + 1}
                    className="text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l border-gray-200 py-2"
                  >
                    {t.shortName}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l-2 border-gray-300 w-16 py-2"
                >
                  Prom. Final
                </th>
                <th
                  rowSpan={2}
                  className="text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l border-gray-100 w-12 py-2"
                >
                  IA
                </th>
              </tr>
              {/* Fila 2: Periodos individuales + Prom. Trimestral */}
              <tr className="bg-primary-50/60">
                {TRIMESTERS.map((t) => (
                  <React.Fragment key={t.id}>
                    {t.periods.map((p) => (
                      <th
                        key={p}
                        className="text-center text-[11px] font-medium text-primary-700 border-b border-primary-200 border-l border-gray-200 py-1.5 w-14"
                      >
                        {PERIOD_NAMES[p]}
                      </th>
                    ))}
                    <th className="text-center text-[11px] font-bold text-primary-700 border-b border-primary-200 border-l border-gray-200 py-1.5 w-14 bg-primary-100/50">
                      Prom.
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Materias curriculares */}
              {renderSubjectRows(curricular)}

              {/* Fila de promedio general */}
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td className="px-3 py-2 text-sm text-gray-900">
                  Promedio General
                </td>
                {TRIMESTERS.map((t) => {
                  const trimAvgs = curricular
                    .map((s) => getTrimesterAvg(s.id, t))
                    .filter((a): a is number => a !== null);
                  const trimGenAvg =
                    trimAvgs.length > 0
                      ? trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length
                      : null;
                  return (
                    <React.Fragment key={t.id}>
                      {t.periods.map((p) => (
                        <td key={p} className="border-l border-gray-200" />
                      ))}
                      <td
                        className={`text-center text-sm font-bold tabular-nums border-l border-gray-200 ${semaforoClass(
                          trimGenAvg
                        )}`}
                      >
                        {fmt(trimGenAvg)}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td
                  className={`text-center text-sm font-bold tabular-nums border-l-2 border-gray-300 ${semaforoClass(
                    generalAvg
                  )}`}
                >
                  {fmt(generalAvg)}
                </td>
                <td className="border-l border-gray-100" />
              </tr>

              {/* Separador y materias no curriculares */}
              {noCurricular.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={100}
                      className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t-2 border-gray-200"
                    >
                      No curriculares — no abonan al promedio
                    </td>
                  </tr>
                  {renderSubjectRows(noCurricular)}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Julio (Final) */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Julio (Final) — Referencia
          </h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-amber-50">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider border-b border-amber-200 min-w-[180px]">
                    Asignatura
                  </th>
                  <th className="text-center text-xs font-semibold text-amber-800 uppercase tracking-wider border-b border-amber-200 w-20">
                    Calificación
                  </th>
                  <th className="text-center text-xs font-semibold text-amber-800 uppercase tracking-wider border-b border-amber-200 w-16">
                    IA
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const julioScore = getScore(s.id, 8);
                  const julioAbs = getAbsences(s.id, 8);
                  if (julioScore === null && julioAbs === 0) return null;
                  return (
                    <tr key={s.id} className="hover:bg-amber-50/30">
                      <td className="px-3 py-1.5 text-sm text-gray-900 border-b border-gray-100">
                        {s.name}
                        {!s.counts_for_avg && (
                          <span className="ml-1.5 text-[10px] text-gray-400 italic">N/C</span>
                        )}
                      </td>
                      <td
                        className={`text-center text-sm tabular-nums border-b border-gray-100 ${semaforoClass(
                          julioScore
                        )}`}
                      >
                        {fmt(julioScore)}
                      </td>
                      <td className="text-center text-sm tabular-nums text-gray-500 border-b border-gray-100">
                        {julioAbs || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 print:hidden">
            Julio (Final) se muestra como referencia — no se incluye en el promedio final.
          </p>
        </div>
      </div>
    </div>
  );
}
