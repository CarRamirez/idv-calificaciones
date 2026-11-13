"use client";

import { useEffect, useState } from "react";

interface AtRiskStudent {
  id: string;
  name: string;
  avg: number;
}

interface PeriodData {
  avg: number | null;
  atRiskCount: number;
}

interface GroupPerformance {
  groupId: string;
  grade: number;
  letter: string;
  label: string;
  studentCount: number;
  avgScore: number | null;
  atRiskCount: number;
  atRiskStudents?: AtRiskStudent[];
  failingSubjects: { name: string; count: number }[];
  penaltyTotals?: { name: string; total: number }[];
  periodAvgs?: Record<number, PeriodData>;
  trimesterAvgs?: Record<number, PeriodData>;
}

type ViewMode = "total" | "mensual" | "trimestral";

const GRADE_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  2: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  3: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
};

const PERIOD_NAMES: Record<number, string> = {
  1: "Septiembre",
  2: "Octubre",
  3: "Nov-Diciembre",
  4: "Enero-Febrero",
  5: "Marzo",
  6: "Abril",
  7: "Mayo",
  8: "Junio",
};

const TRIMESTER_NAMES: Record<number, string> = {
  1: "1er Trimestre",
  2: "2do Trimestre",
  3: "3er Trimestre",
};

export default function PerformanceStats() {
  const [groups, setGroups] = useState<GroupPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRisk, setExpandedRisk] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("total");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedTrimester, setSelectedTrimester] = useState<number>(1);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.performanceByGroup || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-56 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) return null;

  // Get the displayed avg and atRisk for each group based on view mode
  function getDisplayData(g: GroupPerformance): { avg: number | null; atRiskCount: number } {
    if (viewMode === "mensual" && g.periodAvgs) {
      return g.periodAvgs[selectedPeriod] || { avg: null, atRiskCount: 0 };
    }
    if (viewMode === "trimestral" && g.trimesterAvgs) {
      return g.trimesterAvgs[selectedTrimester] || { avg: null, atRiskCount: 0 };
    }
    return { avg: g.avgScore, atRiskCount: g.atRiskCount };
  }

  // Summary stats based on current view
  const displayGroups = groups.map((g) => ({ ...g, display: getDisplayData(g) }));
  const totalAtRisk = displayGroups.reduce((s, g) => s + g.display.atRiskCount, 0);
  const totalStudents = groups.reduce((s, g) => s + g.studentCount, 0);
  const groupsWithAvg = displayGroups.filter((g) => g.display.avg !== null);
  const overallAvg = groupsWithAvg.length > 0
    ? Math.round(
        groupsWithAvg.reduce((s, g) => s + g.display.avg!, 0) /
        groupsWithAvg.length * 10
      ) / 10
    : null;

  const viewLabel =
    viewMode === "mensual"
      ? PERIOD_NAMES[selectedPeriod]
      : viewMode === "trimestral"
      ? TRIMESTER_NAMES[selectedTrimester]
      : "Total (ciclo)";

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Rendimiento por grupo
          </h3>

          {/* View mode selector */}
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {(["total", "mensual", "trimestral"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    viewMode === mode
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode === "total" ? "Total" : mode === "mensual" ? "Mensual" : "Trimestral"}
                </button>
              ))}
            </div>

            {/* Period/Trimester sub-selector */}
            {viewMode === "mensual" && (
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-300"
              >
                {Object.entries(PERIOD_NAMES).map(([p, name]) => (
                  <option key={p} value={p}>{name}</option>
                ))}
              </select>
            )}
            {viewMode === "trimestral" && (
              <select
                value={selectedTrimester}
                onChange={(e) => setSelectedTrimester(Number(e.target.value))}
                className="text-[11px] border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-300"
              >
                {Object.entries(TRIMESTER_NAMES).map(([t, name]) => (
                  <option key={t} value={t}>{name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* View label */}
        {viewMode !== "total" && (
          <p className="text-[11px] text-slate-400 mb-2">
            Mostrando: <span className="font-medium text-slate-600">{viewLabel}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-4 mb-4">
          {overallAvg !== null && (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${overallAvg >= 7 ? "text-green-600" : overallAvg >= 6 ? "text-amber-600" : "text-red-600"}`}>
                {overallAvg}
              </span>
              <span className="text-xs text-slate-400">
                promedio<br/>general
              </span>
            </div>
          )}
          {totalAtRisk > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-red-500">{totalAtRisk}</span>
              <span className="text-xs text-slate-400">
                alumnos<br/>en riesgo
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-slate-400">{totalStudents}</span>
            <span className="text-xs text-slate-400">
              alumnos<br/>activos
            </span>
          </div>
        </div>

        {/* Group cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayGroups.map((g) => {
            const colors = GRADE_COLORS[g.grade] || GRADE_COLORS[1];
            const displayAvg = g.display.avg;
            const displayAtRisk = g.display.atRiskCount;
            const scoreColor = displayAvg === null
              ? "text-slate-400"
              : displayAvg >= 7
              ? "text-green-600"
              : displayAvg >= 6
              ? "text-amber-600"
              : "text-red-600";

            return (
              <div
                key={g.groupId}
                className={`rounded-xl p-3 ${colors.bg} ring-1 ${colors.ring}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold ${colors.text}`}>
                    {g.label}
                  </span>
                  <span className={`text-lg font-extrabold ${scoreColor}`}>
                    {displayAvg ?? "—"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-1">
                  {g.studentCount} alumnos
                </p>

                {displayAtRisk > 0 && (
                  <div>
                    <button
                      onClick={() => {
                        setExpandedRisk((prev) => {
                          const next = new Set(prev);
                          if (next.has(g.groupId)) next.delete(g.groupId);
                          else next.add(g.groupId);
                          return next;
                        });
                      }}
                      className="text-[11px] text-red-600 font-medium flex items-center gap-1 hover:text-red-700 transition-colors w-full"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span>{displayAtRisk} en riesgo</span>
                      <svg
                        className={`w-3 h-3 ml-auto transition-transform ${expandedRisk.has(g.groupId) ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* At-risk student list only shows in total view */}
                    {viewMode === "total" && expandedRisk.has(g.groupId) && g.atRiskStudents && g.atRiskStudents.length > 0 && (
                      <div className="mt-1.5 space-y-1 bg-red-50 rounded-lg p-2">
                        {g.atRiskStudents.map((s) => (
                          <div key={s.id} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-700 truncate mr-1">{s.name}</span>
                            <span className="text-red-600 font-bold flex-shrink-0">{s.avg}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {g.failingSubjects.length > 0 && viewMode === "total" && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">
                      Más reprobadas
                    </p>
                    {g.failingSubjects.map((s, i) => (
                      <p key={i} className="text-[10px] text-slate-600 flex items-center justify-between">
                        <span>{s.name}</span>
                        <span className="text-red-500 font-medium">{s.count}</span>
                      </p>
                    ))}
                  </div>
                )}

                {g.penaltyTotals && g.penaltyTotals.length > 0 && viewMode === "total" && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase">
                      Incidencias (total)
                    </p>
                    {g.penaltyTotals.map((pt, i) => (
                      <p key={i} className="text-[10px] text-slate-600 flex items-center justify-between">
                        <span>{pt.name === "TAR" ? "Tareas" : pt.name === "INAS" ? "Inasistencias" : "Incumplimientos"}</span>
                        <span className="text-orange-600 font-medium">{pt.total}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
