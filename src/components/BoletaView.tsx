"use client";

import { formatStudentName } from "@/lib/format-name";

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

/** Subjects where we SUM instead of averaging (non-curricular counters) */
function isSumSubject(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("tarea") || lower.includes("inasistencia") || lower.includes("incidencia");
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

  function getTrimesterSum(subjectId: string, trimester: { periods: number[] }): number | null {
    const scores = trimester.periods
      .map((p) => getScore(subjectId, p))
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0);
  }

  function getSubjectFinalSum(subjectId: string): number | null {
    const sums = TRIMESTERS.map((t) => getTrimesterSum(subjectId, t)).filter(
      (s): s is number => s !== null
    );
    if (sums.length === 0) return null;
    return sums.reduce((a, b) => a + b, 0);
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
      const isSum = isSumSubject(s.name);
      const final = isSum ? getSubjectFinalSum(s.id) : getSubjectFinal(s.id);
      const totalAbs = getTotalAbsences(s.id);
      return (
        <tr key={s.id} className="hover:bg-slate-50/50">
          <td className="materia-name px-3 py-2 text-base font-medium text-slate-900 whitespace-nowrap print:px-1 print:py-0.5">
            {s.name}
          </td>
          {TRIMESTERS.map((t) => {
            const trimVal = isSum ? getTrimesterSum(s.id, t) : getTrimesterAvg(s.id, t);
            return (
              <React.Fragment key={t.id}>
                {t.periods.map((p) => (
                  <td
                    key={p}
                    className={`text-center text-sm tabular-nums border-l border-slate-100 print:text-[10px] ${
                      isSum ? "" : semaforoClass(getScore(s.id, p))
                    }`}
                  >
                    {fmt(getScore(s.id, p))}
                  </td>
                ))}
                <td
                  className={`trim-avg text-center text-sm font-semibold tabular-nums border-l border-slate-200 print:text-[10px] ${
                    isSum ? "" : semaforoClass(trimVal)
                  }`}
                >
                  {fmt(trimVal)}
                </td>
              </React.Fragment>
            );
          })}
          <td
            className={`final-col text-center text-sm font-bold tabular-nums border-l-2 border-slate-300 print:text-[10px] ${
              isSum ? "" : semaforoClass(final)
            }`}
          >
            {fmt(final)}
          </td>
          <td className="col-ia text-center text-sm tabular-nums text-slate-500 border-l border-slate-100 print:text-[10px]">
            {totalAbs || "—"}
          </td>
        </tr>
      );
    });
  }

  return (
    <div>
      {/* ═══ Print CSS — Estilo C: Compacta Estructurada (B/N) ═══ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 2mm 5mm;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #fff !important;
            background-color: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── Reset colores: todo B/N ── */
          .boleta-copy,
          .boleta-copy * {
            color: #111 !important;
          }

          /* ── Layout de copia (2 por página) ── */
          .boleta-copy {
            height: calc(50vh - 2mm);
            box-sizing: border-box;
            overflow: hidden;
            page-break-inside: avoid;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          .boleta-copy + .boleta-copy {
            border-top: 1px dashed #666;
            padding-top: 1mm;
            margin-top: 0 !important;
          }

          /* ── Header: recuadro enmarcado con grid ── */
          .boleta-copy .boleta-print-header {
            display: grid !important;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 8px;
            border: 2px solid #333 !important;
            padding: 5px 10px !important;
            margin-bottom: 3px !important;
            background: #fff !important;
          }
          .boleta-copy .boleta-print-header > div:nth-child(2) {
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            padding: 0 12px;
          }
          .boleta-copy .boleta-print-header img {
            width: 38px !important;
            height: 38px !important;
          }
          .boleta-copy .boleta-print-header h1 {
            font-size: 12px !important;
          }
          .boleta-copy .boleta-print-header h2 {
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
          .boleta-copy .boleta-print-header p {
            font-size: 8.5px !important;
          }
          .boleta-copy .boleta-print-header .text-right p:first-child {
            font-size: 12px !important;
            font-weight: 700 !important;
          }
          .boleta-print-title {
            display: block !important;
          }

          /* ── Ocultar leyenda semáforo ── */
          .boleta-semaforo-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* ── Tabla: cuadrícula completa ── */
          .boleta-copy .card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .boleta-copy table {
            border: 2px solid #333 !important;
            font-size: 9.5px !important;
          }
          .boleta-copy td,
          .boleta-copy th {
            border: 1px solid #ccc !important;
            padding: 1px 2px !important;
            line-height: 1.15 !important;
          }

          /* ── Ocultar columna IA en impresión ── */
          .boleta-copy .col-ia {
            display: none !important;
          }

          /* ── Separador grueso entre curriculares y no curriculares ── */
          .boleta-copy .no-curricular-sep {
            height: 0 !important;
            max-height: 0 !important;
            line-height: 0 !important;
            font-size: 0 !important;
            overflow: hidden !important;
            visibility: collapse !important;
          }
          .boleta-copy .no-curricular-sep td {
            padding: 0 !important;
            height: 0 !important;
            max-height: 0 !important;
            border-top: none !important;
            border-bottom: none !important;
            background: transparent !important;
            font-size: 0 !important;
            line-height: 0 !important;
            overflow: hidden !important;
            color: transparent !important;
          }
          .boleta-copy .no-curricular-sep + tr td {
            border-top: 2.5px solid #333 !important;
          }

          /* Columna materia: borde derecho grueso */
          .boleta-copy .materia-name {
            width: 180px !important;
            min-width: 180px !important;
            max-width: 180px !important;
            background: #fff !important;
            border-right: 2px solid #333 !important;
            font-size: 8.5pt !important;
            font-weight: 600 !important;
            padding-left: 4px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          /* ── Anchos por trimestre (iguales 120px c/u) ── */
          /* 1er y 2do Trim: 3 cols x 40px = 120px */
          .boleta-copy tbody td:nth-child(n+2):nth-child(-n+7),
          .boleta-copy thead tr:nth-child(2) th:nth-child(n+1):nth-child(-n+6) {
            width: 40px !important;
            min-width: 40px !important;
            max-width: 40px !important;
            text-align: center !important;
          }
          /* 3er Trim: 5 cols x 24px = 120px */
          .boleta-copy tbody td:nth-child(n+8):nth-child(-n+12),
          .boleta-copy thead tr:nth-child(2) th:nth-child(n+7):nth-child(-n+11) {
            width: 24px !important;
            min-width: 24px !important;
            max-width: 24px !important;
            text-align: center !important;
          }

          /* Encabezados trimestre (fila 1) */
          .boleta-copy thead tr:first-child th {
            background: #fff !important;
            font-size: 8px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            border-bottom: 2px solid #333 !important;
          }
          .boleta-copy thead tr:first-child th:first-child {
            background: #fff !important;
            border-right: 2px solid #333 !important;
          }

          /* Sub-encabezados (fila 2) */
          .boleta-copy thead tr:nth-child(2) th {
            background: #fff !important;
            font-size: 7.5px !important;
            font-weight: 600 !important;
          }

          /* Promedio trimestral: borde derecho grueso + sombreado */
          .boleta-copy .trim-avg {
            font-weight: 700 !important;
            border-right: 2px solid #333 !important;
            background: rgba(0,0,0,0.05) !important;
          }

          /* Columna Final: enmarcada + sombreado */
          .boleta-copy .final-col {
            border-left: 2.5px solid #333 !important;
            border-right: 2.5px solid #333 !important;
            font-weight: 800 !important;
            font-size: 10px !important;
            background: rgba(0,0,0,0.05) !important;
            width: 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
          }

          /* Fondo blanco para celdas normales (promedios sombreados) */
          .boleta-copy tbody tr td:not(.materia-name):not(.trim-avg):not(.final-col) {
            background: #fff !important;
          }

          /* Fila Promedio General - oculta en impresion */
          .boleta-copy .prom-general-row,
          .boleta-copy .prom-general-row td,
          .boleta-copy tr.prom-general-row {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            line-height: 0 !important;
            font-size: 0 !important;
          }



          /* ── Firmas ── */
          .boleta-signature {
            display: block !important;
          }
          .boleta-copy .boleta-signature {
            margin-top: 1mm !important;
          }
          .boleta-copy .boleta-signature p {
            font-size: 7.5px !important;
          }
          .boleta-copy .boleta-signature .sig-line-inner {
            border-top: 1.5px solid #333 !important;
          }
        }
      `}} />

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

      {/* Semáforo leyenda (pantalla) */}
      <div className="flex gap-3 mb-4 text-xs print:hidden">
        <span className="px-2 py-1 rounded bg-red-100 text-red-800">Requiere Apoyo (5-6.9)</span>
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">En Desarrollo (7-7.9)</span>
        <span className="px-2 py-1 rounded bg-green-100 text-green-800">Nivel Esperado (8-10)</span>
      </div>

      {/* Contenido imprimible — pantalla: 1 vez, impresión: 2 copias */}
      <div ref={printRef} className="print:block">
        {[0, 1].map((copyIdx) => (
        <div key={copyIdx} className={`boleta-copy ${copyIdx === 1 ? "hidden print:block" : ""}`}>
        {/* Header para impresión */}
        <div className="hidden boleta-print-header items-center justify-between mb-3 pb-3 border-b-2 border-indigo-600">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-idv.png" alt="Instituto Don Vasco" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Instituto Don Vasco</h1>
              <p className="text-[10px] text-slate-500">Sección Secundaria</p>
            </div>
          </div>
          <div className="text-center">
            <h2 className="hidden boleta-print-title text-xs font-semibold text-indigo-700 uppercase tracking-wide">Boleta de Calificaciones</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Ciclo Escolar 2026-2027</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{formatStudentName(student.full_name)}</p>
            <p className="text-[10px] text-slate-600">
              {group.grade}° &ldquo;{group.letter}&rdquo; — N° Lista: {student.list_num}
            </p>
          </div>
        </div>

        {/* Semáforo leyenda para impresión (oculta en B/N) */}
        <div className="hidden boleta-semaforo-print gap-3 mb-2 text-[8px] justify-center">
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Requiere Apoyo (&lt;7)</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">En Desarrollo (7-7.9)</span>
          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Nivel Esperado (8+)</span>
        </div>

        {/* Tabla principal */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Fila 1: Trimestres agrupados */}
              <tr className="bg-primary-50">
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 min-w-[180px] print:text-[11px] print:px-1 print:py-1"
                >
                  Asignatura
                </th>
                {TRIMESTERS.map((t) => (
                  <th
                    key={t.id}
                    colSpan={t.periods.length + 1}
                    className="text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l border-slate-200 py-2 print:text-[11px] print:py-1"
                  >
                    {t.shortName}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="final-col text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l-2 border-slate-300 w-16 py-2 print:text-[11px] print:py-1 print:w-12"
                >
                  Prom. Final
                </th>
                <th
                  rowSpan={2}
                  className="col-ia text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 border-l border-slate-100 w-12 py-2 print:text-[11px] print:py-1 print:w-10"
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
                        className="text-center text-[11px] font-medium text-primary-700 border-b border-primary-200 border-l border-slate-200 py-1.5 w-14 print:text-[12px] print:py-0.5 print:w-10"
                      >
                        {PERIOD_NAMES[p]}
                      </th>
                    ))}
                    <th className="trim-avg text-center text-[11px] font-bold text-primary-700 border-b border-primary-200 border-l border-slate-200 py-1.5 w-14 bg-primary-100/50 print:text-[12px] print:py-0.5 print:w-10">
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
              <tr className="prom-general-row bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="materia-name px-3 py-2 text-base text-slate-900 print:text-[11px] print:px-1 print:py-0.5">
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
                        <td key={p} className="border-l border-slate-200" />
                      ))}
                      <td
                        className={`trim-avg text-center text-sm font-bold tabular-nums border-l border-slate-200 print:text-[12px] ${semaforoClass(
                          trimGenAvg
                        )}`}
                      >
                        {fmt(trimGenAvg)}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td
                  className={`final-col text-center text-sm font-bold tabular-nums border-l-2 border-slate-300 print:text-[10px] ${semaforoClass(
                    generalAvg
                  )}`}
                >
                  {fmt(generalAvg)}
                </td>
                <td className="col-ia border-l border-slate-100" />
              </tr>

              {/* Separador y materias no curriculares */}
              {noCurricular.length > 0 && (
                <>
                  <tr className="no-curricular-sep">
                    <td
                      colSpan={100}
                      className="px-3 py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-t-2 border-slate-200 print:text-[10px] print:px-1 print:py-1"
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

        {/* Firma directora y padre/tutor - solo impresión */}
        <div className="hidden boleta-signature mt-10 px-6">
          <div className="flex justify-between items-end">
            <div className="text-center">
              <div className="sig-line-inner w-48 border-t border-slate-400 pt-1">
                <p className="text-[10px] font-semibold text-slate-800">Padre / Madre / Tutor</p>
              </div>
            </div>
            <div className="text-center">
              <div className="sig-line-inner w-56 border-t border-slate-400 pt-1">
                <p className="text-[10px] font-semibold text-slate-800">Lic. Ana Laura Zúñiga García</p>
                <p className="text-[9px] text-slate-500">Directora de Secundaria</p>
              </div>
            </div>
          </div>
        </div>

        </div>
        ))}

        {/* Julio (Final) */}
        <div className="mt-6 print:hidden">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
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
                      <td className="px-3 py-1.5 text-sm text-slate-900 border-b border-slate-100">
                        {s.name}
                        {!s.counts_for_avg && (
                          <span className="ml-1.5 text-[10px] text-slate-400 italic">N/C</span>
                        )}
                      </td>
                      <td
                        className={`text-center text-sm tabular-nums border-b border-slate-100 ${semaforoClass(
                          julioScore
                        )}`}
                      >
                        {fmt(julioScore)}
                      </td>
                      <td className="text-center text-sm tabular-nums text-slate-500 border-b border-slate-100">
                        {julioAbs || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2 print:hidden">
            Julio (Final) se muestra como referencia — no se incluye en el promedio final.
          </p>
        </div>
      </div>
    </div>
  );
}
