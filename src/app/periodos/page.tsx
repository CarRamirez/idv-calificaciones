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
  const [notifyModalPeriod, setNotifyModalPeriod] = useState<EvalPeriod | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email: string | null; role: string; label: string | null }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [customMessage, setCustomMessage] = useState("");

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

  async function openNotifyModal(period: EvalPeriod) {
    setNotifyModalPeriod(period);
    setSelectedUserIds(new Set());
    setUserSearch("");
    setCustomMessage("");
    if (allUsers.length === 0) {
      setLoadingUsers(true);
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        setAllUsers(data.users || []);
      } catch {
        setAllUsers([]);
      }
      setLoadingUsers(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAllFiltered(users: typeof allUsers) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      users.forEach((u) => { if (u.email) next.add(u.id); });
      return next;
    });
  }

  function deselectAll() {
    setSelectedUserIds(new Set());
  }

  async function sendNotification() {
    if (!notifyModalPeriod || selectedUserIds.size === 0) return;
    setNotifying(notifyModalPeriod.id);
    setNotifyResult(null);
    try {
      const res = await fetch("/api/admin/periods/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodName: notifyModalPeriod.name,
          openDate: notifyModalPeriod.open_date,
          closeDate: notifyModalPeriod.close_date,
          recipientIds: Array.from(selectedUserIds),
          customMessage: customMessage || undefined,
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
    setNotifyModalPeriod(null);
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
                      onNotify={() => openNotifyModal(period)}
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

        {/* ── Notification Modal ── */}
        {notifyModalPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNotifyModalPeriod(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-900">Notificar — {notifyModalPeriod.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Selecciona los usuarios a los que deseas enviar la notificación por correo.</p>
              </div>

              <div className="px-5 py-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input-field text-sm w-full"
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => {
                      const filtered = allUsers.filter((u) => {
                        if (!u.email) return false;
                        if (!userSearch.trim()) return true;
                        return u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.role.toLowerCase().includes(userSearch.toLowerCase());
                      });
                      selectAllFiltered(filtered);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700">
                    Deseleccionar
                  </button>
                  <span className="ml-auto text-xs text-gray-400">
                    {selectedUserIds.size} seleccionado{selectedUserIds.size !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-2 min-h-0">
                {loadingUsers ? (
                  <div className="py-8 text-center text-sm text-gray-400">Cargando usuarios...</div>
                ) : (
                  (() => {
                    const roleLabels: Record<string, string> = {
                      teacher: "Profesor",
                      admin: "Administrador",
                      directora_anita: "Directora",
                      viewer: "Visor",
                    };
                    const q = userSearch.toLowerCase();
                    const filtered = allUsers.filter((u) => {
                      if (!q) return true;
                      return u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || (u.label || "").toLowerCase().includes(q);
                    });

                    // Group by role
                    const byRole: Record<string, typeof allUsers> = {};
                    filtered.forEach((u) => {
                      const key = u.role;
                      if (!byRole[key]) byRole[key] = [];
                      byRole[key].push(u);
                    });

                    const roleOrder = ["teacher", "admin", "directora_anita", "viewer"];
                    const sortedRoles = Array.from(new Set([...roleOrder.filter((r) => byRole[r]), ...Object.keys(byRole)]));

                    return sortedRoles.map((role) => (
                      <div key={role} className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {roleLabels[role] || role} ({byRole[role].length})
                        </p>
                        {byRole[role].map((u) => (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              selectedUserIds.has(u.id) ? "bg-primary-50" : "hover:bg-gray-50"
                            } ${!u.email ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.has(u.id)}
                              onChange={() => u.email && toggleUser(u.id)}
                              disabled={!u.email}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-800 font-medium">{u.full_name}</span>
                              {u.label && <span className="ml-1 text-[10px] text-gray-400">({u.label})</span>}
                              <span className="block text-[11px] text-gray-400 truncate">
                                {u.email || "Sin correo registrado"}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    ));
                  })()
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-200 space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Mensaje adicional (opcional)</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Ej: Favor de capturar antes del viernes..."
                    rows={2}
                    className="input-field text-sm w-full resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setNotifyModalPeriod(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={sendNotification}
                    disabled={selectedUserIds.size === 0 || notifying === notifyModalPeriod.id}
                    className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {notifying === notifyModalPeriod.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Enviar a {selectedUserIds.size} usuario{selectedUserIds.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
