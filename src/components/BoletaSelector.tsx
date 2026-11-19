"use client";

import { formatStudentName } from "@/lib/format-name";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Group = { id: string; grade: number; letter: string };
type Student = { id: string; full_name: string; list_num: number };

const GRADO_COLOR: Record<number, { texto: string; fondo: string; borde: string; barra: string }> = {
  1: { texto: "text-blue-700 dark:text-blue-300", fondo: "bg-blue-50 dark:bg-blue-500/10", borde: "border-blue-200 dark:border-blue-500/30", barra: "bg-blue-500" },
  2: { texto: "text-emerald-700 dark:text-emerald-300", fondo: "bg-emerald-50 dark:bg-emerald-500/10", borde: "border-emerald-200 dark:border-emerald-500/30", barra: "bg-emerald-500" },
  3: { texto: "text-purple-700 dark:text-purple-300", fondo: "bg-purple-50 dark:bg-purple-500/10", borde: "border-purple-200 dark:border-purple-500/30", barra: "bg-purple-500" },
};

export default function BoletaSelector({ groups }: { groups: Group[] }) {
  const supabase = createClient();
  const [grado, setGrado] = useState<number>(0);
  const [grupo, setGrupo] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const grados = Array.from(new Set(groups.map(g => g.grade))).sort();
  const sortedGroups = [...groups].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
  const visibles = sortedGroups.filter(g => !grado || g.grade === grado);
  const selectedGroup = groups.find(g => g.id === grupo);

  useEffect(() => {
    if (!grupo) { setStudents([]); return; }
    setLoading(true);
    supabase
      .from("students")
      .select("id, full_name, list_num")
      .eq("group_id", grupo)
      .eq("status", "activo")
      .order("full_name")
      .then(({ data }) => {
        setStudents(data || []);
        setLoading(false);
      });
  }, [grupo, supabase]);

  const seg = (activo: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activo ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`;

  return (
    <div className="space-y-5">
      {/* ── Filter bar ── */}
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grado</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button className={seg(!grado)} onClick={() => { setGrado(0); setGrupo(null); }}>Todos</button>
            {grados.map(gr => (
              <button key={gr} className={seg(grado === gr)} onClick={() => { setGrado(gr); setGrupo(null); }}>{gr}°</button>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">Grupo</span>
          {visibles.map(g => {
            const c = GRADO_COLOR[g.grade];
            const activo = g.id === grupo;
            return (
              <button key={g.id} onClick={() => { setGrado(g.grade); setGrupo(g.id); }}
                className={`inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold tabular-nums transition ${activo
                  ? `${c.barra} text-white shadow-sm`
                  : `${c.fondo} ${c.texto} hover:brightness-95`}`}>
                {g.grade}°{g.letter}
              </button>
            );
          })}
          {!visibles.length && <span className="text-sm text-slate-400">Sin grupos.</span>}
        </div>
      </div>

      {/* ── No group selected ── */}
      {!grupo && (
        <div className="card border-dashed p-10 text-center text-slate-400">
          Elige un grupo para ver sus boletas.
        </div>
      )}

      {/* ── Group selected: show students ── */}
      {grupo && selectedGroup && (
        <div className="space-y-4">
          {/* Group header */}
          {(() => {
            const c = GRADO_COLOR[selectedGroup.grade];
            return (
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 ${c.fondo} ${c.borde}`}>
                <div className="flex items-center gap-4">
                  <span className={`text-4xl font-black ${c.texto}`}>{selectedGroup.grade}°{selectedGroup.letter}</span>
                  <span>
                    <span className="block font-semibold">Boletas del grupo</span>
                    <span className="block text-sm text-slate-500">{loading ? "Cargando..." : `${students.length} alumnos`}</span>
                  </span>
                </div>
                {students.length > 0 && (
                  <Link href={`/boleta/grupo/${grupo}`}
                    className="btn-primary rounded-xl text-sm px-4 py-2.5 inline-flex items-center gap-2">
                    🖨️ Grupo completo ({students.length})
                  </Link>
                )}
              </div>
            );
          })()}

          {/* Student list */}
          {loading ? (
            <div className="card p-8 text-center text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              <p className="mt-2 text-sm">Cargando alumnos...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="card border-dashed p-10 text-center text-slate-400">
              No hay alumnos activos en este grupo.
            </div>
          ) : (
            <div className="card overflow-hidden rounded-2xl">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s, i) => (
                  <Link key={s.id} href={`/boleta/${s.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate">
                        {formatStudentName(s.full_name)}
                      </span>
                    </span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
