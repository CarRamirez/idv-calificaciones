"use client";

import { formatStudentName } from "@/lib/format-name";

import React from "react";
import Link from "next/link";

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

function isSumSubject(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("tarea") || lower.includes("inasistencia") || lower.includes("incidencia");
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
      const isSum = isSumSubject(s.name);
      const final = isSum ? getSubjectFinalSum(s.id) : getSubjectFinal(s.id);
      const totalAbs = getTotalAbsences(s.id);
      return (
        <tr key={s.id}>
          <td className="materia-name px-1 py-0.5 text-left font-semibold text-slate-900 whitespace-nowrap" style={{ fontSize: "15px" }}>{s.name}</td>
          {TRIMESTERS.map((t) => {
            const trimVal = isSum ? getTrimesterSum(s.id, t) : getTrimesterAvg(s.id, t);
            return (
              <React.Fragment key={t.id}>
                {t.periods.map((p) => (
                  <td key={p} className={`text-center tabular-nums border-l border-slate-100 ${isSum ? "" : semaforoClass(getScore(s.id, p))}`}>
                    {fmt(getScore(s.id, p))}
                  </td>
                ))}
                <td className={`trim-avg text-center font-semibold tabular-nums border-l border-slate-200 ${isSum ? "" : semaforoClass(trimVal)}`}>
                  {fmt(trimVal)}
                </td>
              </React.Fragment>
            );
          })}
          <td className={`final-col text-center font-bold tabular-nums border-l-2 border-slate-300 ${isSum ? "" : semaforoClass(final)}`}>{fmt(final)}</td>
          <td className="col-ia text-center tabular-nums text-slate-500 border-l border-slate-100">{totalAbs || "—"}</td>
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
            <h1 className="font-bold text-slate-900 leading-tight" style={{ fontSize: "14px" }}>Instituto Don Vasco</h1>
            <p className="text-slate-500" style={{ fontSize: "11px" }}>Sección Secundaria</p>
          </div>
        </div>
        <div className="text-center">
          <h2 className="hidden boleta-print-title font-semibold text-indigo-700 uppercase tracking-wide" style={{ fontSize: "13px" }}>Boleta de Calificaciones</h2>
          <p className="text-slate-500" style={{ fontSize: "11px" }}>Ciclo Escolar 2026-2027</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900" style={{ fontSize: "14px" }}>{formatStudentName(student.full_name)}</p>
          <p className="text-slate-600" style={{ fontSize: "11px" }}>
            {group.grade}° &ldquo;{group.letter}&rdquo; — N° Lista: {student.list_num}
          </p>
        </div>
      </div>

      {/* Legend - hidden in print (grayscale) */}
      <div className="flex gap-2 mb-1 justify-center print-hide-legend" style={{ fontSize: "8px" }}>
        <span className="px-1 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Requiere Apoyo (&lt;7)</span>
        <span className="px-1 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">En Desarrollo (7-7.9)</span>
        <span className="px-1 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Nivel Esperado (8+)</span>
      </div>

      {/* Table */}
      <table className="w-full border-collapse boleta-table" style={{ fontSize: "13px" }}>
        <thead>
          <tr className="bg-indigo-50">
            <th rowSpan={2} className="px-1 py-0.5 text-left font-semibold text-indigo-800 uppercase border-b border-indigo-200" style={{ minWidth: "120px" }}>Asignatura</th>
            {TRIMESTERS.map((t) => (
              <th key={t.id} colSpan={t.periods.length + 1} className="text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l border-slate-200 py-0.5">
                {t.shortName}
              </th>
            ))}
            <th rowSpan={2} className="final-col text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l-2 border-slate-300 py-0.5" style={{ width: "28px" }}>Final</th>
            <th rowSpan={2} className="col-ia text-center font-semibold text-indigo-800 uppercase border-b border-indigo-200 border-l border-slate-100 py-0.5" style={{ width: "22px" }}>IA</th>
          </tr>
          <tr className="bg-indigo-50/60">
            {TRIMESTERS.map((t) => (
              <React.Fragment key={t.id}>
                {t.periods.map((p) => (
                  <th key={p} className="text-center font-medium text-indigo-700 border-b border-indigo-200 border-l border-slate-200 py-0.5" style={{ width: "24px" }}>
                    {PERIOD_NAMES[p]}
                  </th>
                ))}
                <th className="trim-avg text-center font-bold text-indigo-700 border-b border-indigo-200 border-l border-slate-200 py-0.5 bg-indigo-100/50" style={{ width: "24px" }}>Prom.</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderRows(curricular)}
          <tr className="prom-general-row bg-slate-100 font-bold border-t-2 border-slate-300">
            <td className="materia-name px-1 py-0.5 text-slate-900 font-bold" style={{ fontSize: "14px" }}>Promedio General</td>
            {TRIMESTERS.map((t) => {
              const trimAvgs = curricular.map((s) => getTrimesterAvg(s.id, t)).filter((a): a is number => a !== null);
              const trimGenAvg = trimAvgs.length > 0 ? trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length : null;
              return (
                <React.Fragment key={t.id}>
                  {t.periods.map((p) => (<td key={p} className="border-l border-slate-200" />))}
                  <td className={`trim-avg text-center font-bold tabular-nums border-l border-slate-200 ${semaforoClass(trimGenAvg)}`}>{fmt(trimGenAvg)}</td>
                </React.Fragment>
              );
            })}
            <td className={`final-col text-center font-bold tabular-nums border-l-2 border-slate-300 ${semaforoClass(generalAvg)}`}>{fmt(generalAvg)}</td>
            <td className="col-ia border-l border-slate-100" />
          </tr>
          {noCurricular.length > 0 && (
            <>
              <tr className="no-curricular-sep">
                <td colSpan={100} className="px-1 py-0.5 font-semibold text-slate-400 uppercase bg-slate-50 border-t-2 border-slate-200" style={{ fontSize: "11px" }}>
                  No curriculares
                </td>
              </tr>
              {renderRows(noCurricular)}
            </>
          )}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="boleta-signature mt-3 px-4">
        <div className="flex justify-between items-end">
          <div className="text-center">
            <div className="sig-line-inner" style={{ width: "35mm", borderTop: "1px solid #9ca3af", paddingTop: "1px" }}>
              <p className="font-semibold text-slate-800" style={{ fontSize: "11px" }}>Padre / Madre / Tutor</p>
            </div>
          </div>
          <div className="text-center">
            <div className="sig-line-inner" style={{ width: "45mm", borderTop: "1px solid #9ca3af", paddingTop: "1px" }}>
              <p className="font-semibold text-slate-800" style={{ fontSize: "11px" }}>Lic. Ana Laura Zúñiga García</p>
              <p className="text-slate-500" style={{ fontSize: "10px" }}>Directora de Secundaria</p>
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
      {/* ═══ Print CSS — Estilo C: Compacta Estructurada (B/N) ═══ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .boleta-all-print-area { display: none; }
        }
        @media print {
          @page { size: letter portrait; margin: 4mm 5mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .boleta-all-screen { display: none !important; }
          .boleta-all-print-area { display: block !important; }

          /* ── Reset colores: todo B/N ── */
          .boleta-single,
          .boleta-single * {
            color: #111 !important;
          }

          /* ── Layout de copia (2 por página) ── */
          .boleta-single {
            height: 49vh;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .boleta-single + .boleta-single {
            border-top: 1px dashed #666;
            padding-top: 1mm;
          }

          /* ── Header: recuadro enmarcado con grid ── */
          .boleta-single .boleta-header {
            display: grid !important;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 8px;
            border: 2px solid #333 !important;
            padding: 5px 10px !important;
            margin-bottom: 3px !important;
            background: #fff !important;
          }
          .boleta-single .boleta-header > div:nth-child(2) {
            border-left: 1px solid #ccc;
            border-right: 1px solid #ccc;
            padding: 0 12px;
          }
          .boleta-single .boleta-header img {
            width: 38px !important;
            height: 38px !important;
          }
          .boleta-single .boleta-header h1 {
            font-size: 12px !important;
          }
          .boleta-single .boleta-header h2 {
            font-size: 11px !important;
            text-transform: uppercase !important;
          }
          .boleta-single .boleta-header p {
            font-size: 8.5px !important;
          }
          .boleta-single .boleta-header .text-right p:first-child {
            font-size: 12px !important;
            font-weight: 700 !important;
          }
          .boleta-print-title {
            display: block !important;
          }

          /* ── Ocultar leyenda semáforo ── */
          .print-hide-legend {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* ── Tabla: cuadrícula completa ── */
          .boleta-single table {
            border: 2px solid #333 !important;
            font-size: 9.5px !important;
          }
          .boleta-single td,
          .boleta-single th {
            border: 1px solid #ccc !important;
            padding: 1px 2px !important;
            line-height: 1.15 !important;
          }

          /* ── Ocultar columna IA en impresión ── */
          .boleta-single .col-ia {
            display: none !important;
          }

          /* ── Ocultar leyenda "No curriculares" ── */
          .boleta-single .no-curricular-sep {
            display: none !important;
          }

          /* Columna materia: borde derecho grueso */
          .boleta-single .materia-name {
            background: #fff !important;
            border-right: 2px solid #333 !important;
            font-size: 8.5pt !important;
            font-weight: 600 !important;
            padding-left: 4px !important;
            white-space: nowrap !important;
          }

          .boleta-single td:not(.materia-name):not(.final-col),
          .boleta-single th:not(:first-child):not(.final-col):not(.col-ia) {
            width: 32px !important;
            min-width: 32px !important;
            max-width: 32px !important;
            text-align: center !important;
          }

          /* Encabezados trimestre (fila 1) */
          .boleta-single thead tr:first-child th {
            background: #fff !important;
            font-size: 8px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            border-bottom: 2px solid #333 !important;
          }
          .boleta-single thead tr:first-child th:first-child {
            background: #fff !important;
            border-right: 2px solid #333 !important;
          }

          /* Sub-encabezados (fila 2) */
          .boleta-single thead tr:nth-child(2) th {
            background: #fff !important;
            font-size: 7.5px !important;
            font-weight: 600 !important;
          }

          /* Promedio trimestral: borde derecho grueso */
          .boleta-single .trim-avg {
            font-weight: 700 !important;
            border-right: 2px solid #333 !important;
          }

          /* Columna Final: enmarcada con bordes gruesos */
          .boleta-single .final-col {
            border-left: 2.5px solid #333 !important;
            border-right: 2.5px solid #333 !important;
            font-weight: 800 !important;
            font-size: 10px !important;
            width: 42px !important;
            min-width: 42px !important;
            max-width: 42px !important;
          }

          /* Zebra striping — fondo blanco para todas */
          .boleta-single tbody tr td:not(.materia-name) {
            background: #fff !important;
          }

          /* Fila Promedio General */
          .boleta-single .prom-general-row td {
            border-top: 2.5px solid #333 !important;
            font-weight: 700 !important;
            background: #fff !important;
            font-size: 9.5px !important;
          }
          .boleta-single .prom-general-row td:first-child {
            border-right: 2px solid #333 !important;
          }

          /* Separador No Curriculares (oculto, ver regla arriba) */
          .boleta-single .no-curricular-sep td {
            background: #fff !important;
            border-top: 2px solid #333 !important;
            font-size: 7px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
          }

          /* ── Firmas ── */
          .boleta-single .boleta-signature p {
            font-size: 7.5px !important;
          }
          .boleta-single .boleta-signature .sig-line-inner {
            border-top: 1.5px solid #333 !important;
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir todas ({students.length} boletas)
          </button>
        </div>
        <div className="space-y-2">
          {students.map((s, i) => (
            <Link
              key={s.id}
              href={`/boleta/${s.id}`}
              className="card p-3 flex items-center justify-between hover:bg-primary-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold tabular-nums">
                  {s.list_num}
                </span>
                <span className="text-sm font-medium text-slate-900 group-hover:text-primary-700">
                  {formatStudentName(s.full_name)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Boleta {i + 1} de {students.length}</span>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Print area: same student twice per page (parent copy + school copy) */}
      <div className="boleta-all-print-area">
        {students.map((s, i) => (
          <React.Fragment key={s.id}>
            {/* First copy — for parents */}
            <SingleBoleta
              student={s}
              group={group}
              subjects={subjects}
              gradeMap={gradeMaps[s.id] || {}}
            />
            {/* Second copy — for school (signed by parent) */}
            <SingleBoleta
              student={s}
              group={group}
              subjects={subjects}
              gradeMap={gradeMaps[s.id] || {}}
            />
            {/* Page break after each student (except the last) */}
            {i < students.length - 1 && (
              <div className="boleta-page-break" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
