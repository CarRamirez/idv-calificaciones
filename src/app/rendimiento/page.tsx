"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface GroupPerformance {
  groupId: string;
  grade: number;
  letter: string;
  label: string;
  studentCount: number;
  avgScore: number | null;
  atRiskCount: number;
  failingSubjects: { name: string; count: number }[];
  penaltyTotals?: { name: string; total: number }[];
}

const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; header: string; light: string }> = {
  1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", header: "bg-blue-600", light: "bg-blue-100" },
  2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", header: "bg-emerald-600", light: "bg-emerald-100" },
  3: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", header: "bg-purple-600", light: "bg-purple-100" },
};

export default function RendimientoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [groups, setGroups] = useState<GroupPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/effective-profile")
      .then((r) => r.json())
      .then((data) => { if (data.full_name) setEffectiveProfile(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!prof) { router.push("/dashboard"); return; }
      setProfile(prof);

      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setGroups(data.performanceByGroup || []);
      setLoading(false);
    }
    init();
  }, []);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando rendimiento...</div>
      </div>
    );
  }

  const displayProfile = effectiveProfile || profile;
  const filteredGroups = filterGrade ? groups.filter((g) => g.grade === filterGrade) : groups;

  const totalStudents = filteredGroups.reduce((s, g) => s + g.studentCount, 0);
  const totalAtRisk = filteredGroups.reduce((s, g) => s + g.atRiskCount, 0);
  const withAvg = filteredGroups.filter((g) => g.avgScore !== null);
  const overallAvg = withAvg.length > 0
    ? Math.round(withAvg.reduce((s, g) => s + g.avgScore!, 0) / withAvg.length * 10) / 10
    : null;

  // Collect all failing subjects across groups
  const subjectFailMap: Record<string, number> = {};
  filteredGroups.forEach((g) => {
    g.failingSubjects.forEach((s) => {
      subjectFailMap[s.name] = (subjectFailMap[s.name] || 0) + s.count;
    });
  });
  const topFailingSubjects = Object.entries(subjectFailMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="page-container">
      <Navbar userName={displayProfile.full_name} userRole={displayProfile.role} />
      <main className="page-content animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Rendimiento por Grupo
            </h1>
            <p className="text-sm text-gray-500">Promedios, alumnos en riesgo y materias más reprobadas</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Inicio</Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card !p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Promedio general</p>
            <p className={`text-3xl font-extrabold ${
              overallAvg === null ? "text-gray-300" : overallAvg >= 7 ? "text-green-600" : overallAvg >= 6 ? "text-amber-600" : "text-red-600"
            }`}>
              {overallAvg ?? "—"}
            </p>
          </div>
          <div className="card !p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Alumnos activos</p>
            <p className="text-3xl font-extrabold text-gray-700">{totalStudents}</p>
          </div>
          <div className="card !p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">En riesgo (&lt;6)</p>
            <p className={`text-3xl font-extrabold ${totalAtRisk > 0 ? "text-red-600" : "text-green-600"}`}>
              {totalAtRisk}
            </p>
            {totalStudents > 0 && (
              <p className="text-[10px] text-gray-400">{Math.round((totalAtRisk / totalStudents) * 100)}% del total</p>
            )}
          </div>
          <div className="card !p-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Grupos</p>
            <p className="text-3xl font-extrabold text-gray-700">{filteredGroups.length}</p>
          </div>
        </div>

        {/* Filter by grade */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterGrade(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterGrade === null ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Todos
          </button>
          {[1, 2, 3].map((g) => (
            <button
              key={g}
              onClick={() => setFilterGrade(filterGrade === g ? null : g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterGrade === g ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {g}° grado
            </button>
          ))}
        </div>

        {/* Top failing subjects */}
        {topFailingSubjects.length > 0 && (
          <div className="card p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Materias con más reprobados</h3>
            <div className="space-y-2">
              {topFailingSubjects.map(([name, count], i) => {
                const maxCount = topFailingSubjects[0][1] as number;
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-gray-700">{name}</span>
                        <span className="text-xs font-bold text-red-600">{count} reprobados</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Group detail cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((g) => {
            const colors = GRADE_COLORS[g.grade] || GRADE_COLORS[1];
            const scoreColor = g.avgScore === null
              ? "text-gray-400"
              : g.avgScore >= 7
              ? "text-green-600"
              : g.avgScore >= 6
              ? "text-amber-600"
              : "text-red-600";

            const atRiskPct = g.studentCount > 0 ? Math.round((g.atRiskCount / g.studentCount) * 100) : 0;

            return (
              <div key={g.groupId} className={`card overflow-hidden border ${colors.border}`}>
                <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-lg font-bold text-white">{g.label}</p>
                    <p className="text-xs text-white/70">{g.studentCount} alumnos</p>
                  </div>
                  <span className={`text-3xl font-extrabold ${g.avgScore !== null ? "text-white" : "text-white/30"}`}>
                    {g.avgScore ?? "—"}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* At risk */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">En riesgo</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${g.atRiskCount > 0 ? "text-red-600" : "text-green-600"}`}>
                        {g.atRiskCount}
                      </span>
                      {g.atRiskCount > 0 && (
                        <span className="text-[10px] text-red-400">({atRiskPct}%)</span>
                      )}
                    </div>
                  </div>

                  {/* Risk bar */}
                  {g.studentCount > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          atRiskPct === 0 ? "bg-green-400" : atRiskPct < 20 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.max(atRiskPct, atRiskPct > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  )}

                  {/* Failing subjects */}
                  {g.failingSubjects.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Materias más reprobadas
                      </p>
                      <div className="space-y-1">
                        {g.failingSubjects.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{s.name}</span>
                            <span className="text-red-500 font-semibold">{s.count} rep.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Penalty totals */}
                  {g.penaltyTotals && g.penaltyTotals.some((p) => p.total > 0) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Incidencias acumuladas
                      </p>
                      <div className="flex gap-3">
                        {g.penaltyTotals.map((p) => (
                          <div key={p.name} className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">{p.name}:</span>
                            <span className={`font-bold ${p.total > 0 ? "text-red-600" : "text-gray-400"}`}>
                              {p.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/concentrado/${g.groupId}`}
                      className={`flex-1 text-center text-[11px] font-medium px-2 py-1.5 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                    >
                      Concentrado
                    </Link>
                    <Link
                      href={`/boleta/grupo/${g.groupId}`}
                      className="flex-1 text-center text-[11px] font-medium px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Boletas
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-gray-400 text-sm">No hay datos de rendimiento disponibles</p>
          </div>
        )}
      </main>
    </div>
  );
}
