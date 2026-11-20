/**
 * Constancias de Instituto Don Vasco — Secundaria
 * Tipos:
 *   generica          · Constancia de estudios genérica
 *   con_promedio       · Constancia con promedio (mensual/trimestral/acumulado)
 *   ciclos_anteriores  · Constancia de ciclos anteriores
 *   con_foto           · Constancia con foto del alumno
 *   vacaciones         · Constancia de vacaciones
 *   cte                · Constancia de asistencia a Consejo Técnico Escolar (para profesores)
 */
import { ESCUELA } from "@/lib/escuela";

export type TipoConstancia = "generica" | "con_promedio" | "ciclos_anteriores" | "con_foto" | "vacaciones" | "cte";

export const TIPOS: Record<TipoConstancia, { titulo: string; descripcion: string; paraAlumno: boolean }> = {
  generica:          { titulo: "Constancia Genérica",        descripcion: "Alumno inscrito: grado, grupo, ciclo escolar.",          paraAlumno: true },
  con_promedio:      { titulo: "Constancia con Promedio",    descripcion: "Incluye promedio mensual, trimestral o acumulado.",       paraAlumno: true },
  ciclos_anteriores: { titulo: "Ciclos Anteriores",          descripcion: "Constancia con inicio y término del ciclo actual.",       paraAlumno: true },
  con_foto:          { titulo: "Constancia con Foto",        descripcion: "Constancia de estudios con fotografía del alumno.",       paraAlumno: true },
  vacaciones:        { titulo: "Constancia de Vacaciones",   descripcion: "Para trámites durante periodo vacacional.",               paraAlumno: true },
  cte:               { titulo: "Asistencia a CTE",           descripcion: "Constancia emitida por directivos para profesores.",      paraAlumno: false },
};

export type AlumnoConst = {
  id: string;
  full_name: string;
  curp: string | null;
  grado: number;
  letra: string;
  ciclo: string;
  list_num: number;
};

export type ProfesorConst = {
  id: string;
  full_name: string;
};

export type OpcionesConst = {
  tipo: TipoConstancia;
  fecha: string;              // ISO date
  expediente: string;
  cicloActual: string;
  // con_promedio
  tipoPromedio?: "mensual" | "trimestral" | "acumulado";
  promedio?: number | null;
  periodo?: string;           // nombre del periodo
  // ciclos_anteriores
  inicioCiclo?: string;
  terminoCiclo?: string;
  // con_foto
  fotoUrl?: string | null;    // data URL
  // cte
  fechaCte?: string;
  sesionCte?: string;
  profesorNombre?: string;
  // firma
  firmaNombre?: string;
  firmaCargo?: string;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function fechaLegible(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function encabezado(ciclo: string): string {
  return `
    <header>
      <img class="escudo" src="/logo-idv.png" alt="IDV">
      <div class="enc">
        <p class="titulo">${esc(ESCUELA.nombre)}</p>
        <p class="sub">Sección Secundaria</p>
        <p class="ciclo">Ciclo Escolar ${esc(ciclo)}</p>
      </div>
    </header>`;
}

function firmaBloque(nombre: string, cargo: string): string {
  return `
    <div class="firma">
      <p class="aten">A T E N T A M E N T E</p>
      <div class="linea"></div>
      <p class="nombre-firma">${esc(nombre)}</p>
      <p class="cargo-firma">${esc(cargo)}</p>
    </div>`;
}

function pie(): string {
  return `<footer>Morelos #115, Centro, Apaseo El Grande, Guanajuato &nbsp;|&nbsp; ${esc(ESCUELA.nombreCorto)} — Secundaria</footer>`;
}

export function htmlConstanciaGenerica(a: AlumnoConst, o: OpcionesConst): string {
  return `
  <section class="hoja">
    ${encabezado(o.cicloActual)}
    <div class="mesa"><p>EXPEDIENTE: ${esc(o.expediente)}</p></div>
    <p class="asunto">ASUNTO: <b>Constancia de Estudios</b></p>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) alumno(a): <b><u>${esc(a.full_name)}</u></b>, con CURP: <b><u>${esc(a.curp ?? "—")}</u></b>, se encuentra inscrito(a) en esta institución educativa en <b>${a.grado}° grado, grupo "${esc(a.letra)}"</b>, correspondiente al ciclo escolar <b>${esc(a.ciclo)}</b>.</p>
    <p class="parrafo">A petición del(la) interesado(a) y para los usos legales que haya lugar, se extiende la presente en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function htmlConstanciaConPromedio(a: AlumnoConst, o: OpcionesConst): string {
  const tipoProm = o.tipoPromedio === "mensual" ? "mensual" : o.tipoPromedio === "trimestral" ? "trimestral" : "acumulado";
  const periodoTxt = o.periodo ? ` del periodo <b>${esc(o.periodo)}</b>` : "";
  return `
  <section class="hoja">
    ${encabezado(o.cicloActual)}
    <div class="mesa"><p>EXPEDIENTE: ${esc(o.expediente)}</p></div>
    <p class="asunto">ASUNTO: <b>Constancia de Estudios con Promedio</b></p>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) alumno(a): <b><u>${esc(a.full_name)}</u></b>, con CURP: <b><u>${esc(a.curp ?? "—")}</u></b>, se encuentra inscrito(a) en esta institución educativa en <b>${a.grado}° grado, grupo "${esc(a.letra)}"</b>, correspondiente al ciclo escolar <b>${esc(a.ciclo)}</b>.</p>
    <p class="parrafo">El(La) alumno(a) cuenta con un promedio <b>${tipoProm}</b>${periodoTxt} de: <b class="promedio">${o.promedio != null ? o.promedio.toFixed(1) : "—"}</b>.</p>
    <p class="parrafo">A petición del(la) interesado(a) y para los usos legales que haya lugar, se extiende la presente en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function htmlConstanciaCiclosAnteriores(a: AlumnoConst, o: OpcionesConst): string {
  return `
  <section class="hoja">
    ${encabezado(o.cicloActual)}
    <div class="mesa"><p>EXPEDIENTE: ${esc(o.expediente)}</p></div>
    <p class="asunto">ASUNTO: <b>Constancia de Ciclos Anteriores</b></p>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) alumno(a): <b><u>${esc(a.full_name)}</u></b>, con CURP: <b><u>${esc(a.curp ?? "—")}</u></b>, cursó sus estudios en esta institución educativa.</p>
    <p class="parrafo">El ciclo escolar actual <b>${esc(o.cicloActual)}</b> comprende del <b>${esc(o.inicioCiclo ?? "agosto de 2026")}</b> al <b>${esc(o.terminoCiclo ?? "julio de 2027")}</b>.</p>
    <p class="parrafo">El(La) alumno(a) se encuentra actualmente en <b>${a.grado}° grado, grupo "${esc(a.letra)}"</b>.</p>
    <p class="parrafo">A petición del(la) interesado(a) y para los usos legales que haya lugar, se extiende la presente en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function htmlConstanciaConFoto(a: AlumnoConst, o: OpcionesConst): string {
  return `
  <section class="hoja con-foto">
    ${encabezado(o.cicloActual)}
    <div class="contenido-foto">
      <div class="foto-box">${o.fotoUrl ? `<img src="${o.fotoUrl}" alt="Foto" class="foto-img">` : '<span class="foto-placeholder">FOTO</span>'}</div>
      <div class="datos-alumno">
        <p><span class="etiqueta">Nombre:</span> <b>${esc(a.full_name)}</b></p>
        <p><span class="etiqueta">CURP:</span> ${esc(a.curp ?? "—")}</p>
        <p><span class="etiqueta">Grado:</span> ${a.grado}° "${esc(a.letra)}"</p>
        <p><span class="etiqueta">Ciclo:</span> ${esc(a.ciclo)}</p>
      </div>
    </div>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) alumno(a) cuya fotografía aparece en esta constancia, se encuentra debidamente inscrito(a) en esta institución educativa en <b>${a.grado}° grado, grupo "${esc(a.letra)}"</b>, correspondiente al ciclo escolar <b>${esc(a.ciclo)}</b>.</p>
    <p class="parrafo">A petición del(la) interesado(a) y para los usos legales que haya lugar, se extiende la presente en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function htmlConstanciaVacaciones(a: AlumnoConst, o: OpcionesConst): string {
  return `
  <section class="hoja">
    ${encabezado(o.cicloActual)}
    <div class="mesa"><p>EXPEDIENTE: ${esc(o.expediente)}</p></div>
    <p class="asunto">ASUNTO: <b>Constancia de Vacaciones</b></p>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) alumno(a): <b><u>${esc(a.full_name)}</u></b>, con CURP: <b><u>${esc(a.curp ?? "—")}</u></b>, se encuentra inscrito(a) en esta institución educativa en <b>${a.grado}° grado, grupo "${esc(a.letra)}"</b>, correspondiente al ciclo escolar <b>${esc(a.ciclo)}</b>.</p>
    <p class="parrafo">Se hace constar que el(la) alumno(a) se encuentra en periodo vacacional, el cual es propio de esta institución educativa.</p>
    <p class="parrafo">A petición del(la) interesado(a) y para los usos legales que haya lugar, se extiende la presente en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function htmlConstanciaCTE(o: OpcionesConst): string {
  return `
  <section class="hoja">
    ${encabezado(o.cicloActual)}
    <p class="asunto cte-asunto">ASUNTO: <b>Constancia de Asistencia a Consejo Técnico Escolar</b></p>
    <p class="aqc">A QUIEN CORRESPONDA:</p>
    <p class="parrafo">La Dirección de la Sección Secundaria del ${esc(ESCUELA.nombre)}, hace constar que el(la) profesor(a): <b><u>${esc(o.profesorNombre ?? "—")}</u></b>, asistió a la sesión del Consejo Técnico Escolar${o.sesionCte ? ` (<b>${esc(o.sesionCte)}</b>)` : ""} celebrada el día <b>${o.fechaCte ? fechaLegible(o.fechaCte) : "—"}</b>.</p>
    <p class="parrafo">Se extiende la presente para los fines que al(la) interesado(a) convengan, en la ciudad de Apaseo El Grande, Guanajuato, a ${fechaLegible(o.fecha)}.</p>
    ${firmaBloque(o.firmaNombre ?? "Dirección de Secundaria", o.firmaCargo ?? "Director(a) de Secundaria")}
    ${pie()}
  </section>`;
}

export function generarConstancia(a: AlumnoConst | null, o: OpcionesConst): string {
  switch (o.tipo) {
    case "generica": return htmlConstanciaGenerica(a!, o);
    case "con_promedio": return htmlConstanciaConPromedio(a!, o);
    case "ciclos_anteriores": return htmlConstanciaCiclosAnteriores(a!, o);
    case "con_foto": return htmlConstanciaConFoto(a!, o);
    case "vacaciones": return htmlConstanciaVacaciones(a!, o);
    case "cte": return htmlConstanciaCTE(o);
  }
}

export function documentoConstancias(hojas: string[]): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Constancia — ${ESCUELA.nombreCorto}</title>
<style>
  @page { size: letter portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .hoja { position: relative; width: 215.9mm; height: 279.4mm; margin: 12px auto; padding: 18mm 22mm 24mm 22mm; background: #fff; overflow: hidden; page-break-after: always; break-after: page; }
  .hoja:last-child { page-break-after: auto; break-after: auto; }

  /* Encabezado */
  header { display: flex; align-items: center; gap: 5mm; border-bottom: 2px solid #1a365d; padding-bottom: 4mm; margin-bottom: 8mm; }
  .escudo { height: 22mm; width: 22mm; object-fit: contain; }
  .enc { flex: 1; text-align: center; }
  .enc .titulo { margin: 0; font-size: 16pt; font-weight: 800; color: #1a365d; }
  .enc .sub { margin: 2px 0 0; font-size: 11pt; color: #475569; font-weight: 600; }
  .enc .ciclo { margin: 2px 0 0; font-size: 10pt; color: #64748b; }

  /* Mesa / expediente */
  .mesa { text-align: right; font-size: 10pt; color: #475569; margin-bottom: 4mm; }
  .mesa p { margin: 0; }
  .asunto { text-align: right; font-size: 11pt; margin: 0 0 6mm; }
  .asunto.cte-asunto { text-align: center; font-size: 12pt; margin: 10mm 0 6mm; }

  /* Cuerpo */
  .aqc { font-weight: 700; font-size: 12pt; margin: 10mm 0 6mm; }
  .parrafo { text-align: justify; text-indent: 12mm; font-size: 12pt; line-height: 1.8; margin: 0 0 4mm; }
  .promedio { font-size: 14pt; color: #1a365d; }

  /* Foto */
  .contenido-foto { display: flex; gap: 6mm; margin: 6mm 0; align-items: flex-start; }
  .foto-box { width: 32mm; height: 40mm; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; background: #f8fafc; flex-shrink: 0; }
  .foto-img { width: 100%; height: 100%; object-fit: cover; }
  .foto-placeholder { font-size: 10pt; color: #94a3b8; }
  .datos-alumno { font-size: 11pt; line-height: 1.8; }
  .datos-alumno .etiqueta { font-weight: 600; color: #475569; }

  /* Firma */
  .firma { margin-top: 20mm; text-align: center; font-size: 11pt; }
  .firma .aten { letter-spacing: 0.5mm; margin-bottom: 18mm; }
  .linea { width: 70mm; border-bottom: 1px solid #111; margin: 0 auto 2mm; }
  .nombre-firma { font-weight: 700; margin: 0; }
  .cargo-firma { font-size: 10pt; color: #475569; margin: 0; }

  /* Pie de página */
  footer { position: absolute; left: 22mm; right: 22mm; bottom: 12mm; border-top: 1px solid #cbd5e1; padding-top: 2mm; text-align: center; font-size: 7.5pt; color: #64748b; }

  /* Barra de impresión */
  .barra { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; padding: 10px; background: #1a365d; color: #fff; font: 14px Arial, sans-serif; }
  .barra button { background: #f5c518; color: #1a365d; border: 0; border-radius: 8px; padding: 8px 16px; font-weight: 700; cursor: pointer; }
  @media print { body { background: #fff; } .barra { display: none; } .hoja { margin: 0; } }
</style></head><body>
<div class="barra">${hojas.length} ${hojas.length === 1 ? "constancia" : "constancias"} <button onclick="window.print()">Imprimir</button></div>
${hojas.join("")}
</body></html>`;
}
