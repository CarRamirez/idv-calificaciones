"use client";

import { formatStudentName } from "@/lib/format-name";
import { ESCUELA } from "@/lib/escuela";
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
  1: "Sept", 2: "Oct", 3: "Nov-Dic", 4: "Ene-Feb",
  5: "Marzo", 6: "Abril", 7: "Mayo", 8: "Junio",
};

function semaforoClass(score: number | null): string {
  if (score === null) return "";
  if (score < 7) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (score < 8) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
}

function isSumSubject(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("tarea") || lower.includes("inasistencia") || lower.includes("incidencia");
}

function Valor({ v, decimal }: { v: number | null; decimal?: boolean }) {
  return (
    <span className={`inline-block min-w-[1.6rem] rounded px-0.5 sm:min-w-[2.5rem] sm:px-1 py-0.5 text-center font-semibold tabular-nums ${semaforoClass(v)} print:min-w-0`}>
      {v == null ? "—" : decimal ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v).toString()}
    </span>
  );
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
      (sum, p) => sum + getAbsences(subjectId, p), 0
    );
  }

  function getGeneralAvg(): number | null {
    const avgs = curricular
      .map((s) => getSubjectFinal(s.id))
      .filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  const generalAvg = getGeneralAvg();

  function handlePrint() {
    window.print();
  }

  const th = "border border-slate-300 px-1 py-1.5 sm:px-2 dark:border-slate-700 print:border-slate-400";
  const td = "border border-slate-200 px-1 py-1 sm:px-2 dark:border-slate-700 print:border-slate-400";

  return (
    <div>
      {/* ═══ Print CSS ═══ */}
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
            margin: 0 !important;
            padding: 0 !important;
          }
          .boleta-copy, .boleta-copy * { color: #111 !important; }
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
          .boleta-copy .boleta-print-header img { width: 38px !important; height: 38px !important; }
          .boleta-copy .boleta-print-header h1 { font-size: 12px !important; }
          .boleta-copy .boleta-print-header h2 { font-size: 11px !important; text-transform: uppercase !important; }
          .boleta-copy .boleta-print-header p { font-size: 8.5px !important; }
          .boleta-copy .boleta-print-header .text-right p:first-child { font-size: 12px !important; font-weight: 700 !important; }
          .boleta-print-title { display: block !important; }
          .boleta-semaforo-print { display: none !important; }
          .boleta-copy .card { box-shadow: none !important; border: none !important; border-radius: 0 !important; padding: 0 !important; }
          .boleta-copy table { border: 2px solid #333 !important; font-size: 9.5px !important; }
          .boleta-copy td, .boleta-copy th { border: 1px solid #ccc !important; padding: 1px 2px !important; line-height: 1.15 !important; }
          .boleta-copy .col-ia { display: none !important; }
          .boleta-copy .no-curricular-sep { height: 0 !important; max-height: 0 !important; line-height: 0 !important; font-size: 0 !important; overflow: hidden !important; visibility: collapse !important; }
          .boleta-copy .no-curricular-sep td { padding: 0 !important; height: 0 !important; max-height: 0 !important; border-top: none !important; border-bottom: none !important; background: transparent !important; font-size: 0 !important; line-height: 0 !important; overflow: hidden !important; color: transparent !important; }
          .boleta-copy .no-curricular-sep + tr td { border-top: 2.5px solid #333 !important; }
          .boleta-copy .materia-name { width: 180px !important; min-width: 180px !important; max-width: 180px !important; background: #fff !important; border-right: 2px solid #333 !important; font-size: 8.5pt !important; font-weight: 600 !important; padding-left: 4px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .boleta-copy tbody td:nth-child(n+2):nth-child(-n+7),
          .boleta-copy thead tr:nth-child(2) th:nth-child(n+1):nth-child(-n+6) { width: 40px !important; min-width: 40px !important; max-width: 40px !important; text-align: center !important; }
          .boleta-copy tbody td:nth-child(n+8):nth-child(-n+12),
          .boleta-copy thead tr:nth-child(2) th:nth-child(n+7):nth-child(-n+11) { width: 24px !important; min-width: 24px !important; max-width: 24px !important; text-align: center !important; }
          .boleta-copy thead tr:first-child th { background: #fff !important; font-size: 8px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.3px !important; border-bottom: 2px solid #333 !important; }
          .boleta-copy thead tr:first-child th:first-child { background: #fff !important; border-right: 2px solid #333 !important; }
          .boleta-copy thead tr:nth-child(2) th { background: #fff !important; font-size: 7.5px !important; font-weight: 600 !important; }
          .boleta-copy .trim-avg { font-weight: 700 !important; border-right: 2px solid #333 !important; background: rgba(0,0,0,0.05) !important; }
          .boleta-copy .final-col { border-left: 2.5px solid #333 !important; border-right: 2.5px solid #333 !important; font-weight: 800 !important; font-size: 10px !important; background: rgba(0,0,0,0.05) !important; width: 50px !important; min-width: 50px !important; max-width: 50px !important; }
          .boleta-copy tbody tr td:not(.materia-name):not(.trim-avg):not(.final-col) { background: #fff !important; }
          .boleta-copy .prom-general-row, .boleta-copy .prom-general-row td, .boleta-copy tr.prom-general-row { display: none !important; }
          .boleta-signature { display: block !important; }
          .boleta-copy .boleta-signature { margin-top: 1mm !important; }
          .boleta-copy .boleta-signature p { font-size: 7.5px !important; }
          .boleta-copy .boleta-signature .sig-line-inner { border-top: 1.5px solid #333 !important; }
        }
      `}} />

      {/* Botón de impresión */}
      <div className="flex justify-end mb-4 print:hidden">
        <button onClick={handlePrint} className="btn-primary text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>

      {/* Contenido imprimible — 2 copias en impresión */}
      <div ref={printRef} className="print:block">
        {[0, 1].map((copyIdx) => (
        <div key={copyIdx} className={`boleta-copy ${copyIdx === 1 ? "hidden print:block" : ""}`}>

        {/* ── Encabezado estilo SIGEFCP ── */}
        <article className="boleta-hoja card mx-auto max-w-4xl p-3 sm:p-6 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="hidden boleta-print-header items-center justify-between mb-3 pb-3 border-b-2 border-primary-600">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-idv.png" alt={ESCUELA.nombreCorto} className="w-14 h-14 object-contain" />
              <div>
                <h1 className="text-sm font-bold leading-tight">{ESCUELA.nombre}</h1>
                <p className="text-[10px] muted">Secci&oacute;n Secundaria</p>
              </div>
            </div>
            <div className="text-center">
              <h2 className="hidden boleta-print-title text-xs font-semibold texto-marca uppercase tracking-wide">Boleta de Calificaciones</h2>
              <p className="text-[10px] muted mt-0.5">Ciclo Escolar 2026-2027</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{formatStudentName(student.full_name)}</p>
              <p className="text-[10px] muted">
                {group.grade}&deg; &ldquo;{group.letter}&rdquo; &mdash; N&deg; Lista: {student.list_num}
              </p>
            </div>
          </header>

          {/* ── Encabezado pantalla ── */}
          <header className="flex flex-col gap-2 border-b-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 print:hidden border-primary-600 pb-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-idv.png" alt={ESCUELA.nombreCorto} className="h-14 w-auto shrink-0 sm:h-[72px]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest texto-marca">{ESCUELA.nombreCorto}</p>
                <h2 className="text-base font-bold leading-tight sm:text-lg">{ESCUELA.nombre}</h2>
                <p className="text-[11px] muted">Secci&oacute;n Secundaria &middot; Ciclo Escolar 2026-2027</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-bold">Reporte de calificaciones</p>
              <p className="text-[11px] muted">Documento interno &middot; no sustituye la boleta oficial SEP</p>
            </div>
          </header>

          {/* ── Datos del alumno ── */}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4 sm:gap-x-6 sm:gap-y-1 print:hidden">
            <div className="col-span-2">
              <dt className="text-[11px] uppercase muted">Alumno</dt>
              <dd className="font-semibold">{formatStudentName(student.full_name)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase muted">Grado y grupo</dt>
              <dd className="font-semibold">{group.grade}&deg; &ldquo;{group.letter}&rdquo; &middot; N&deg; {student.list_num}</dd>
            </div>
          </dl>

          {/* ── Tabla de calificaciones ── */}
          <table className="mt-4 w-full table-auto border-collapse text-[13px] sm:text-sm print:table-auto print:text-sm">
            <thead className="bg-slate-100 text-xs uppercase dark:bg-slate-800 print:bg-slate-100">
              <tr>
                <th rowSpan={2} className={`${th} text-left`}>Asignatura</th>
                {TRIMESTERS.map((t) => (
                  <th key={t.id} colSpan={t.periods.length + 1} className={`${th} text-center`}>
                    {t.shortName}
                  </th>
                ))}
                <th rowSpan={2} className={`final-col ${th} w-10 text-center sm:w-16 print:w-16`}>Final</th>
                <th rowSpan={2} className={`col-ia ${th} w-8 text-center sm:w-12 print:w-12`}>IA</th>
              </tr>
              <tr className="text-[10px] sm:text-[11px]">
                {TRIMESTERS.map((t) => (
                  <React.Fragment key={t.id}>
                    {t.periods.map((p) => (
                      <th key={`p${p}`} className={`${th} w-8 !px-0 text-center sm:w-12 sm:!px-1 print:w-12`}>{PERIOD_NAMES[p]}</th>
                    ))}
                    <th className={`trim-avg ${th} w-8 !px-0 text-center font-bold sm:w-12 sm:!px-1 print:w-12 bg-slate-200/50 dark:bg-slate-700/50`}>Prom.</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Materias curriculares */}
              {curricular.map((s) => {
                const isSum = isSumSubject(s.name);
                const final = isSum ? getSubjectFinalSum(s.id) : getSubjectFinal(s.id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className={`materia-name ${td} text-[12px] leading-snug font-medium sm:text-sm print:text-sm`}>{s.name}</td>
                    {TRIMESTERS.map((t) => {
                      const trimVal = isSum ? getTrimesterSum(s.id, t) : getTrimesterAvg(s.id, t);
                      return (
                        <React.Fragment key={t.id}>
                          {t.periods.map((p) => (
                            <td key={p} className={`${td} !px-0 text-center sm:!px-1`}>
                              {isSum ? (
                                <span className="text-sm tabular-nums">{getScore(s.id, p) != null ? Math.round(getScore(s.id, p)!) : "—"}</span>
                              ) : (
                                <Valor v={getScore(s.id, p)} />
                              )}
                            </td>
                          ))}
                          <td className={`trim-avg ${td} !px-0 text-center sm:!px-1`}>
                            {isSum ? (
                              <span className="text-sm font-semibold tabular-nums">{trimVal != null ? Math.round(trimVal) : "—"}</span>
                            ) : (
                              <Valor v={trimVal} decimal />
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className={`final-col ${td} text-center`}>
                      {isSum ? (
                        <span className="text-sm font-bold tabular-nums">{final != null ? Math.round(final) : "—"}</span>
                      ) : (
                        <Valor v={final} decimal />
                      )}
                    </td>
                    <td className={`col-ia ${td} text-center text-xs tabular-nums muted`}>
                      {getTotalAbsences(s.id) || "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Separador y materias no curriculares */}
              {noCurricular.length > 0 && (
                <>
                  <tr className="no-curricular-sep">
                    <td colSpan={100} className={`${td} text-[10px] font-semibold uppercase tracking-wide texto-marca bg-slate-50 dark:bg-slate-800/40`}>
                      No curriculares
                    </td>
                  </tr>
                  {noCurricular.map((s) => {
                    const isSum = isSumSubject(s.name);
                    const final = isSum ? getSubjectFinalSum(s.id) : getSubjectFinal(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className={`materia-name ${td} text-[12px] leading-snug font-medium sm:text-sm print:text-sm`}>{s.name}</td>
                        {TRIMESTERS.map((t) => {
                          const trimVal = isSum ? getTrimesterSum(s.id, t) : getTrimesterAvg(s.id, t);
                          return (
                            <React.Fragment key={t.id}>
                              {t.periods.map((p) => (
                                <td key={p} className={`${td} !px-0 text-center sm:!px-1`}>
                                  {isSum ? (
                                    <span className="text-sm tabular-nums">{getScore(s.id, p) != null ? Math.round(getScore(s.id, p)!) : "—"}</span>
                                  ) : (
                                    <Valor v={getScore(s.id, p)} />
                                  )}
                                </td>
                              ))}
                              <td className={`trim-avg ${td} !px-0 text-center sm:!px-1`}>
                                {isSum ? (
                                  <span className="text-sm font-semibold tabular-nums">{trimVal != null ? Math.round(trimVal) : "—"}</span>
                                ) : (
                                  <Valor v={trimVal} decimal />
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`final-col ${td} text-center`}>
                          {isSum ? (
                            <span className="text-sm font-bold tabular-nums">{final != null ? Math.round(final) : "—"}</span>
                          ) : (
                            <Valor v={final} decimal />
                          )}
                        </td>
                        <td className={`col-ia ${td} text-center text-xs tabular-nums muted`}>
                          {getTotalAbsences(s.id) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
            <tfoot className="font-semibold">
              <tr className="prom-general-row bg-slate-50 dark:bg-slate-800/50 print:bg-slate-50">
                <td className={`${td} text-right text-xs uppercase`}>Promedio general</td>
                {TRIMESTERS.map((t) => {
                  const trimAvgs = curricular.map((s) => getTrimesterAvg(s.id, t)).filter((a): a is number => a !== null);
                  const trimGenAvg = trimAvgs.length > 0 ? trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length : null;
                  return (
                    <React.Fragment key={t.id}>
                      {t.periods.map((p) => (
                        <td key={`c${p}`} className={td} />
                      ))}
                      <td className={`trim-avg ${td} !px-0 text-center sm:!px-1`}><Valor v={trimGenAvg} decimal /></td>
                    </React.Fragment>
                  );
                })}
                <td className={`final-col ${td} text-center`}><Valor v={generalAvg} decimal /></td>
                <td className={`col-ia ${td}`} />
              </tr>
            </tfoot>
          </table>

          {/* ── Semáforo + promedio general (pantalla) ── */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="text-sm">Promedio general: <Valor v={generalAvg} decimal /></p>
            <p className="text-[11px] muted">Sem&aacute;foro: rojo &lt; 7 &middot; amarillo 7&ndash;7.9 &middot; verde &ge; 8</p>
          </div>

          {/* ── Firmas (solo impresión) ── */}
          <div className="hidden boleta-signature mt-10 px-6">
            <div className="flex justify-between items-end">
              <div className="text-center">
                <div className="sig-line-inner w-48 border-t border-slate-400 pt-1">
                  <p className="text-[10px] font-semibold">Padre / Madre / Tutor</p>
                </div>
              </div>
              <div className="text-center">
                <div className="sig-line-inner w-56 border-t border-slate-400 pt-1">
                  <p className="text-[10px] font-semibold">Lic. Ana Laura Z&uacute;&ntilde;iga Garc&iacute;a</p>
                  <p className="text-[9px] muted">Directora de Secundaria</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        </div>
        ))}

        {/* ── Julio (Final) — Referencia (solo pantalla) ── */}
        <div className="mt-6 print:hidden">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            Julio (Final) &mdash; Referencia
          </h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className={`${th} text-left text-xs uppercase min-w-[180px]`}>Asignatura</th>
                  <th className={`${th} text-center text-xs uppercase w-20`}>Calificaci&oacute;n</th>
                  <th className={`${th} text-center text-xs uppercase w-16`}>IA</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const julioScore = getScore(s.id, 8);
                  const julioAbs = getAbsences(s.id, 8);
                  if (julioScore === null && julioAbs === 0) return null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className={`${td} text-sm`}>
                        {s.name}
                        {!s.counts_for_avg && <span className="ml-1.5 text-[10px] muted italic">N/C</span>}
                      </td>
                      <td className={`${td} text-center`}>
                        <Valor v={julioScore} />
                      </td>
                      <td className={`${td} text-center text-sm tabular-nums muted`}>
                        {julioAbs || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs muted mt-2">
            Julio (Final) se muestra como referencia &mdash; no se incluye en el promedio final.
          </p>
        </div>
      </div>
    </div>
  );
}
