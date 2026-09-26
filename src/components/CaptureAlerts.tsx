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

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.captureAlerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-sm font-semibold text-amber-800">
          Captura pendiente ({alerts.length} profesor{alerts.length !== 1 ? "es" : ""})
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {alerts.map((a) => (
          <div key={a.teacherId} className="px-4 py-3">
            <button
              onClick={() => setExpanded(expanded === a.teacherId ? null : a.teacherId)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                    {a.teacherName.charAt(0)}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {a.teacherName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    a.pct < 30 ? "text-red-600" : a.pct < 70 ? "text-amber-600" : "text-green-600"
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
                    a.pct < 30 ? "bg-red-500" : a.pct < 70 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${a.pct}%` }}
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
        ))}
      </div>
    </div>
  );
}
