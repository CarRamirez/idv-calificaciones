"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  AlertTriangle,
  Star,
  Medal,
  ArrowLeft,
  Users,
  ChevronDown,
} from "lucide-react";

/* ───── types ───── */
type Vista = "riesgo" | "diez" | "lugares";

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
const VISTA_CONFIG: Record<Vista, { label: string; desc: string; icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  riesgo: { label: "En riesgo", desc: "Promedio < 7 o reprobadas", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  diez: { label: "Promedio 10", desc: "Promedio ≥ 9.95", icon: Star, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  lugares: { label: "1º–3º lugar", desc: "Mejores 3 por grupo", icon: Medal, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
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

const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; header: string }> = {
  1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", header: "bg-blue-600" },
  2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", header: "bg-emerald-600" },
  3: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", header: "bg-purple-600" },
};

const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/* ───── helpers ───── */
function enRiesgo(f: FilaAprov): boolean {
  return f.promedio < 7 || f.reprobadas > 0;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 7) return "text-lime-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

/** Dense ranking: top 3 per group */
function computeLugares(filas: FilaAprov[]): (FilaAprov & { lugar: number })[] {
  const byGroup = new Map<string, FilaAprov[]>();
  for (const f of filas) {
    if (!byGroup.has(f.grupoId)) byGroup.set(f.grupoId, []);
    byGroup.get(f.grupoId)!.push(f);
  }

  const result: (FilaAprov & { lugar: number })[] = [];
  for (const [, students] of Array.from(byGroup)) {
    const sorted = [...students].sort((a, b) => b.promedio - a.promedio);
    let rank = 0;
    let prevScore = -1;
    for (const s of sorted) {
      if (s.promedio !== prevScore) {
        rank++;
        prevScore = s.promedio;
      }
      if (rank > 3) break;
      result.push({ ...s, lugar: rank });
    }
  }
  return result.sort((a, b) => a.grado - b.grado || a.letra.localeCompare(b.letra) || a.lugar - b.lugar || b.promedio - a.promedio);
}

/* ───── inner component (uses useSearchParams) ───── */
function AlumnosInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [filas, setFilas] = useState<FilaAprov[]>([]);
  const [periodos, setPeriodos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [vista, setVista] = useState<Vista>((searchParams.get("vista") as Vista) || "riesgo");
  const [periodo, setPeriodo] = useState<number>(Number(searchParams.get("periodo") || "0"));
  const [filterGrade, setFilterGrade] = useState<number | null>(
    searchParams.get("grado") ? Number(searchParams.get("grado")) : null
  );
  const [filterGrupo, setFilterGrupo] = useState<string | null>(searchParams.get("grupo") || null);

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
      if (!res.ok) { router.push("/rendimiento"); return; }
      const data = await res.json();
      setFilas(data.filas || []);
      setPeriodos(data.periodos || []);
      setLoading(false);
    }
    init();
  }, []);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("vista", vista);
    if (periodo !== 0) params.set("periodo", String(periodo));
    if (filterGrade) params.set("grado", String(filterGrade));
    if (filterGrupo) params.set("grupo", filterGrupo);
    history.replaceState(null, "", `?${params.toString()}`);
  }, [vista, periodo, filterGrade, filterGrupo]);

  const displayProfile = effectiveProfile || profile;

  /* ── Computed ── */
  const filasDelPeriodo = useMemo(() => {
    let f = filas.filter((x) => x.periodo === periodo);
    if (filterGrade) f = f.filter((x) => x.grado === filterGrade);
    if (filterGrupo) f = f.filter((x) => x.grupoId === filterGrupo);
    return f;
  }, [filas, periodo, filterGrade, filterGrupo]);

  // Available groups for filter
  const gruposDisponibles = useMemo(() => {
    const f = filas.filter((x) => x.periodo === periodo);
    const map = new Map<string, { grupoId: string; grado: number; letra: string }>();
    for (const row of f) {
      if (!map.has(row.grupoId)) map.set(row.grupoId, { grupoId: row.grupoId, grado: row.grado, letra: row.letra });
    }
    return Array.from(map.values()).sort((a, b) => a.grado - b.grado || a.letra.localeCompare(b.letra));
  }, [filas, periodo]);

  // Vista-filtered rows
  const vistaRows = useMemo(() => {
    if (vista === "riesgo") {
      return filasDelPeriodo.filter(enRiesgo).sort((a, b) => a.promedio - b.promedio);
    }
    if (vista === "diez") {
      return filasDelPeriodo.filter((f) => f.promedio >= 9.95).sort((a, b) => b.promedio - a.promedio);
    }
    // lugares
    return [];
  }, [filasDelPeriodo, vista]);

  const lugaresRows = useMemo(() => {
    if (vista !== "lugares") return [];
    return computeLugares(filasDelPeriodo);
  }, [filasDelPeriodo, vista]);

  const displayRows = vista === "lugares" ? lugaresRows : vistaRows;

  // Group breaks for table
  const rowsWithBreaks = useMemo(() => {
    const result: { type: "break"; label: string; grado: number }[] | { type: "row"; data: FilaAprov & { lugar?: number }; idx: number }[] = [];
    let lastGroup = "";
    let idx = 0;
    for (const row of displayRows) {
      const groupKey = `${row.grado}°${row.letra}`;
      if (groupKey !== lastGroup) {
        (result as any[]).push({ type: "break", label: groupKey, grado: row.grado });
        lastGroup = groupKey;
      }
      (result as any[]).push({ type: "row", data: row, idx: idx++ });
    }
    return result as ({ type: "break"; label: string; grado: number } | { type: "row"; data: FilaAprov & { lugar?: number }; idx: number })[];
  }, [displayRows]);

  const cfg = VISTA_CONFIG[vista];
  const Icon = cfg.icon;

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando listados…</span>
      </div>
    );
  }

  return (
    <Navbar userName={displayProfile!.full_name} userRole={displayProfile!.role}>
      <main className="page-content animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/rendimiento" className="btn-secondary text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Reportes
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Listados de alumnos</h1>
              <p className="text-sm text-slate-500">
                {PERIOD_LABELS[periodo] || "Todo el ciclo"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Vista selector cards ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(Object.entries(VISTA_CONFIG) as [Vista, typeof cfg][]).map(([key, v]) => {
            const VIcon = v.icon;
            const active = vista === key;
            const count = key === "riesgo"
              ? filasDelPeriodo.filter(enRiesgo).length
              : key === "diez"
                ? filasDelPeriodo.filter((f) => f.promedio >= 9.95).length
                : computeLugares(filasDelPeriodo).length;
            return (
              <button key={key} onClick={() => setVista(key)}
                className={`card !p-3 flex flex-col items-center gap-1 transition-all ${
                  active ? `${v.bg} ${v.border} border-2 shadow-sm` : "hover:bg-slate-50"
                }`}>
                <VIcon className={`w-5 h-5 ${active ? v.color : "text-slate-400"}`} />
                <span className={`text-xs font-semibold ${active ? v.color : "text-slate-500"}`}>{v.label}</span>
                <span className={`text-lg font-extrabold tabular-nums ${active ? v.color : "text-slate-700"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Period pills ── */}
        <div className="card !p-3 mb-4 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <PeriodPill active={periodo === 0} onClick={() => setPeriodo(0)} label="Todo el ciclo" />
            <span className="w-px bg-slate-200 mx-1" />
            {periodos.map((p) => (
              <PeriodPill key={p} active={periodo === p} onClick={() => setPeriodo(p)}
                label={PERIOD_LABELS[p] || `P${p}`} />
            ))}
            <span className="w-px bg-slate-200 mx-1" />
            <PeriodPill active={periodo === -1} onClick={() => setPeriodo(-1)} label="1er Tri" />
            <PeriodPill active={periodo === -2} onClick={() => setPeriodo(-2)} label="2º Tri" />
            <PeriodPill active={periodo === -3} onClick={() => setPeriodo(-3)} label="3er Tri" />
          </div>
        </div>

        {/* ── Filters row ── */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          {/* Grade filter */}
          <button onClick={() => { setFilterGrade(null); setFilterGrupo(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterGrade === null ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            Todos
          </button>
          {[1, 2, 3].map((g) => {
            const c = GRADE_COLORS[g];
            return (
              <button key={g} onClick={() => { setFilterGrade(filterGrade === g ? null : g); setFilterGrupo(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterGrade === g ? `${c.header} text-white` : `bg-white ${c.text} border ${c.border} hover:${c.bg}`
                }`}>
                {g}°
              </button>
            );
          })}

          {/* Group dropdown */}
          <div className="relative ml-auto">
            <select
              value={filterGrupo || ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  const g = gruposDisponibles.find((x) => x.grupoId === v);
                  if (g) setFilterGrade(g.grado);
                  setFilterGrupo(v);
                } else {
                  setFilterGrupo(null);
                }
              }}
              className="input-field text-sm pr-8 appearance-none"
            >
              <option value="">Todos los grupos</option>
              {gruposDisponibles.map((g) => (
                <option key={g.grupoId} value={g.grupoId}>
                  {g.grado}°{g.letra}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Count banner ── */}
        <div className={`card !p-3 mb-4 ${cfg.bg} ${cfg.border} border flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`text-sm font-semibold ${cfg.color}`}>
              {displayRows.length} alumno{displayRows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-xs text-slate-400">{cfg.desc}</span>
        </div>

        {/* ── Table ── */}
        {displayRows.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 w-10">#</th>
                    {vista === "lugares" && (
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2.5 w-12">Lugar</th>
                    )}
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5">Alumno</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell">N° Control</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5">Promedio</th>
                    {vista === "riesgo" && (
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell">Reprobadas</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rowsWithBreaks.map((item, i) => {
                    if (item.type === "break") {
                      const c = GRADE_COLORS[item.grado] || GRADE_COLORS[1];
                      return (
                        <tr key={`break-${i}`}>
                          <td colSpan={vista === "riesgo" ? 6 : vista === "lugares" ? 6 : 5}
                            className={`${c.bg} px-4 py-2 text-xs font-bold ${c.text} uppercase tracking-wider border-b ${c.border}`}>
                            {item.label}
                          </td>
                        </tr>
                      );
                    }
                    const s = item.data;
                    return (
                      <tr key={`${s.studentId}-${i}`} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-xs text-slate-400 font-mono">{item.idx + 1}</td>
                        {vista === "lugares" && (
                          <td className="text-center px-2 py-2 text-lg">
                            {MEDAL_EMOJI[(s as any).lugar] || (s as any).lugar}
                          </td>
                        )}
                        <td className="px-4 py-2 text-sm text-slate-700 font-medium">{s.nombre}</td>
                        <td className="px-4 py-2 text-xs text-slate-400 font-mono hidden sm:table-cell">
                          {s.numeroControl || "—"}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right font-bold tabular-nums ${scoreColor(s.promedio)}`}>
                          {s.promedio.toFixed(1)}
                        </td>
                        {vista === "riesgo" && (
                          <td className="px-4 py-2 text-sm text-right text-red-500 font-semibold tabular-nums hidden sm:table-cell">
                            {s.reprobadas > 0 ? s.reprobadas : ""}
                            {s.materiasReprobadas && (
                              <span className="text-[10px] text-slate-400 ml-1">({s.materiasReprobadas})</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay alumnos en esta categoría para este periodo.</p>
          </div>
        )}
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

/* ── Page wrapper with Suspense for useSearchParams ── */
export default function AlumnosRendimientoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando…</span>
      </div>
    }>
      <AlumnosInner />
    </Suspense>
  );
}
