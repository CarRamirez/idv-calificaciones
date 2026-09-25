"use client";

import { formatStudentName } from "@/lib/format-name";

type Student = { id: string; full_name: string; list_num: number };

type Props = {
  students: Student[];
  groupName: string;
  subjectName?: string;
  teacherName?: string;
};

const NUM_COLUMNS = 30;

export default function ListaAlumnos({ students, groupName, subjectName, teacherName }: Props) {
  const cols = Array.from({ length: NUM_COLUMNS }, (_, i) => i + 1);

  return (
    <div>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 8mm 6mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .card { box-shadow: none !important; border: none !important; padding: 0 !important; }
          .lista-print-header { display: flex !important; }
          .lista-grid-wrapper { overflow: visible !important; }
          .lista-grid-wrapper table { font-size: 9px !important; }
          .lista-grid-wrapper th, .lista-grid-wrapper td { padding: 1px 2px !important; }
          .lista-grid-wrapper .col-num { width: 22px !important; min-width: 22px !important; }
          .lista-grid-wrapper .col-name { width: auto !important; min-width: 120px !important; max-width: 200px !important; }
          .lista-grid-wrapper .col-mark { width: 18px !important; min-width: 18px !important; max-width: 18px !important; }
        }
      `}} />

      {/* Print button */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimir Lista
        </button>
      </div>

      {/* Print header */}
      <div className="hidden lista-print-header items-center justify-between mb-3 pb-2 border-b-2 border-gray-800">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-idv.png" alt="IDV" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-gray-900">Instituto Don Vasco — Secundaria</h1>
            <p className="text-[10px] text-gray-600">Ciclo Escolar 2026-2027</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-gray-900">Grado: {groupName}</p>
          <p className="text-[10px] text-gray-500">{students.length} alumno{students.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Info line for print */}
      <div className="hidden print:flex justify-between mb-2 text-[10px] text-gray-600">
        <p>Asignatura: {subjectName || "____________________"}</p>
        <p>Profesor(a): {teacherName || "____________________"}</p>
      </div>

      {/* ── Screen view (card style) ── */}
      <div className="card overflow-hidden print:hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-primary-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 w-14">
                N°
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200">
                Nombre del Alumno
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-3 py-2 text-center text-sm font-medium text-gray-500 tabular-nums">
                  {s.list_num}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                  {formatStudentName(s.full_name)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print view (grid with numbered columns) ── */}
      <div className="hidden print:block lista-grid-wrapper">
        <table className="w-full border-collapse" style={{ fontSize: "9px" }}>
          <thead>
            <tr>
              <th className="col-num border border-gray-800 bg-gray-100 text-center font-bold p-1">
                N°
              </th>
              <th className="col-name border border-gray-800 bg-gray-100 text-left font-bold p-1 pl-2">
                NOMBRE DEL ALUMNO
              </th>
              {cols.map((n) => (
                <th key={n} className="col-mark border border-gray-800 bg-gray-100 text-center font-semibold p-0" style={{ fontSize: "7px" }}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="col-num border border-gray-600 text-center font-semibold p-1 tabular-nums">
                  {s.list_num}
                </td>
                <td className="col-name border border-gray-600 p-1 pl-2 font-medium whitespace-nowrap overflow-hidden" style={{ textOverflow: "ellipsis" }}>
                  {formatStudentName(s.full_name)}
                </td>
                {cols.map((n) => (
                  <td key={n} className="col-mark border border-gray-400 p-0">&nbsp;</td>
                ))}
              </tr>
            ))}
            {/* Empty rows to fill page */}
            {Array.from({ length: Math.max(0, 35 - students.length) }, (_, i) => (
              <tr key={`empty-${i}`}>
                <td className="col-num border border-gray-600 text-center p-1 tabular-nums text-gray-400">
                  {students.length + i + 1}
                </td>
                <td className="col-name border border-gray-600 p-1">&nbsp;</td>
                {cols.map((n) => (
                  <td key={n} className="col-mark border border-gray-400 p-0">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-3 print:hidden">
        La lista se imprime en formato horizontal con 30 columnas para registro de asistencia, tareas u observaciones.
      </p>
    </div>
  );
}
