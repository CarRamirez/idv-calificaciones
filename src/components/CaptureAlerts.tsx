"use client";

import { useEffect, useState } from "react";

interface CaptureAlert {
  teacherId: string;
  teacherName: string;
  pct: number;
  totalCaptured: number;
  totalExpected: number;
  pendingDetails: string[];
}

export default function CaptureAlerts() {
  const [alerts, setAlerts] = useState<CaptureAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activePeriodName, setActivePeriodName] = useState("");

  // Email state
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: string[];
    noEmail: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.captureAlerts || []);
        setActivePeriodName(data.activePeriod?.name || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleTeacher = (id: string) => {
    setSelectedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const incomplete = alerts.filter((a) => a.pct < 100);
    if (selectedTeachers.size === incomplete.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(incomplete.map((a) => a.teacherId)));
    }
  };

  const sendReminders = async (teacherIds: string[]) => {
    if (teacherIds.length === 0) return;
    setSending(true);
    setSendResult(null);

    const pendingMap: Record<string, string[]> = {};
    alerts.forEach((a) => {
      if (teacherIds.includes(a.teacherId)) {
        pendingMap[a.teacherId] = a.pendingDetails;
      }
    });

    try {
      const res = await fetch("/api/email/capture-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherIds,
          periodName: activePeriodName,
          pendingMap,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      // Clear selection after sending
      setSelectedTeachers(new Set());
    } catch {
      setSendResult({ sent: 0, failed: ["Error de conexión"], noEmail: [] });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="card p-4 border border-green-200 bg-green-50/50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-green-700">
            Todos los profesores han completado su captura
          </span>
        </div>
      </div>
    );
  }

  const PREVIEW_COUNT = 5;
  const incompleteAlerts = alerts.filter((a) => a.pct < 100);
  const visibleAlerts = showAll ? alerts : alerts.slice(0, PREVIEW_COUNT);
  const hiddenCount = alerts.length - PREVIEW_COUNT;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-800">
              Captura pendiente ({incompleteAlerts.length} profesor{incompleteAlerts.length !== 1 ? "es" : ""})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > PREVIEW_COUNT && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                {showAll ? "Ver menos" : `Ver todos (${alerts.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Email action bar */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={selectAll}
            className="text-[11px] font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
          >
            {selectedTeachers.size === incompleteAlerts.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>

          {selectedTeachers.size > 0 && (
            <button
              onClick={() => sendReminders(Array.from(selectedTeachers))}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {sending ? "Enviando..." : `Enviar recordatorio (${selectedTeachers.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Send result toast */}
      {sendResult && (
        <div className={`px-4 py-2.5 text-xs font-medium border-b ${
          sendResult.sent > 0 && sendResult.failed.length === 0
            ? "bg-green-50 text-green-700 border-green-200"
            : sendResult.failed.length > 0
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {sendResult.sent > 0 && (
                <span>✓ {sendResult.sent} correo{sendResult.sent !== 1 ? "s" : ""} enviado{sendResult.sent !== 1 ? "s" : ""}</span>
              )}
              {sendResult.failed.length > 0 && (
                <span> · Falló: {sendResult.failed.join(", ")}</span>
              )}
              {sendResult.noEmail.length > 0 && (
                <span> · Sin correo: {sendResult.noEmail.join(", ")}</span>
              )}
            </div>
            <button onClick={() => setSendResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {visibleAlerts.map((a) => (
          <div key={a.teacherId} className="px-4 py-3">
            <div className="flex items-start gap-2">
              {/* Checkbox for email selection */}
              {a.pct < 100 && (
                <label className="flex items-center mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.has(a.teacherId)}
                    onChange={() => toggleTeacher(a.teacherId)}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
              )}

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setExpanded(expanded === a.teacherId ? null : a.teacherId)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {a.teacherName.charAt(0)}
                      </span>
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {a.teacherName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Individual send button */}
                      {a.pct < 100 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendReminders([a.teacherId]);
                          }}
                          disabled={sending}
                          className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Enviar recordatorio individual"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <span className={`text-xs font-bold ${
                        a.pct === 100 ? "text-green-600" : a.pct < 30 ? "text-red-600" : a.pct < 70 ? "text-amber-600" : "text-green-600"
                      }`}>
                        {a.pct}%
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expanded === a.teacherId ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        a.pct === 100 ? "bg-green-500" : a.pct < 30 ? "bg-red-500" : a.pct < 70 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(a.pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {a.totalCaptured} de {a.totalExpected} calificaciones
                  </p>
                </button>

                {expanded === a.teacherId && a.pendingDetails.length > 0 && (
                  <div className="mt-2 pl-9 space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Pendientes:
                    </p>
                    {a.pendingDetails.map((d, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                        {d}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-3 text-sm font-medium text-amber-700 bg-amber-50/50 hover:bg-amber-50 border-t border-amber-100 transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Mostrar {hiddenCount} profesor{hiddenCount !== 1 ? "es" : ""} más
        </button>
      )}
    </div>
  );
}
