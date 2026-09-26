"use client";

import { useEffect, useState } from "react";

interface PeriodInfo {
  period_number: number;
  name: string;
  is_open: boolean;
  effectively_open: boolean;
  open_date: string | null;
  close_date: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}

export default function PeriodsTimeline() {
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [activePeriod, setActivePeriod] = useState<{ period_number: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setPeriods(data.periodsTimeline || []);
        setActivePeriod(data.activePeriod || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg flex-1" />
          ))}
        </div>
      </div>
    );
  }

  if (periods.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        Periodos de evaluación
      </h3>

      {/* Timeline bar */}
      <div className="flex gap-2">
        {periods.map((p) => {
          const isActive = activePeriod?.period_number === p.period_number;
          const isPast = !p.effectively_open && !isActive && p.close_date && new Date(p.close_date) < new Date();
          const isFuture = !p.effectively_open && !isActive && !isPast;

          return (
            <div
              key={p.period_number}
              className={`flex-1 rounded-xl p-3 border transition-all ${
                isActive
                  ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200 shadow-sm"
                  : isPast
                  ? "bg-gray-50 border-gray-200"
                  : "bg-white border-gray-200 border-dashed"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${
                  isActive ? "text-primary-700" : isPast ? "text-gray-500" : "text-gray-400"
                }`}>
                  {p.name}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-600 font-medium">Activo</span>
                  </span>
                )}
                {isPast && (
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isFuture && (
                  <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div className="text-[10px] text-gray-400 space-y-0.5">
                {p.open_date && (
                  <p>Abre: {formatDate(p.open_date)}</p>
                )}
                {p.close_date && (
                  <p>Cierra: {formatDate(p.close_date)}</p>
                )}
                {!p.open_date && !p.close_date && (
                  <p className="italic">Sin fechas</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
