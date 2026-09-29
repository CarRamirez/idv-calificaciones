"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type EvalPeriod = {
  id: string;
  period_number: number;
  name: string;
  trimester: number;
  is_open: boolean;
  open_date: string | null;
  close_date: string | null;
  effectively_open: boolean;
};

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1er Trimestre",
  2: "2do Trimestre",
  3: "3er Trimestre",
  0: "Evaluación Final",
};

export default function PeriodosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/effective-profile")
      .then((r) => r.json())
      .then((data) => { if (data.full_name) setEffectiveProfile(data); })
      .catch(() => {});
  }, []);
  const [periods, setPeriods] = useState<EvalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!prof || (prof.role !== "admin" && prof.role !== "directora_anita")) { router.push("/dashboard"); return; }
      setProfile(prof);
      setLoading(false);
    }
    init();
  }, []);

  const loadPeriods = useCallback(async () => {
    const res = await fetch("/api/admin/periods");
    const data = await res.json();
    if (data.periods) setPeriods(data.periods);
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  async function togglePeriod(period: EvalPeriod) {
    setToggling(period.id);
    const res = await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: period.id, is_open: !period.is_open }),
    });
    if (res.ok) {
      await loadPeriods();
    }
    setToggling(null);
  }

  async function updateDates(periodId: string, openDate: string, closeDate: string) {
    const hasDates = !!(openDate || closeDate);
    await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: periodId,
        open_date: openDate ? new Date(openDate).toISOString() : null,
        close_date: closeDate ? new Date(closeDate).toISOString() : null,
        ...(hasDates ? { is_open: true } : {}),
      }),
    });
    loadPeriods();
  }

  async function notifyTeachers(period: EvalPeriod) {
    setNotifying(period.id);
    setNotifyResult(null);
    try {
      const res = await fetch("/api/admin/periods/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodName: period.name,
          openDate: period.open_date,
          closeDate: period.close_date,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyResult({ message: data.message, type: "success" });
      } else {
        setNotifyResult({ message: data.error || "Error al enviar", type: "error" });
      }
    } catch {
      setNotifyResult({ message: "Error de conexión", type: "error" });
    }
    setNotifying(null);
    setTimeout(() => setNotifyResult(null), 5000);
  }

  // Group by trimester
  const grouped = periods.reduce<Record<number, EvalPeriod[]>>((acc, p) => {
    if (!acc[p.trimester]) acc[p.trimester] = [];
    acc[p.trimester].push(p);
    return acc;
  }, {});

  const trimesterOrder = [1, 2, 3, 0];

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    );
  }

  const openCount = periods.filter((p) => p.effectively_open).length;

  return (
    <div className="page-container">
      <Navbar userName={(effectiveProfile || profile)!.full_name} userRole={(effectiveProfile || profile)!.role} />
      <main className="page-content max-w-4xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>Periodos de Evaluación</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {openCount === 0
                ? "Todos los periodos están cerrados"
                : `${openCount} periodo${openCount > 1 ? "s" : ""} abierto${openCount > 1 ? "s" : ""} para captura`}
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary">← Inicio</Link>
        </div>

        {notifyResult && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-center gap-2 animate-fade-in ${
            notifyResult.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {notifyResult.type === "success" ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {notifyResult.message}
            <button onClick={() => setNotifyResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        <div className="space-y-6">
          {trimesterOrder.map((trimId) => {
            const group = grouped[trimId];
            if (!group) return null;
            const allOpen = group.every((p) => p.is_open);
            const someOpen = group.some((p) => p.is_open);

            return (
              <div key={trimId} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900">
                      {TRIMESTER_LABELS[trimId]}
                    </h2>
                    {someOpen && (() => {
                      const effectiveOpen = group.filter((p) => p.effectively_open).length;
                      const scheduled = group.filter((p) => p.is_open && !p.effectively_open).length;
                      return (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          effectiveOpen === group.length
                            ? "bg-green-100 text-green-700"
                            : effectiveOpen > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {effectiveOpen === group.length ? "Todos abiertos" : effectiveOpen > 0 ? `${effectiveOpen} abierto${effectiveOpen > 1 ? "s" : ""}` : `${scheduled} programado${scheduled > 1 ? "s" : ""}`}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  {group.map((period) => (
                    <PeriodRow
                      key={period.id}
                      period={period}
                      toggling={toggling === period.id}
                      onToggle={() => togglePeriod(period)}
                      onUpdateDates={(od, cd) => updateDates(period.id, od, cd)}
                      onNotify={() => notifyTeachers(period)}
                      notifyingThis={notifying === period.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <strong>Nota:</strong> Cuando un periodo está cerrado o fuera de las fechas programadas, los profesores solo podrán consultar las calificaciones
          registradas, pero no podrán modificarlas. Si configuras fechas, el periodo se abrirá y cerrará automáticamente. Solo el administrador puede capturar en periodos cerrados.
        </div>
      </main>
    </div>
  );
}

function PeriodRow({
  period,
  toggling,
  onToggle,
  onUpdateDates,
  onNotify,
  notifyingThis,
}: {
  period: EvalPeriod;
  toggling: boolean;
  onToggle: () => void;
  onUpdateDates: (openDate: string, closeDate: string) => void;
  onNotify: () => void;
  notifyingThis: boolean;
}) {
  const [showDates, setShowDates] = useState(false);

  // Convert UTC ISO string to local datetime-local format for the input
  function isoToLocal(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [openDate, setOpenDate] = useState(isoToLocal(period.open_date));
  const [closeDate, setCloseDate] = useState(isoToLocal(period.close_date));

  function handleSaveDates() {
    onUpdateDates(openDate, closeDate);
    setShowDates(false);
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors ${
      period.effectively_open
        ? "bg-green-50 border-green-200"
        : period.is_open
        ? "bg-yellow-50 border-yellow-200"
        : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          period.effectively_open ? "bg-green-500 animate-pulse" : period.is_open ? "bg-yellow-400" : "bg-gray-300"
        }`} />
        <div>
          <span className="text-sm font-medium text-gray-900">{period.name}</span>
          <span className="text-xs text-gray-400 ml-2">Periodo {period.period_number}</span>
          {period.is_open && !period.effectively_open && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
              {period.open_date && new Date() < new Date(period.open_date) ? "Programado" : "Vencido"}
            </span>
          )}
          {period.effectively_open && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
              Abierto
            </span>
          )}
          {(period.open_date || period.close_date) && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {period.open_date && new Date(period.open_date).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" })}
              {period.open_date && period.close_date && " → "}
              {period.close_date && new Date(period.close_date).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        {period.effectively_open && (
          <button
            onClick={onNotify}
            disabled={notifyingThis}
            className="text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Notificar maestros por correo"
          >
            {notifyingThis ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            )}
            <span className="hidden sm:inline">Notificar</span>
          </button>
        )}
        <button
          onClick={() => setShowDates(!showDates)}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          title="Configurar fechas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            period.is_open ? "bg-green-500" : "bg-gray-300"
          } ${toggling ? "opacity-50" : ""}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            period.is_open ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      {showDates && (
        <div className="w-full mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Fecha apertura</label>
            <input
              type="datetime-local"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Fecha cierre</label>
            <input
              type="datetime-local"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
            <button onClick={() => setShowDates(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button onClick={handleSaveDates} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Guardar fechas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
