"use client";

import { Fragment, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Medal,
  BarChart3,
} from "lucide-react";

/* ───── types ───── */
interface AtRiskStudent {
  id: string;
  name: string;
  avg: number;
}

interface GroupPerformance {
  groupId: string;
  grade: number;
  letter: string;
  label: string;
  studentCount: number;
  avgScore: number | null;
  atRiskCount: number;
  atRiskStudents: AtRiskStudent[];
  failingSubjects: { name: string; count: number }[];
  penaltyTotals?: { name: string; total: number }[];
  periodAvgs: Record<number, { avg: number | null; atRiskCount: number }>;
  trimesterAvgs: Record<number, { avg: number | null; atRiskCount: number }>;
}

/* ───── color helpers ───── */
const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; header: string; light: string; bar: string }> = {
  1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", header: "bg-blue-600", light: "bg-blue-100", bar: "bg-blue-500" },
  2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", header: "bg-emerald-600", light: "bg-emerald-100", bar: "bg-emerald-500" },
  3: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", header: "bg-purple-600", light: "bg-purple-100", bar: "bg-purple-500" },
};

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 8) return "text-green-600";
  if (score >= 7) return "text-lime-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-100";
  if (score >= 8) return "bg-green-50 border-green-200";
  if (score >= 7) return "bg-lime-50 border-lime-200";
  if (score >= 6) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

/* ───── main ───── */
export default function ReportesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [groups, setGroups] = useState<GroupPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [trimestre, setTrimestre] = useState<number>(0); // 0 = all, 1-3 = trimester
  const [filterGrade, setFilterGrade] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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

  /* ── computed ── */
  const filteredGroups = useMemo(() => {
    let g = groups;
    if (filterGrade) g = g.filter((x) => x.grade === filterGrade);
    return g;
  }, [groups, filterGrade]);

  // Stats based on trimester selection
  const stats = useMemo(() => {
    let totalStudents = 0;
    let totalAtRisk = 0;
    let avgSum = 0;
    let avgCount = 0;

    for (const g of filteredGroups) {
      totalStudents += g.studentCount;
      if (trimestre === 0) {
        totalAtRisk += g.atRiskCount;
        if (g.avgScore !== null) { avgSum += g.avgScore; avgCount++; }
      } else {
        const ta = g.trimesterAvgs[trimestre];
        if (ta) {
          totalAtRisk += ta.atRiskCount;
          if (ta.avg !== null) { avgSum += ta.avg; avgCount++; }
        }
      }
    }

    const avg = avgCount > 0 ? Math.round((avgSum / avgCount) * 10) / 10 : null;
    return { totalStudents, totalAtRisk, avg, groupCount: filteredGroups.length };
  }, [filteredGroups, trimestre]);

  // Top failing subjects across all filtered groups
  const topReprobadas = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGroups.forEach((g) => {
      g.failingSubjects.forEach((s) => {
        map[s.name] = (map[s.name] || 0) + s.count;
      });
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [filteredGroups]);

  const displayProfile = effectiveProfile || profile;

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando reportes…</span>
      </div>
    );
  }

  function getGroupAvg(g: GroupPerformance): number | null {
    if (trimestre === 0) return g.avgScore;
    return g.trimesterAvgs[trimestre]?.avg ?? null;
  }

  function getGroupRisk(g: GroupPerformance): number {
    if (trimestre === 0) return g.atRiskCount;
    return g.trimesterAvgs[trimestre]?.atRiskCount ?? 0;
  }

  return (
    <Navbar userName={displayProfile!.full_name} userRole={displayProfile!.role}>
      <main className="page-content animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Reportes</h1>
              <p className="text-sm text-slate-500">Rendimiento académico por grupo y trimestre</p>
            </div>
          </div>
        </div>

        {/* ── Trimester pills ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 0, label: "Todo el ciclo" },
            { value: 1, label: "1er trimestre" },
            { value: 2, label: "2º trimestre" },
            { value: 3, label: "3er trimestre" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTrimestre(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                trimestre === t.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Summary cards (ResumenRendimiento) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Promedio escolar */}
          <div className={`card !p-4 border ${scoreBg(stats.avg)}`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Promedio escolar</p>
            <p className={`text-4xl font-extrabold tabular-nums ${scoreColor(stats.avg)}`}>
              {stats.avg ?? "—"}
            </p>
          </div>

          {/* Alumnos activos */}
          <div className="card !p-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Alumnos activos</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-extrabold text-slate-700 tabular-nums">{stats.totalStudents}</p>
              <Users className="w-5 h-5 text-slate-300 mb-1" />
            </div>
          </div>

          {/* En riesgo */}
          <div className={`card !p-4 ${stats.totalAtRisk > 0 ? "border border-red-200 bg-red-50/50" : ""}`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">En riesgo (&lt;6)</p>
            <div className="flex items-end gap-2">
              <p className={`text-4xl font-extrabold tabular-nums ${stats.totalAtRisk > 0 ? "text-red-600" : "text-green-600"}`}>
                {stats.totalAtRisk}
              </p>
              {stats.totalAtRisk > 0 && <AlertTriangle className="w-5 h-5 text-red-400 mb-1" />}
            </div>
            {stats.totalStudents > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {Math.round((stats.totalAtRisk / stats.totalStudents) * 100)}% del total
              </p>
            )}
          </div>

          {/* Grupos */}
          <div className="card !p-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Grupos</p>
            <p className="text-4xl font-extrabold text-slate-700 tabular-nums">{stats.groupCount}</p>
          </div>
        </div>

        {/* ── Grade filter ── */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterGrade(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterGrade === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos
          </button>
          {[1, 2, 3].map((g) => {
            const c = GRADE_COLORS[g];
            return (
              <button
                key={g}
                onClick={() => setFilterGrade(filterGrade === g ? null : g)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterGrade === g ? `${c.header} text-white` : `bg-white ${c.text} border ${c.border} hover:${c.bg}`
                }`}
              >
                {g}° grado
              </button>
            );
          })}
        </div>

        {/* ── Top failing subjects ── */}
        {topReprobadas.length > 0 && (
          <div className="card p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Materias con más reprobados</h3>
            <div className="space-y-2">
              {topReprobadas.map(([name, count], i) => {
                const maxCount = topReprobadas[0][1] as number;
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
                        <span className="text-xs font-bold text-red-600 ml-2 shrink-0">{count} rep.</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Group cards (PerformanceStats) ── */}
        <h3 className="text-sm font-bold text-slate-700 mb-3">Por grupo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((g) => {
            const colors = GRADE_COLORS[g.grade] || GRADE_COLORS[1];
            const avg = getGroupAvg(g);
            const risk = getGroupRisk(g);
            const riskPct = g.studentCount > 0 ? Math.round((risk / g.studentCount) * 100) : 0;
            const isExpanded = expandedGroup === g.groupId;

            return (
              <div key={g.groupId} className={`card overflow-hidden border ${colors.border}`}>
                {/* Header */}
                <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-lg font-bold text-white">{g.label}</p>
                    <p className="text-xs text-white/70">{g.studentCount} alumnos</p>
                  </div>
                  <span className={`text-3xl font-extrabold tabular-nums ${avg !== null ? "text-white" : "text-white/30"}`}>
                    {avg ?? "—"}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {/* At risk + bar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">En riesgo</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${risk > 0 ? "text-red-600" : "text-green-600"}`}>
                        {risk}
                      </span>
                      {risk > 0 && (
                        <span className="text-[10px] text-red-400">({riskPct}%)</span>
                      )}
                    </div>
                  </div>
                  {g.studentCount > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          riskPct === 0 ? "bg-green-400" : riskPct < 20 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.max(riskPct, risk > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  )}

                  {/* Top 3 failing subjects */}
                  {g.failingSubjects.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Top reprobadas
                      </p>
                      <div className="space-y-1">
                        {g.failingSubjects.slice(0, 3).map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 truncate">{s.name}</span>
                            <span className="text-red-500 font-semibold ml-2">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expand button for at-risk students */}
                  {g.atRiskStudents && g.atRiskStudents.length > 0 && (
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : g.groupId)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 pt-1 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Ocultar alumnos en riesgo
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Ver {g.atRiskStudents.length} en riesgo
                        </>
                      )}
                    </button>
                  )}

                  {/* Expanded at-risk list */}
                  {isExpanded && g.atRiskStudents && (
                    <div className="border-t border-slate-100 pt-2 space-y-1 animate-fade-in">
                      {g.atRiskStudents.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate">{s.name}</span>
                          <span className={`font-bold tabular-nums ${scoreColor(s.avg)}`}>
                            {s.avg.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chip links */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Link
                      href={`/concentrado/${g.groupId}`}
                      className={`text-center text-[11px] font-medium px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                    >
                      Concentrado
                    </Link>
                    <Link
                      href={`/boleta/grupo/${g.groupId}`}
                      className="text-center text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
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
            <p className="text-slate-400 text-sm">No hay datos de rendimiento disponibles</p>
          </div>
        )}
      </main>
    </Navbar>
  );
}
