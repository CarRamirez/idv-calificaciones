"use client";

type Student = { id: string; full_name: string; list_num: number };

type Props = {
  students: Student[];
  groupName: string;
};

export default function ListaAlumnos({ students, groupName }: Props) {
  return (
    <div>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 12mm 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .card { box-shadow: none !important; border: 1px solid #d1d5db !important; }
          .lista-print-header { display: flex !important; }
        }
      `}} />

      {/* Print button */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => window.print()}
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
          Imprimir Lista
        </button>
      </div>

      {/* Print header */}
      <div className="hidden lista-print-header items-center justify-between mb-4 pb-3 border-b-2 border-indigo-600">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-idv.png" alt="IDV" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Instituto Don Vasco — Secundaria</h1>
            <p className="text-xs text-gray-500">Lista de Asistencia — Ciclo Escolar 2026-2027</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{groupName}</p>
          <p className="text-xs text-gray-500">{students.length} alumno{students.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Date line for print */}
      <div className="hidden print:flex justify-between mb-3 text-xs text-gray-500">
        <p>Fecha: ____________________</p>
        <p>Materia: ____________________</p>
        <p>Profesor(a): ____________________</p>
      </div>

      {/* Student list table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-primary-50 print:bg-gray-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 w-14 print:text-gray-700">
                N°
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 print:text-gray-700">
                Nombre del Alumno
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 w-20 print:text-gray-700">
                Asist.
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary-800 uppercase tracking-wider border-b border-primary-200 print:text-gray-700">
                Observaciones
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50 print:hover:bg-transparent">
                <td className="px-3 py-2 text-center text-sm font-medium text-gray-500 tabular-nums">
                  {s.list_num}
                </td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                  {s.full_name}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block w-5 h-5 border border-gray-300 rounded print:border-gray-400" />
                </td>
                <td className="px-3 py-2">
                  <div className="border-b border-gray-200 print:border-gray-300 min-h-[20px]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-3 print:hidden">
        La lista se imprime con columnas de asistencia y observaciones para uso en clase.
      </p>
    </div>
  );
}
