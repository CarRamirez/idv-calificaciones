"use client";

import { useEffect, useState } from "react";

interface GroupPerformance {
  groupId: string;
  grade: number;
  letter: string;
  label: string;
  studentCount: number;
  avgScore: number | null;
  atRiskCount: number;
  failingSubjects: { name: string; count: number }[];
}

const GRADE_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  2: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  3: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
};

export default function PerformanceStats() {
  const [groups, setGroups] = useState<GroupPerformance[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="h-4 bg-gray-200 rounded w-56 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (groups.length === 0) return null;

  // Summary stats
  const totalAtRisk = groups.reduce((s, g) => s + g.atRiskCount, 0);
  const totalStudents = groups.reduce((s, g) => s + g.studentCount, 0);
  const overallAvg = groups.filter(g => g.avgScore !== null).length > 0
    ? Math.round(
        groups.filter(g => g.avgScore !== null).reduce((s, g) => s + g.avgScore!, 0) /
        groups.filter(g => g.avgScore !== null).length * 10
      ) / 10
    : null;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Rendimiento por grupo
        </h3>

        <div className="flex flex-wrap gap-4 mb-4">
          {overallAvg !== null && (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-extrabold ${overallAvg >= 7 ? "text-green-600" : overallAvg >= 6 ? "text-amber-600" : "text-red-600"}`}>
                {overallAvg}
              </span>
              <span className="text-xs text-gray-400">
                promedio<br/>general
              </span>
            </div>
          )}
          {totalAtRisk > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-red-500">{totalAtRisk}</span>
              <span className="text-xs text-gray-400">
                alumnos<br/>en riesgo
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-gray-400">{totalStudents}</span>
            <span className="text-xs text-gray-400">
              alumnos<br/>activos
            </span>
          </div>
        </div>

        {/* Group cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {groups.map((g) => {
            const colors = GRADE_COLORS[g.grade] || GRADE_COLORS[1];
            const scoreColor = g.avgScore === null
              ? "text-gray-400"
              : g.avgScore >= 7
              ? "text-green-600"
              : g.avgScore >= 6
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
                    {g.avgScore ?? "—"}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 mb-1">
                  {g.studentCount} alumnos
                </p>

                {g.atRiskCount > 0 && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {g.atRiskCount} en riesgo
                  </p>
                )}

                {g.failingSubjects.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[9px] font-semibold text-gray-400 uppercase">
                      Más reprobadas
                    </p>
                    {g.failingSubjects.map((s, i) => (
                      <p key={i} className="text-[10px] text-gray-600 flex items-center justify-between">
                        <span>{s.name}</span>
                        <span className="text-red-500 font-medium">{s.count}</span>
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
