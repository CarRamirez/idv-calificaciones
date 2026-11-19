"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";

/* ── Types ── */
type Group = { id: string; grade: number; letter: string };
type Subject = { id: string; name: string; short_name: string; sort_order: number; counts_for_avg: boolean };
type Avance = { group_id: string; subject_id: string; total_students: number; captured: number };

type Props = {
  groups: Group[];
  subjects: Subject[];
  avance: Avance[];
  teacherMap: Record<string, string>; // "groupId-subjectId" → teacher name
  studentCounts: Record<string, number>; // groupId → count
};

/* ── Grade colors (matches SIGEFCP's GRADO_COLOR) ── */
const GRADO_COLOR: Record<number, { texto: string; fondo: string; borde: string; barra: string }> = {
  1: { texto: "text-blue-700 dark:text-blue-300", fondo: "bg-blue-50 dark:bg-blue-500/10", borde: "border-blue-200 dark:border-blue-500/30", barra: "bg-blue-500" },
  2: { texto: "text-emerald-700 dark:text-emerald-300", fondo: "bg-emerald-50 dark:bg-emerald-500/10", borde: "border-emerald-200 dark:border-emerald-500/30", barra: "bg-emerald-500" },
  3: { texto: "text-purple-700 dark:text-purple-300", fondo: "bg-purple-50 dark:bg-purple-500/10", borde: "border-purple-200 dark:border-purple-500/30", barra: "bg-purple-500" },
};

/* ── Subject icons ── */
const SUBJECT_ICONS: Record<string, { emoji: string; tono: string }> = {
  ESP: { emoji: "📖", tono: "bg-rose-100 dark:bg-rose-500/15" },
  ING: { emoji: "🌎", tono: "bg-sky-100 dark:bg-sky-500/15" },
  ART: { emoji: "🎨", tono: "bg-fuchsia-100 dark:bg-fuchsia-500/15" },
  MAT: { emoji: "📐", tono: "bg-blue-100 dark:bg-blue-500/15" },
  BIO: { emoji: "🧬", tono: "bg-emerald-100 dark:bg-emerald-500/15" },
  FIS: { emoji: "⚛️", tono: "bg-indigo-100 dark:bg-indigo-500/15" },
  QUI: { emoji: "🧪", tono: "bg-teal-100 dark:bg-teal-500/15" },
  GEO: { emoji: "🗺️", tono: "bg-lime-100 dark:bg-lime-500/15" },
  HIS: { emoji: "🏛️", tono: "bg-amber-100 dark:bg-amber-500/15" },
  FCE: { emoji: "⚖️", tono: "bg-violet-100 dark:bg-violet-500/15" },
  TEC: { emoji: "🛠️", tono: "bg-slate-200 dark:bg-slate-500/20" },
  EFI: { emoji: "⚽", tono: "bg-orange-100 dark:bg-orange-500/15" },
  TUT: { emoji: "🤝", tono: "bg-pink-100 dark:bg-pink-500/15" },
  VSAL: { emoji: "🌱", tono: "bg-green-100 dark:bg-green-500/15" },
  ORT: { emoji: "✏️", tono: "bg-yellow-100 dark:bg-yellow-500/15" },
  VAL: { emoji: "💎", tono: "bg-cyan-100 dark:bg-cyan-500/15" },
  SMEN: { emoji: "🧠", tono: "bg-pink-100 dark:bg-pink-500/15" },
  CLUB: { emoji: "🎯", tono: "bg-orange-100 dark:bg-orange-500/15" },
};
function iconoMateria(clave: string) {
  const key = (clave || "").toUpperCase().replace(/[^A-Z]/g, "");
  return SUBJECT_ICONS[key] ?? { emoji: "📘", tono: "bg-slate-100 dark:bg-slate-800" };
}

function Emoji({ clave, grande = false }: { clave: string; grande?: boolean }) {
  const m = iconoMateria(clave);
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ${m.tono} ${grande ? "h-12 w-12 rounded-2xl text-2xl" : "h-8 w-8 rounded-lg text-base"}`}>{m.emoji}</span>
  );
}

function Progreso({ total, captured }: { total: number; captured: number }) {
  if (!total) return null;
  const pct = Math.round((captured / total) * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <span className={`block h-full ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] tabular-nums text-slate-500">{captured}/{total}</span>
    </span>
  );
}

/* ── Filter context ── */
type FilterState = { grado: number; grupo: string | null };
const FilterCtx = createContext<{ state: FilterState; groups: Group[] } | null>(null);

function FilterBar({ groups, state, onChange }: { groups: Group[]; state: FilterState; onChange: (s: FilterState) => void }) {
  const grados = Array.from(new Set(groups.map(g => g.grade))).sort();
  const visibles = groups.filter(g => !state.grado || g.grade === state.grado);

  const seg = (activo: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activo ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`;

  return (
    <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grado</span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button className={seg(!state.grado)} onClick={() => onChange({ grado: 0, grupo: null })}>Todos</button>
          {grados.map(gr => (
            <button key={gr} className={seg(state.grado === gr)} onClick={() => onChange({ grado: gr, grupo: null })}>{gr}°</button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Grupo</span>
        <button onClick={() => onChange({ ...state, grupo: null })}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${!state.grupo ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>Todos</button>
        {visibles.map(g => {
          const c = GRADO_COLOR[g.grade];
          const activo = g.id === state.grupo;
          return (
            <button key={g.id} onClick={() => onChange({ grado: g.grade, grupo: g.id })}
              className={`inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums transition ${activo
                ? `${c.barra} text-white shadow-sm`
                : `${c.fondo} ${c.texto} hover:brightness-95`}`}>
              {g.grade}°{g.letter}
            </button>
          );
        })}
        {!visibles.length && <span className="text-sm text-slate-400">Sin grupos con ese filtro.</span>}
      </div>
    </div>
  );
}

export default function CapturaCliente({ groups, subjects, avance, teacherMap, studentCounts }: Props) {
  const [filter, setFilter] = useState<FilterState>({ grado: 0, grupo: null });

  const avanceMap = new Map(avance.map(a => [`${a.group_id}-${a.subject_id}`, a]));

  const materiasDe = (grado: number) => {
    const all = subjects.filter(s => {
      // subjects already filtered by grade from server
      return true;
    });
    // separate curricular vs non-curricular, sort by sort_order
    const curricular = all.filter(s => s.counts_for_avg !== false).sort((a, b) => a.sort_order - b.sort_order);
    const noCurricular = all.filter(s => s.counts_for_avg === false).sort((a, b) => a.sort_order - b.sort_order);
    return [...curricular, ...noCurricular];
  };

  const subjectsByGrade = (grado: number) => {
    const curr = subjects.filter(s => s.counts_for_avg !== false).sort((a, b) => a.sort_order - b.sort_order);
    const noCurr = subjects.filter(s => s.counts_for_avg === false).sort((a, b) => a.sort_order - b.sort_order);
    return [...curr, ...noCurr];
  };

  // All subjects are already for the right grade (server sends per-grade subjects per group)
  // We'll organize by group
  const sortedGroups = [...groups].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));

  const filteredGroups = sortedGroups.filter(g =>
    (!filter.grado || g.grade === filter.grado) &&
    (!filter.grupo || g.id === filter.grupo)
  );

  // For "solo grupo" view - when a specific group is selected
  const selectedGroup = filter.grupo ? groups.find(g => g.id === filter.grupo) : null;

  // Group subjects by grade
  const subjectsForGrade = (grade: number) =>
    subjects.filter(s => {
      // We need grade info on subjects - let's use the groups
      return true; // subjects don't have grade in this context, we filter via assignments
    });

  return (
    <>
      <FilterBar groups={sortedGroups} state={filter} onChange={setFilter} />

      {/* No groups match */}
      {!filteredGroups.length && (
        <div className="card border-dashed p-10 text-center text-slate-400">Sin grupos con ese filtro.</div>
      )}

      {/* ── Single group selected: detailed view ── */}
      {selectedGroup && (() => {
        const g = selectedGroup;
        const c = GRADO_COLOR[g.grade];
        const count = studentCounts[g.id] ?? 0;
        const gradeSubjects = subjects
          .filter(s => avance.some(a => a.group_id === g.id && a.subject_id === s.id) || teacherMap[`${g.id}-${s.id}`] !== undefined)
          .sort((a, b) => {
            const aCurr = a.counts_for_avg !== false ? 0 : 1;
            const bCurr = b.counts_for_avg !== false ? 0 : 1;
            if (aCurr !== bCurr) return aCurr - bCurr;
            return a.sort_order - b.sort_order;
          });

        return (
          <section className="mt-6 space-y-4">
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${c.fondo} ${c.borde}`}>
              <div className="flex items-center gap-4">
                <span className={`text-4xl font-black ${c.texto}`}>{g.grade}°{g.letter}</span>
                <span>
                  <span className="block font-semibold">Grupo {g.grade}°{g.letter}</span>
                  <span className="block text-sm text-slate-500">{count} alumnos</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Link prefetch={false} href={`/concentrados?grupo=${g.id}`} className="btn-secondary rounded-xl text-sm px-3 py-2 inline-flex items-center gap-1.5">📊 Concentrado</Link>
                <Link prefetch={false} href={`/boleta?grupo=${g.id}`} className="btn-secondary rounded-xl text-sm px-3 py-2 inline-flex items-center gap-1.5">🖨️ Boletas</Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gradeSubjects.map(s => {
                const a = avanceMap.get(`${g.id}-${s.id}`);
                const prof = teacherMap[`${g.id}-${s.id}`];
                return (
                  <Link key={s.id} prefetch={false} href={`/captura/${g.id}/${s.id}`}
                    className="card group flex flex-col gap-3 rounded-2xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <Emoji clave={s.short_name} grande />
                      {!s.counts_for_avg && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">No curricular</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{s.name}</p>
                      <p className={`mt-0.5 truncate text-xs ${prof ? "text-slate-500" : "text-amber-600"}`}>{prof ?? "Sin profesor asignado"}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      {a ? <Progreso total={a.total_students} captured={a.captured} /> : <span />}
                      <span className="text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">Capturar →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* ── Overview: all groups organized by grade ── */}
      {!filter.grupo && [1, 2, 3].map(grado => {
        const delGrado = filteredGroups.filter(g => g.grade === grado);
        if (!delGrado.length) return null;
        const c = GRADO_COLOR[grado];

        return (
          <section key={grado} className="mt-6 space-y-3">
            <h2 className={`flex items-center gap-2 text-lg font-bold ${c.texto}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${c.barra}`} /> {grado}.° grado
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {delGrado.map(g => {
                const count = studentCounts[g.id] ?? 0;
                const gradeSubjects = subjects
                  .filter(s => avance.some(a => a.group_id === g.id && a.subject_id === s.id) || teacherMap[`${g.id}-${s.id}`] !== undefined)
                  .sort((a, b) => {
                    const aCurr = a.counts_for_avg !== false ? 0 : 1;
                    const bCurr = b.counts_for_avg !== false ? 0 : 1;
                    if (aCurr !== bCurr) return aCurr - bCurr;
                    return a.sort_order - b.sort_order;
                  });

                return (
                  <div key={g.id} className="card overflow-hidden rounded-2xl">
                    <div className={`flex items-center justify-between px-4 py-2.5 ${c.fondo}`}>
                      <span className={`text-xl font-black ${c.texto}`}>{g.grade}°{g.letter}</span>
                      <span className="text-xs text-slate-500">{count} alumnos</span>
                    </div>
                    <div className="grid gap-1 p-2 sm:grid-cols-2">
                      {gradeSubjects.map(s => {
                        const prof = teacherMap[`${g.id}-${s.id}`];
                        return (
                          <Link key={s.id} prefetch={false} href={`/captura/${g.id}/${s.id}`}
                            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <Emoji clave={s.short_name} />
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${s.counts_for_avg !== false ? "font-medium" : "italic"}`}>{s.name}</span>
                              <span className={`block truncate text-[11px] ${prof ? "text-slate-500" : "text-amber-600"}`}>{prof ?? "Sin profesor"}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
