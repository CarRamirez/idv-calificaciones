"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type FilaGrupo = {
  id: string;
  grado: number;
  letra: string;
  alumnos: number;
  promedio: number | null;
  enRiesgo: number;
};

type Orden = "grupo" | "alumnos" | "promedio" | "riesgo";

const semaforo = (v: number | null) =>
  v == null
    ? "text-slate-400"
    : v < 7
    ? "text-red-600"
    : v < 8
    ? "text-amber-600"
    : "text-emerald-600";

const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(1));

const COLOR_GRADO: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-emerald-100 text-emerald-700",
  3: "bg-violet-100 text-violet-700",
};

/* ── SVG icon helpers (inline, no lucide dependency) ── */
function IconSort({ asc, active }: { asc: boolean; active: boolean }) {
  if (!active)
    return (
      <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  return asc ? (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconSheet({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m8.625 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125m1.125-1.125c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m1.125-2.625c0 .621.504 1.125 1.125 1.125" />
    </svg>
  );
}

function IconPrinter({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}

function IconClipboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconWarning({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

export default function TablaGrupos({ grupos }: { grupos: FilaGrupo[] }) {
  const [grado, setGrado] = useState(0);
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<{ por: Orden; asc: boolean }>({
    por: "grupo",
    asc: true,
  });

  const lista = useMemo(() => {
    const t = q
      .trim()
      .toUpperCase()
      .replace(/[°º\s-]/g, "");
    const r = grupos.filter(
      (g) =>
        (!grado || g.grado === grado) &&
        (!t || `${g.grado}${g.letra}`.includes(t))
    );
    const v = (g: FilaGrupo) =>
      orden.por === "alumnos"
        ? g.alumnos
        : orden.por === "promedio"
        ? g.promedio ?? -1
        : orden.por === "riesgo"
        ? g.enRiesgo
        : 0;
    return r.sort((a, b) => {
      const d =
        orden.por === "grupo"
          ? a.grado - b.grado || a.letra.localeCompare(b.letra)
          : v(a) - v(b);
      return orden.asc ? d : -d;
    });
  }, [grupos, grado, q, orden]);

  const seg = (on: boolean) =>
    `min-h-[34px] rounded-md px-3 text-sm font-semibold transition ${
      on
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-500 hover:text-slate-800"
    }`;

  const Encab = ({
    por,
    children,
    className = "",
  }: {
    por: Orden;
    children: React.ReactNode;
    className?: string;
  }) => {
    const on = orden.por === por;
    return (
      <th scope="col" className={`px-3 py-2.5 ${className}`}>
        <button
          onClick={() => setOrden({ por, asc: on ? !orden.asc : por === "grupo" })}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded uppercase tracking-wide hover:text-slate-900"
        >
          {children}
          <IconSort asc={orden.asc} active={on} />
        </button>
      </th>
    );
  };

  const btnIcono =
    "inline-grid h-9 w-9 place-items-center rounded-md text-primary-700 hover:bg-primary-50 transition-colors";

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="Grado"
        >
          <button className={seg(!grado)} onClick={() => setGrado(0)}>
            Todos
          </button>
          {[1, 2, 3].map((n) => (
            <button key={n} className={seg(grado === n)} onClick={() => setGrado(n)}>
              {n}°
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-44">
          <span className="sr-only">Buscar grupo</span>
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Grupo, ej. 2B"
            className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
          />
        </label>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <Encab por="grupo">Grupo</Encab>
              <Encab por="alumnos" className="text-right">
                Alumnos
              </Encab>
              <Encab por="promedio" className="text-right">
                Promedio
              </Encab>
              <Encab por="riesgo" className="text-right">
                En riesgo
              </Encab>
              <th scope="col" className="px-1 py-2.5 text-center">
                Concentrado
              </th>
              <th scope="col" className="px-1 py-2.5 text-center">
                Boleta
              </th>
              <th scope="col" className="px-1 py-2.5 pr-3 text-center">
                Lista
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={`inline-grid min-w-[2.75rem] place-items-center rounded-md px-2 py-1 text-sm font-bold ${
                      COLOR_GRADO[g.grado] || COLOR_GRADO[1]
                    }`}
                  >
                    {g.grado}°{g.letra}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{g.alumnos}</td>
                <td
                  className={`px-3 py-2 text-right font-bold tabular-nums ${semaforo(
                    g.promedio
                  )}`}
                >
                  {fmt(g.promedio)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {g.enRiesgo > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                      <IconWarning />
                      {g.enRiesgo}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                <td className="px-1 py-1.5 text-center">
                  <Link
                    href={`/concentrados?grupo=${g.id}`}
                    className={btnIcono}
                    aria-label={`Concentrado de ${g.grado}°${g.letra}`}
                  >
                    <IconSheet className="w-[17px] h-[17px]" />
                  </Link>
                </td>
                <td className="px-1 py-1.5 text-center">
                  <Link
                    href={`/boleta/grupo/${g.id}`}
                    className={btnIcono}
                    aria-label={`Boletas de ${g.grado}°${g.letra}`}
                  >
                    <IconPrinter className="w-[17px] h-[17px]" />
                  </Link>
                </td>
                <td className="px-1 py-1.5 pr-3 text-center">
                  <Link
                    href={`/lista/${g.id}`}
                    className={btnIcono}
                    aria-label={`Lista de ${g.grado}°${g.letra}`}
                  >
                    <IconClipboard className="w-[17px] h-[17px]" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {lista.map((g) => (
          <li
            key={g.id}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-11 w-12 shrink-0 place-items-center rounded-md text-base font-bold ${
                  COLOR_GRADO[g.grado] || COLOR_GRADO[1]
                }`}
              >
                {g.grado}°{g.letra}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm">
                  <b className="tabular-nums">{g.alumnos}</b> alumnos
                </p>
                <p className="text-sm">
                  Promedio{" "}
                  <b className={`tabular-nums ${semaforo(g.promedio)}`}>
                    {fmt(g.promedio)}
                  </b>
                  {g.enRiesgo > 0 && (
                    <span className="ml-2 font-semibold text-red-600">
                      · {g.enRiesgo} en riesgo
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Link
                href={`/concentrados?grupo=${g.id}`}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <IconSheet /> Concentrado
              </Link>
              <Link
                href={`/boleta/grupo/${g.id}`}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <IconPrinter /> Boleta
              </Link>
              <Link
                href={`/lista/${g.id}`}
                className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <IconClipboard /> Lista
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {!lista.length && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          No hay grupos con ese filtro.
        </p>
      )}
      <p className="text-xs text-slate-400">
        {lista.length} de {grupos.length} grupos · Promedio: rojo &lt;7, ámbar 7–7.9,
        verde 8+
      </p>
    </div>
  );
}
