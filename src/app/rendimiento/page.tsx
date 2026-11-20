"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  BarChart3,
  Users,
  AlertTriangle,
  Star,
  Medal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ───── types ───── */
interface FilaAprov {
  studentId: string;
  nombre: string;
  numeroControl: string | null;
  grupoId: string;
  grado: number;
  letra: string;
  periodo: number;
  promedio: number;
  materias: number;
  reprobadas: number;
  materiasReprobadas: string | null;
}

/* ───── constants ───── */
const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; header: string; bar: string }> = {
  1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", header: "bg-blue-600", bar: "bg-blue-500" },
  2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", header: "bg-emerald-600", bar: "bg-emerald-500" },
  3: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", header: "bg-purple-600", bar: "bg-purple-500" },
};

const PERIOD_LABELS: Record<number, string> = {
  0: "Todo el ciclo",
  1: "Septiembre",
  2: "Octubre",
  3: "Nov - Dic",
  4: "Ene - Feb",
  5: "Marzo",
  6: "Abril",
  7: "Mayo",
  8: "Julio Final",
  [-1]: "1er trimestre",
  [-2]: "2º trimestre",
  [-3]: "3er trimestre",
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
  const [filas, setFilas] = useState<FilaAprov[]>([]);
  const [periodos, setPeriodos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodo, setPeriodo] = useState<number>(0); // 0 = general, 1-8 = period, -1/-2/-3 = trimester
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

      const res = await fetch("/api/rendimiento/alumnos");
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setFilas(data.filas || []);
      setPeriodos(data.periodos || []);
      setLoading(false);
    }
    init();
  }, []);

  const displayProfile = effectiveProfile || profile;

  /* ── computed ── */
  const filasDelPeriodo = useMemo(() => {
    let f = filas.filter((x) => x.periodo === periodo);
    if (filterGrade) f = f.filter((x) => x.grado === filterGrade);
    return f;
  }, [filas, periodo, filterGrade]);

  // Stats
  const stats = useMemo(() => {
    const total = filasDelPeriodo.length;
    const riesgo = filasDelPeriodo.filter((f) => f.promedio < 7 || f.reprobadas > 0).length;
    const excelencia = filasDelPeriodo.filter((f) => f.promedio >= 9.95).length;
    const avgArr = filasDelPeriodo.map((f) => f.promedio);
    const avg = avgArr.length > 0
      ? Math.round((avgArr.reduce((a, b) => a + b, 0) / avgArr.length) * 10) / 10
      : null;
    return { total, riesgo, excelencia, avg };
  }, [filasDelPeriodo]);

  // Groups summary
  const groupStats = useMemo(() => {
    const map = new Map<string, { grupoId: string; grado: number; letra: string; students: FilaAprov[] }>();
    for (const f of filasDelPeriodo) {
      if (!map.has(f.grupoId)) map.set(f.grupoId, { grupoId: f.grupoId, grado: f.grado, letra: f.letra, students: [] });
      map.get(f.grupoId)!.students.push(f);
    }
    return Array.from(map.values()).sort((a, b) => a.grado - b.grado || a.letra.localeCompare(b.letra));
  }, [filasDelPeriodo]);

  // Top reprobadas
  const topReprobadas = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of filasDelPeriodo) {
      if (f.materiasReprobadas) {
        for (const m of f.materiasReprobadas.split(", ")) {
          map[m] = (map[m] || 0) + 1;
        }
      }
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [filasDelPeriodo]);

  // Per grade summary
  const porGrado = useMemo(() => {
    return [1, 2, 3].map((g) => {
      const gFilas = filasDelPeriodo.filter((f) => f.grado === g);
      const avgs = gFilas.map((f) => f.promedio);
      const avg = avgs.length > 0 ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;
      const riesgo = gFilas.filter((f) => f.promedio < 7 || f.reprobadas > 0).length;
      return { grado: g, promedio: avg, riesgo, total: gFilas.length };
    });
  }, [filasDelPeriodo]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando reportes…</span>
      </div>
    );
  }

  return (
    <Navbar userName={displayProfile!.full_name} userRole={displayProfile!.role}>
      <main className="page-content animate-fade-in">
        {/* ── Header with quick-link chips ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Reportes</h1>
              <p className="text-sm text-slate-500">
                Promedios, alumnos en riesgo (&lt;7) y materias con más reprobados (&lt;6)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/rendimiento/alumnos?vista=riesgo" className="btn-secondary text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" /> En riesgo
            </Link>
            <Link href="/rendimiento/alumnos?vista=diez" className="btn-secondary text-sm flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" /> Promedio 10
            </Link>
            <Link href="/rendimiento/alumnos?vista=lugares" className="btn-secondary text-sm flex items-center gap-1.5">
              <Medal className="w-4 h-4 text-violet-500" /> 1º–3º lugar
            </Link>
          </div>
        </div>

        {/* ── Period selector ── */}
        <div className="card !p-3 mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {/* General */}
            <PeriodPill active={periodo === 0} onClick={() => setPeriodo(0)} label="Todo el ciclo" />
            {/* Separator */}
            <span className="w-px bg-slate-200 mx-1" />
            {/* Monthly evaluations */}
            {periodos.map((p) => (
              <PeriodPill key={p} active={periodo === p} onClick={() => setPeriodo(p)}
                label={PERIOD_LABELS[p] || `P${p}`} />
            ))}
            {/* Separator */}
            <span className="w-px bg-slate-200 mx-1" />
            {/* Trimesters */}
            <PeriodPill active={periodo === -1} onClick={() => setPeriodo(-1)} label="1er Tri" />
            <PeriodPill active={periodo === -2} onClick={() => setPeriodo(-2)} label="2º Tri" />
            <PeriodPill active={periodo === -3} onClick={() => setPeriodo(-3)} label="3er Tri" />
          </div>
        </div>

        {/* ── Info banner ── */}
        <div className="card !p-3 mb-6 bg-blue-50/50 border-blue-100">
          <p className="text-xs text-blue-700">
            {periodo === 0 ? (
              <>Cifras de <strong>todo el ciclo</strong>: promedio de las evaluaciones capturadas hasta hoy.</>
            ) : periodo < 0 ? (
              <>Cifras del <strong>{PERIOD_LABELS[periodo]}</strong>: promedio de los periodos de ese trimestre.</>
            ) : (
              <>Cifras de <strong>{PERIOD_LABELS[periodo]}</strong>: promedio solo de esa evaluación mensual.</>
            )}
          </p>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className={`card !p-4 border ${scoreBg(stats.avg)}`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Promedio escolar</p>
            <p className={`text-4xl font-extrabold tabular-nums ${scoreColor(stats.avg)}`}>
              {stats.avg ?? "—"}
            </p>
          </div>
          <div className="card !p-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Alumnos</p>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-extrabold text-slate-700 tabular-nums">{stats.total}</p>
              <Users className="w-5 h-5 text-slate-300 mb-1" />
            </div>
          </div>
          <div className={`card !p-4 ${stats.riesgo > 0 ? "border border-red-200 bg-red-50/50" : ""}`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">En riesgo</p>
            <div className="flex items-end gap-2">
              <p className={`text-4xl font-extrabold tabular-nums ${stats.riesgo > 0 ? "text-red-600" : "text-green-600"}`}>
                {stats.riesgo}
              </p>
              {stats.riesgo > 0 && <AlertTriangle className="w-5 h-5 text-red-400 mb-1" />}
            </div>
            {stats.total > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">{Math.round((stats.riesgo / stats.total) * 100)}% del total</p>
            )}
          </div>
          <div className={`card !p-4 ${stats.excelencia > 0 ? "border border-amber-200 bg-amber-50/50" : ""}`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">Excelencia (10)</p>
            <div className="flex items-end gap-2">
              <p className={`text-4xl font-extrabold tabular-nums ${stats.excelencia > 0 ? "text-amber-600" : "text-slate-400"}`}>
                {stats.excelencia}
              </p>
              {stats.excelencia > 0 && <Star className="w-5 h-5 text-amber-400 mb-1" />}
            </div>
          </div>
        </div>

        {/* ── Grade filter + por grado ── */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <button onClick={() => setFilterGrade(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterGrade === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            Todos
          </button>
          {[1, 2, 3].map((g) => {
            const c = GRADE_COLORS[g];
            const gd = porGrado.find((x) => x.grado === g);
            return (
              <button key={g} onClick={() => setFilterGrade(filterGrade === g ? null : g)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filterGrade === g ? `${c.header} text-white` : `bg-white ${c.text} border ${c.border} hover:${c.bg}`
                }`}>
                <span>{g}°</span>
                {gd && gd.promedio !== null && (
                  <span className={`text-xs ${filterGrade === g ? "text-white/80" : "opacity-70"}`}>
                    ({gd.promedio})
                  </span>
                )}
                {gd && gd.riesgo > 0 && (
                  <span className={`text-[10px] ${filterGrade === g ? "text-white/70" : "text-red-500"}`}>
                    {gd.riesgo}⚠
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Top reprobadas bar chart ── */}
        {topReprobadas.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Por grado</h3>
              <div className="space-y-3">
                {porGrado.map((g) => (
                  <div key={g.grado} className="flex items-center gap-4">
                    <span className={`w-10 text-lg font-black ${GRADE_COLORS[g.grado].text}`}>{g.grado}°</span>
                    <span className={`px-3 py-1 rounded-lg text-base font-bold tabular-nums border ${scoreBg(g.promedio)} ${scoreColor(g.promedio)}`}>
                      {g.promedio ?? "—"}
                    </span>
                    <span className="text-sm text-slate-500">{g.riesgo} en riesgo</span>
                    <span className="text-xs text-slate-400">({g.total} alumnos)</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Materias con más reprobados</h3>
              <div className="space-y-2">
                {topReprobadas.map(([name, count]) => {
                  const max = topReprobadas[0][1] as number;
                  return (
                    <div key={name}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-sm text-slate-700">{name}</span>
                        <span className="text-xs font-semibold text-red-600 tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Group cards ── */}
        <h3 className="text-sm font-bold text-slate-700 mb-3">Por grupo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStats.map((g) => {
            const colors = GRADE_COLORS[g.grado] || GRADE_COLORS[1];
            const avg = g.students.length > 0
              ? Math.round((g.students.reduce((s, f) => s + f.promedio, 0) / g.students.length) * 10) / 10
              : null;
            const risk = g.students.filter((f) => f.promedio < 7 || f.reprobadas > 0);
            const riskPct = g.students.length > 0 ? Math.round((risk.length / g.students.length) * 100) : 0;
            const isExpanded = expandedGroup === g.grupoId;

            // Top 3 reprobadas for this group
            const repMap: Record<string, number> = {};
            g.students.forEach((f) => {
              if (f.materiasReprobadas) {
                for (const m of f.materiasReprobadas.split(", ")) {
                  repMap[m] = (repMap[m] || 0) + 1;
                }
              }
            });
            const topRep = Object.entries(repMap).sort(([, a], [, b]) => b - a).slice(0, 3);

            return (
              <div key={g.grupoId} className={`card overflow-hidden border ${colors.border}`}>
                <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-lg font-bold text-white">{g.grado}°{g.letra}</p>
                    <p className="text-xs text-white/70">{g.students.length} alumnos</p>
                  </div>
                  <span className={`text-3xl font-extrabold tabular-nums ${avg !== null ? "text-white" : "text-white/30"}`}>
                    {avg ?? "—"}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">En riesgo</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${risk.length > 0 ? "text-red-600" : "text-green-600"}`}>{risk.length}</span>
                      {risk.length > 0 && <span className="text-[10px] text-red-400">({riskPct}%)</span>}
                    </div>
                  </div>
                  {g.students.length > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${riskPct === 0 ? "bg-green-400" : riskPct < 20 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.max(riskPct, risk.length > 0 ? 4 : 0)}%` }} />
                    </div>
                  )}

                  {topRep.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Top reprobadas</p>
                      <div className="space-y-1">
                        {topRep.map(([n, c]) => (
                          <div key={n} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 truncate">{n}</span>
                            <span className="text-red-500 font-semibold ml-2">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {risk.length > 0 && (
                    <button onClick={() => setExpandedGroup(isExpanded ? null : g.grupoId)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 pt-1 transition-colors">
                      {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Ocultar</> : <><ChevronDown className="w-3.5 h-3.5" /> Ver {risk.length} en riesgo</>}
                    </button>
                  )}

                  {isExpanded && (
                    <div className="border-t border-slate-100 pt-2 space-y-1 animate-fade-in">
                      {risk.sort((a, b) => a.promedio - b.promedio).map((s) => (
                        <div key={s.studentId} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 truncate">{s.nombre}</span>
                          <span className={`font-bold tabular-nums ${scoreColor(s.promedio)}`}>{s.promedio.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Link href={`/concentrado/${g.grupoId}`}
                      className={`text-center text-[11px] font-medium px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}>
                      Concentrado
                    </Link>
                    <Link href={`/boleta/grupo/${g.grupoId}`}
                      className="text-center text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      Boletas
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {groupStats.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-slate-400 text-sm">
              {filasDelPeriodo.length === 0
                ? "Aún no hay calificaciones capturadas para este periodo."
                : "No hay datos con este filtro."}
            </p>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-slate-400 mt-6">
          Solo cuentan las materias curriculares (Tutoría, Vida Saludable, etc. no). «Todo el ciclo» es el promedio de los periodos capturados.
        </p>
      </main>
    </Navbar>
  );
}

/* ── Period pill component ── */
function PeriodPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
      }`}>
      {label}
    </button>
  );
}
