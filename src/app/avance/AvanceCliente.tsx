"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Types ── */
type Fila = {
  group_id: string;
  subject_id: string;
  group_label: string;
  subject_name: string;
  grade: number;
  alumnos: number;
  capturadas: number;
};

type Docente = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  capturadas: number;
  total: number;
  filas: Fila[];
};

type PeriodNav = {
  id: string;
  name: string;
  is_open: boolean;
  active: boolean;
};

type SinProfe = {
  group_label: string;
  subject_name: string;
  grade: number;
};

type Props = {
  ciclo: string;
  periodoNombre: string;
  esAbierto: boolean;
  pct: number;
  totalCapturadas: number;
  totalExpected: number;
  pendientes: number;
  docentes: Docente[];
  sinProfe: SinProfe[];
  periodsNav: PeriodNav[];
};

/* ── Grade colors ── */
const GRADO_COLOR: Record<
  number,
  { texto: string; fondo: string; borde: string }
> = {
  1: {
    texto: "text-blue-700 dark:text-blue-300",
    fondo: "bg-blue-50 dark:bg-blue-500/10",
    borde: "border-blue-200 dark:border-blue-500/30",
  },
  2: {
    texto: "text-emerald-700 dark:text-emerald-300",
    fondo: "bg-emerald-50 dark:bg-emerald-500/10",
    borde: "border-emerald-200 dark:border-emerald-500/30",
  },
  3: {
    texto: "text-purple-700 dark:text-purple-300",
    fondo: "bg-purple-50 dark:bg-purple-500/10",
    borde: "border-purple-200 dark:border-purple-500/30",
  },
};

/* ── Auto-refresh component ── */
function Actualizar({ automatico }: { automatico: boolean }) {
  const router = useRouter();
  const [cargando, iniciar] = useTransition();
  const [ultima, setUltima] = useState<Date | null>(null);

  const refrescar = () =>
    iniciar(() => {
      router.refresh();
      setUltima(new Date());
    });

  useEffect(() => {
    setUltima(new Date());
    if (!automatico) return;
    const CADA = 2 * 60_000;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refrescar();
    }, CADA);
    const vis = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatico]);

  const hora = (d: Date) =>
    d.toLocaleTimeString("es-MX", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Mexico_City",
    });

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <button
        type="button"
        onClick={refrescar}
        disabled={cargando}
        className="btn-secondary inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs"
      >
        <svg
          className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Actualizar
      </button>
      {ultima && (
        <span>
          Datos de las {hora(ultima)}
          {automatico ? " · se actualiza solo cada 2 min" : ""}
        </span>
      )}
    </div>
  );
}

/* ── Main client component ── */
export default function AvanceCliente({
  ciclo,
  periodoNombre,
  esAbierto,
  pct,
  totalCapturadas,
  totalExpected,
  pendientes,
  docentes,
  sinProfe,
  periodsNav,
}: Props) {
  const [sel, setSel] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    msg: string;
    tipo: "ok" | "error";
  } | null>(null);
  const [confirmar, setConfirmar] = useState<string[] | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pendientesDocentes = docentes.filter((d) => d.capturadas < d.total);
  const todos =
    pendientesDocentes.length > 0 &&
    sel.length === pendientesDocentes.length;
  const nombre = (id: string) =>
    docentes.find((d) => d.teacher_id === id)?.full_name ?? "";

  /* Toast auto-dismiss */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /* Email reminder */
  async function enviar() {
    if (!confirmar) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/avance/recordatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_ids: confirmar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      setToast({
        msg: `Recordatorio enviado a ${data.enviados} profesor${data.enviados === 1 ? "" : "es"}.`,
        tipo: "ok",
      });
    } catch (e: any) {
      setToast({ msg: e.message || "Error al enviar", tipo: "error" });
    }
    setEnviando(false);
    setConfirmar(null);
    setSel([]);
  }

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
            toast.tipo === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Header (Encabezado) ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <svg
              className="h-[22px] w-[22px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Avance de captura
            </h1>
            <p className="text-sm text-slate-500">
              {periodoNombre}
              {esAbierto ? "" : " (cerrado)"} · {pct}% capturado (
              {totalCapturadas} de {totalExpected} calificaciones)
            </p>
          </div>
        </div>
      </div>

      {/* ── Auto-refresh ── */}
      <Actualizar automatico={esAbierto} />

      {/* ── Period navigation pills ── */}
      {periodsNav.length > 1 && (
        <nav aria-label="Periodo" className="flex flex-wrap gap-2">
          {periodsNav.map((p) => (
            <Link
              key={p.id}
              prefetch={false}
              href={`/avance?t=${p.id}`}
              aria-current={p.active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                p.active
                  ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              {p.name}
              {p.is_open ? (
                <span
                  className={`h-2 w-2 rounded-full ${p.active ? "bg-white" : "bg-emerald-500"}`}
                  aria-label="abierto"
                />
              ) : (
                <svg
                  className="h-3 w-3 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </Link>
          ))}
        </nav>
      )}

      {/* ── Closed period banner ── */}
      {!esAbierto && (
        <p className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <svg
            className="mr-1.5 inline h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Este periodo no está abierto: así quedó (o va) la captura. Los
          recordatorios por correo solo se envían del periodo abierto.
        </p>
      )}

      {/* ── Progress bar card ── */}
      <div className="card rounded-2xl p-5">
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <span>
            <b className="tabular-nums">
              {docentes.length - pendientes}
            </b>{" "}
            profesores completos
          </span>
          <span>
            <b className="tabular-nums text-amber-600">{pendientes}</b>{" "}
            con pendientes
          </span>
          <span>
            <b className="tabular-nums text-red-600">{sinProfe.length}</b>{" "}
            materias-grupo sin profesor
          </span>
        </div>
      </div>

      {/* ── Teacher list ── */}
      <div className="card overflow-hidden rounded-2xl">
        {/* Select all / Send reminder bar */}
        {esAbierto && pendientesDocentes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold"
              onClick={() =>
                setSel(
                  todos
                    ? []
                    : pendientesDocentes.map((d) => d.teacher_id)
                )
              }
            >
              {todos ? (
                <svg
                  className="h-[18px] w-[18px] text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-[18px] w-[18px] text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    strokeWidth={2}
                  />
                </svg>
              )}
              {todos
                ? "Quitar selección"
                : `Seleccionar todos con pendientes (${pendientesDocentes.length})`}
            </button>
            <button
              className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              disabled={!sel.length}
              onClick={() => setConfirmar(sel)}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Enviar recordatorio{sel.length ? ` (${sel.length})` : ""}
            </button>
          </div>
        )}

        {/* Column headers (wide screens) */}
        <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400 md:grid md:grid-cols-[minmax(0,240px)_170px_minmax(0,1fr)] md:gap-4">
          <span>Profesor</span>
          <span>Avance</span>
          <span>Grupos y materias</span>
        </div>

        {/* Teacher rows */}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {docentes.map((d) => {
            const dpct = d.total
              ? Math.round((d.capturadas / d.total) * 100)
              : 0;
            const color =
              dpct === 100
                ? "bg-emerald-500"
                : dpct >= 50
                  ? "bg-amber-400"
                  : "bg-red-500";
            const pend = d.capturadas < d.total;
            const marcado = sel.includes(d.teacher_id);

            return (
              <li
                key={d.teacher_id}
                className={`grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,240px)_170px_minmax(0,1fr)] md:gap-4 ${marcado ? "bg-blue-50/60 dark:bg-blue-500/10" : ""}`}
              >
                {/* Professor name + email button */}
                <div className="flex items-start gap-2">
                  {esAbierto && pend && (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                      checked={marcado}
                      aria-label={`Seleccionar a ${d.full_name}`}
                      onChange={() =>
                        setSel((x) =>
                          marcado
                            ? x.filter((y) => y !== d.teacher_id)
                            : [...x, d.teacher_id]
                        )
                      }
                    />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {d.full_name}
                    </span>
                    {esAbierto && pend && (
                      <button
                        className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => setConfirmar([d.teacher_id])}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        Enviar recordatorio
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${dpct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm tabular-nums">
                      {dpct}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {d.capturadas} / {d.total}
                  </p>
                </div>

                {/* Group-subject chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[...d.filas]
                    .sort(
                      (a, b) =>
                        a.grade - b.grade ||
                        a.group_label.localeCompare(b.group_label)
                    )
                    .map((f) => {
                      const ok = f.capturadas >= f.alumnos;
                      const gc = GRADO_COLOR[f.grade] || GRADO_COLOR[1];
                      return (
                        <Link
                          prefetch={false}
                          key={`${f.group_id}-${f.subject_id}`}
                          href={`/captura/${f.group_id}/${f.subject_id}`}
                          className={`inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 text-xs font-medium transition hover:shadow-sm ${
                            ok
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          <b className={`mr-0.5 ${gc.texto}`}>
                            {f.group_label}
                          </b>
                          {f.subject_name} · {f.capturadas}/{f.alumnos}
                        </Link>
                      );
                    })}
                </div>
              </li>
            );
          })}

          {/* Empty state */}
          {!docentes.length && (
            <li className="p-10 text-center text-slate-400">
              No hay profesores con materias asignadas.
            </li>
          )}
        </ul>
      </div>

      {/* ── Subjects without teacher ── */}
      {sinProfe.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 dark:text-white">
            Materias sin profesor asignado ({sinProfe.length})
          </h2>
          <p className="text-sm text-slate-500">
            Nadie podrá capturarlas hasta que se asignen en Asignar.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sinProfe.slice(0, 200).map((s, i) => {
              const gc = GRADO_COLOR[s.grade] || GRADO_COLOR[1];
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <b className={`mr-0.5 ${gc.texto}`}>{s.group_label}</b>
                  {s.subject_name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Enviar recordatorio
            </h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {confirmar.length === 1 ? (
                <p>
                  Se enviará un correo a{" "}
                  <b>{nombre(confirmar[0])}</b> con los grupos y
                  materias que le faltan.
                </p>
              ) : (
                <p>
                  Cada uno de los <b>{confirmar.length} profesores</b>{" "}
                  recibirá su propio correo con los grupos y materias que
                  le faltan.
                </p>
              )}
              <p className="text-slate-500">
                Los datos se calculan al momento de enviar.
                {confirmar.length > 20
                  ? " Puede tardar hasta un minuto."
                  : ""}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn-secondary rounded-lg px-4 py-2 text-sm"
                disabled={enviando}
                onClick={() => setConfirmar(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm"
                disabled={enviando}
                onClick={enviar}
              >
                {enviando ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
