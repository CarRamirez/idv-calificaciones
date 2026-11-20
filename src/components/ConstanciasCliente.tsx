"use client";

import { useState, useMemo, useCallback } from "react";
import {
  TIPOS, generarConstancia, documentoConstancias,
  type TipoConstancia, type AlumnoConst, type ProfesorConst, type OpcionesConst,
} from "@/lib/constancias";
import { formatStudentName } from "@/lib/format-name";

type Props = {
  alumnos: AlumnoConst[];
  profesores: ProfesorConst[];
  cicloActual: string;
};

const hoyISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

export default function ConstanciasCliente({ alumnos, profesores, cicloActual }: Props) {
  const [tipo, setTipo] = useState<TipoConstancia>("generica");
  const [q, setQ] = useState("");
  const [selAlumno, setSelAlumno] = useState<AlumnoConst | null>(null);
  const [selProfesor, setSelProfesor] = useState<ProfesorConst | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [expediente, setExpediente] = useState("");
  // con_promedio
  const [tipoPromedio, setTipoPromedio] = useState<"mensual" | "trimestral" | "acumulado">("acumulado");
  const [promedio, setPromedio] = useState("");
  const [periodo, setPeriodo] = useState("");
  // ciclos_anteriores
  const [inicioCiclo, setInicioCiclo] = useState("agosto de 2026");
  const [terminoCiclo, setTerminoCiclo] = useState("julio de 2027");
  // con_foto
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  // CTE
  const [fechaCte, setFechaCte] = useState(hoyISO());
  const [sesionCte, setSesionCte] = useState("");
  // firma
  const [firmaNombre, setFirmaNombre] = useState("Lic. Ana Laura Zúñiga García");
  const [firmaCargo, setFirmaCargo] = useState("Directora de Secundaria");

  const esParaAlumno = TIPOS[tipo].paraAlumno;

  const resultados = useMemo(() => {
    const t = sinAcentos(q.trim());
    if (t.length < 2) return [];
    if (esParaAlumno) {
      return alumnos.filter((a) => sinAcentos(`${a.full_name} ${a.curp ?? ""}`).includes(t)).slice(0, 8);
    } else {
      return profesores.filter((p) => sinAcentos(p.full_name).includes(t)).slice(0, 8);
    }
  }, [alumnos, profesores, q, esParaAlumno]);

  const handleFoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  function generar() {
    const opciones: OpcionesConst = {
      tipo, fecha, expediente: expediente || "—", cicloActual,
      firmaNombre, firmaCargo,
    };
    if (tipo === "con_promedio") {
      opciones.tipoPromedio = tipoPromedio;
      opciones.promedio = promedio ? parseFloat(promedio) : null;
      opciones.periodo = periodo;
    }
    if (tipo === "ciclos_anteriores") {
      opciones.inicioCiclo = inicioCiclo;
      opciones.terminoCiclo = terminoCiclo;
    }
    if (tipo === "con_foto") {
      opciones.fotoUrl = fotoUrl;
    }
    if (tipo === "cte") {
      opciones.fechaCte = fechaCte;
      opciones.sesionCte = sesionCte;
      opciones.profesorNombre = selProfesor?.full_name ?? "";
    }

    const html = documentoConstancias([generarConstancia(selAlumno, opciones)]);
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  const listo = esParaAlumno ? !!selAlumno : !!selProfesor;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* 1. Tipo de constancia */}
        <section className="card p-5 space-y-3">
          <h2 className="font-bold text-slate-900">1. Tipo de constancia</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(TIPOS) as TipoConstancia[]).map((t) => (
              <button key={t} onClick={() => { setTipo(t); setSelAlumno(null); setSelProfesor(null); setQ(""); }}
                className={`rounded-xl border p-3 text-left transition ${
                  tipo === t
                    ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}>
                <p className="text-sm font-bold text-slate-900">{TIPOS[t].titulo}</p>
                <p className="text-xs text-slate-500">{TIPOS[t].descripcion}</p>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Seleccionar persona */}
        <section className="card p-5 space-y-3">
          <h2 className="font-bold text-slate-900">
            2. {esParaAlumno ? "Alumno" : "Profesor"}
          </h2>
          {(esParaAlumno ? selAlumno : selProfesor) ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              {esParaAlumno && selAlumno && (
                <>
                  <span className="text-lg font-black text-primary-700">{selAlumno.grado}°{selAlumno.letra}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900">{formatStudentName(selAlumno.full_name)}</p>
                    <p className="text-xs text-slate-500">{selAlumno.curp ?? "Sin CURP"} · N° {selAlumno.list_num}</p>
                  </div>
                </>
              )}
              {!esParaAlumno && selProfesor && (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900">{selProfesor.full_name}</p>
                </div>
              )}
              <button className="btn-secondary text-xs px-3 py-1" onClick={() => { if (esParaAlumno) { setSelAlumno(null); } else { setSelProfesor(null); } setQ(""); }}>
                Cambiar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input className="input-field pl-9 w-full" placeholder={esParaAlumno ? "Nombre o CURP del alumno…" : "Nombre del profesor…"} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
              {q.trim().length >= 2 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 max-h-64 overflow-y-auto">
                  {resultados.map((r) => (
                    <li key={r.id}>
                      <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => { if (esParaAlumno) { setSelAlumno(r as AlumnoConst); } else { setSelProfesor(r as ProfesorConst); } setQ(""); }}>
                        {esParaAlumno && "grado" in r && (
                          <span className="font-bold text-primary-700">{(r as AlumnoConst).grado}°{(r as AlumnoConst).letra}</span>
                        )}
                        <span className="truncate flex-1">{esParaAlumno ? formatStudentName(r.full_name) : r.full_name}</span>
                      </button>
                    </li>
                  ))}
                  {!resultados.length && <li className="px-3 py-4 text-center text-sm text-slate-400">Sin coincidencias.</li>}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* 3. Opciones */}
        <section className={`card p-5 space-y-4 ${listo ? "" : "opacity-50 pointer-events-none"}`}>
          <h2 className="font-bold text-slate-900">3. Datos de la constancia</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</span>
              <input type="date" className="input-field mt-1 w-full" value={fecha} onChange={(e) => setFecha(e.target.value || hoyISO())} />
            </label>
            {tipo !== "cte" && (
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expediente</span>
                <input className="input-field mt-1 w-full" value={expediente} maxLength={20} onChange={(e) => setExpediente(e.target.value)} placeholder="A/2627" />
              </label>
            )}
          </div>

          {/* Tipo promedio */}
          {tipo === "con_promedio" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de promedio</span>
                <select className="input-field mt-1 w-full" value={tipoPromedio} onChange={(e) => setTipoPromedio(e.target.value as "mensual" | "trimestral" | "acumulado")}>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="acumulado">Acumulado</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promedio</span>
                <input type="number" step="0.1" min="0" max="10" className="input-field mt-1 w-full" value={promedio} onChange={(e) => setPromedio(e.target.value)} placeholder="8.5" />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Periodo</span>
                <input className="input-field mt-1 w-full" value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Septiembre" />
              </label>
            </div>
          )}

          {/* Ciclos anteriores */}
          {tipo === "ciclos_anteriores" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inicio del ciclo</span>
                <input className="input-field mt-1 w-full" value={inicioCiclo} onChange={(e) => setInicioCiclo(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Término del ciclo</span>
                <input className="input-field mt-1 w-full" value={terminoCiclo} onChange={(e) => setTerminoCiclo(e.target.value)} />
              </label>
            </div>
          )}

          {/* Con foto */}
          {tipo === "con_foto" && (
            <div className="flex items-center gap-4">
              <div className="w-24 h-32 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 flex-shrink-0 overflow-hidden">
                {fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400">Sin foto</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Fotografía del alumno</p>
                <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {fotoUrl ? "Cambiar foto" : "Subir foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                </label>
              </div>
            </div>
          )}

          {/* CTE */}
          {tipo === "cte" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de la sesión CTE</span>
                <input type="date" className="input-field mt-1 w-full" value={fechaCte} onChange={(e) => setFechaCte(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sesión (ej. &ldquo;Sesión Ordinaria 3&rdquo;)</span>
                <input className="input-field mt-1 w-full" value={sesionCte} onChange={(e) => setSesionCte(e.target.value)} placeholder="Sesión Ordinaria 3" />
              </label>
            </div>
          )}
        </section>

        {/* Acciones */}
        <div className={`flex justify-end gap-2 ${listo ? "" : "opacity-50 pointer-events-none"}`}>
          <button className="btn-secondary text-sm flex items-center gap-2" onClick={() => generar()} disabled={!listo}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Vista previa
          </button>
          <button className="btn-primary text-sm flex items-center gap-2" onClick={() => generar()} disabled={!listo}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Generar e Imprimir
          </button>
        </div>
      </div>

      {/* Sidebar: firma */}
      <aside className="space-y-4">
        <section className="card p-4 space-y-3">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Firma
          </h2>
          <label className="text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre del firmante</span>
            <input className="input-field mt-1 w-full" value={firmaNombre} onChange={(e) => setFirmaNombre(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</span>
            <input className="input-field mt-1 w-full" value={firmaCargo} onChange={(e) => setFirmaCargo(e.target.value)} />
          </label>
        </section>

        <section className="card p-4">
          <h2 className="font-bold text-sm text-slate-900 mb-2">Tipos disponibles</h2>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {(Object.keys(TIPOS) as TipoConstancia[]).map((t) => (
              <li key={t} className="flex items-start gap-1.5">
                <span className="text-primary-500 mt-0.5">•</span>
                <span><b>{TIPOS[t].titulo}:</b> {TIPOS[t].descripcion}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
