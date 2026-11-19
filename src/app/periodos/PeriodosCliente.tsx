"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Lock, LockOpen, Mail, Info, Save } from "lucide-react";

type EstadoPeriodo = "abierto" | "programado" | "vencido" | "cerrado";

type Period = {
  id: string;
  period_number: number;
  name: string;
  trimester: number;
  is_open: boolean;
  open_date: string | null;
  close_date: string | null;
  estado: EstadoPeriodo;
};

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1.er trimestre",
  2: "2.º trimestre",
  3: "3.er trimestre",
  0: "Evaluación final",
};

const ESTADO: Record<EstadoPeriodo, { t: string; c: string }> = {
  abierto: {
    t: "Abierto · los profesores pueden capturar",
    c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  programado: {
    t: "Programado · aún no inicia",
    c: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  vencido: {
    t: "Vencido · ya pasó la fecha de cierre",
    c: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  cerrado: {
    t: "Cerrado",
    c: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  },
};

const fechaLarga = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
};

const horaCorta = (d: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Mexico_City",
  });
};

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Convert to Mexico City time for display
  const mx = new Date(d.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${mx.getFullYear()}-${pad(mx.getMonth() + 1)}-${pad(mx.getDate())}T${pad(mx.getHours())}:${pad(mx.getMinutes())}`;
}

type Borrador = { open_date: string; close_date: string };

export default function PeriodosCliente({
  periods,
  capturadas,
}: {
  periods: Period[];
  capturadas: Record<string, number>;
}) {
  const router = useRouter();
  const [borr, setBorr] = useState<Record<string, Borrador>>(() =>
    Object.fromEntries(
      periods.map((p) => [
        p.id,
        {
          open_date: isoToDatetimeLocal(p.open_date),
          close_date: isoToDatetimeLocal(p.close_date),
        },
      ])
    )
  );
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [abrirModal, setAbrirModal] = useState<Period | null>(null);
  const [notificando, setNotificando] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  function showToast(msg: string, tipo: "ok" | "error" = "ok") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  }

  const cambiado = (p: Period) => {
    const b = borr[p.id];
    return (
      b &&
      (b.open_date !== isoToDatetimeLocal(p.open_date) ||
        b.close_date !== isoToDatetimeLocal(p.close_date))
    );
  };

  async function guardar(p: Period) {
    const b = borr[p.id];
    if (b.open_date && b.close_date && b.close_date <= b.open_date) {
      return showToast("El cierre debe ser posterior a la apertura.", "error");
    }
    setOcupado(p.id);
    const res = await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        open_date: b.open_date ? new Date(b.open_date).toISOString() : null,
        close_date: b.close_date ? new Date(b.close_date).toISOString() : null,
      }),
    });
    setOcupado(null);
    if (!res.ok) return showToast("No se pudo guardar.", "error");
    showToast(`${p.name} guardado`);
    router.refresh();
  }

  async function cambiarAbierto(p: Period, abrir: boolean) {
    setAbrirModal(null);
    setOcupado(p.id);
    const res = await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_open: abrir }),
    });
    setOcupado(null);
    if (!res.ok) return showToast("No se pudo cambiar.", "error");
    showToast(
      abrir ? `${p.name} abierto` : `${p.name} cerrado`,
      "ok"
    );
    router.refresh();
  }

  async function recordar(p: Period) {
    setNotificando(p.id);
    try {
      const res = await fetch("/api/admin/periods/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodName: p.name,
          openDate: p.open_date,
          closeDate: p.close_date,
          recipientIds: "all",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Recordatorio enviado.");
      } else {
        showToast(data.error || "No se pudo enviar.", "error");
      }
    } catch {
      showToast("Error de conexión.", "error");
    }
    setNotificando(null);
  }

  // Group by trimester
  const grouped: Record<number, Period[]> = {};
  for (const p of periods) {
    if (!grouped[p.trimester]) grouped[p.trimester] = [];
    grouped[p.trimester].push(p);
  }
  const trimesterOrder = [1, 2, 3, 0].filter((t) => grouped[t]);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.tipo === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Info banner — matches SIGEFCP */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-500/30 dark:bg-blue-500/10">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300" />
        <p className="text-slate-700 dark:text-slate-300">
          Los profesores solo pueden capturar cuando el periodo está{" "}
          <b>abierto</b> y el momento actual está{" "}
          <b>dentro de su rango de fechas</b>. Si dejas las fechas vacías, la
          captura depende solo del interruptor. Dirección y Administración pueden
          corregir calificaciones en cualquier momento.
        </p>
      </div>

      {/* Periods grouped by trimester */}
      {trimesterOrder.map((trimId) => {
        const group = grouped[trimId];
        return (
          <section key={trimId} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              {TRIMESTER_LABELS[trimId] ?? `Trimestre ${trimId}`}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.map((p) => {
                const b = borr[p.id] ?? { open_date: "", close_date: "" };
                const e = ESTADO[p.estado];
                const n = capturadas[p.id] ?? 0;

                return (
                  <section
                    key={p.id}
                    className={`card flex flex-col rounded-2xl p-5 ${
                      p.estado === "abierto" ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-11 w-11 place-items-center rounded-xl ${
                            p.estado === "abierto"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                          }`}
                        >
                          <CalendarRange size={20} />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {n.toLocaleString("es-MX")} calificaciones capturadas
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status chip */}
                    <span className={`chip mt-4 w-fit px-3 py-1 ${e.c}`}>
                      {e.t}
                    </span>

                    {/* Date fields */}
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Abre
                        </span>
                        <input
                          type="datetime-local"
                          className="input mt-1"
                          value={b.open_date}
                          onChange={(ev) =>
                            setBorr({
                              ...borr,
                              [p.id]: { ...b, open_date: ev.target.value },
                            })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Cierra
                        </span>
                        <input
                          type="datetime-local"
                          className="input mt-1"
                          value={b.close_date}
                          min={b.open_date || undefined}
                          onChange={(ev) =>
                            setBorr({
                              ...borr,
                              [p.id]: { ...b, close_date: ev.target.value },
                            })
                          }
                        />
                      </label>
                      {(p.open_date || p.close_date) && (
                        <p className="text-xs text-slate-400">
                          Captura del {fechaLarga(p.open_date)}
                          {p.open_date ? `, ${horaCorta(p.open_date)}` : ""} al{" "}
                          {fechaLarga(p.close_date)}
                          {p.close_date ? `, ${horaCorta(p.close_date)}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
                      <button
                        className="btn"
                        disabled={!cambiado(p) || ocupado === p.id}
                        onClick={() => guardar(p)}
                      >
                        <Save size={15} /> Guardar fechas
                      </button>
                      {p.is_open ? (
                        <button
                          className="btn border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                          disabled={ocupado === p.id}
                          onClick={() => cambiarAbierto(p, false)}
                        >
                          <Lock size={15} /> Cerrar
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          disabled={ocupado === p.id}
                          onClick={() => setAbrirModal(p)}
                        >
                          <LockOpen size={15} /> Abrir
                        </button>
                      )}
                    </div>

                    {/* Email reminder */}
                    <button
                      className="btn mt-2 w-full"
                      disabled={p.estado !== "abierto" || notificando === p.id}
                      onClick={() => recordar(p)}
                      title={
                        p.estado === "abierto"
                          ? "Recuerda a profesores y Dirección que la captura está abierta"
                          : "Abre el periodo para poder enviar el recordatorio"
                      }
                    >
                      <Mail size={15} />{" "}
                      {notificando === p.id
                        ? "Enviando…"
                        : "Enviar correo de recordatorio"}
                    </button>
                  </section>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Confirm open modal */}
      {abrirModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAbrirModal(null)}
        >
          <div
            className="card w-full max-w-md rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Abrir {abrirModal.name}
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Los profesores podrán capturar calificaciones de este periodo
              {abrirModal.open_date || abrirModal.close_date ? (
                <>
                  {" "}del <b>{fechaLarga(abrirModal.open_date)}</b> al{" "}
                  <b>{fechaLarga(abrirModal.close_date)}</b>
                </>
              ) : (
                <> desde ahora y hasta que lo cierres</>
              )}
              .
            </p>
            {cambiado(abrirModal) && (
              <p className="mt-2 text-sm text-amber-700">
                Tienes fechas sin guardar en este periodo; guárdalas primero si
                quieres que apliquen.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn" onClick={() => setAbrirModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={() => cambiarAbierto(abrirModal, true)}
              >
                Abrir periodo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
        <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="text-slate-500 dark:text-slate-400">
          Cuando un periodo está cerrado o fuera de las fechas programadas, los
          profesores solo pueden consultar las calificaciones registradas. Solo
          Dirección y Administración pueden capturar en periodos cerrados.
        </p>
      </div>
    </div>
  );
}
