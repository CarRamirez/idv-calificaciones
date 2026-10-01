"use client";

import React from "react";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Assignment = {
  group_id: string;
  group_label: string;
  subject_name: string;
  subject_short: string;
  subject_id: string;
};

type TeacherProgress = {
  teacher_id: string;
  full_name: string;
  email: string | null;
  assignments: Assignment[];
  periods: Record<number, { expected: number; captured: number }>;
};

type PeriodInfo = {
  period_number: number;
  name: string;
  trimester: number;
  is_open: boolean;
};

const TRIMESTERS = [
  { id: 1, name: "1T", periods: [1, 2] },
  { id: 2, name: "2T", periods: [3, 4] },
  { id: 3, name: "3T", periods: [5, 6, 7, 8] },
];

type ViewMode = "periods" | "trimesters";

function statusColor(captured: number, expected: number): { bg: string; text: string; label: string } {
  if (expected === 0) return { bg: "bg-gray-100", text: "text-gray-400", label: "—" };
  const pct = captured / expected;
  if (pct >= 1) return { bg: "bg-green-100", text: "text-green-700", label: "✓" };
  if (pct > 0) return { bg: "bg-yellow-100", text: "text-yellow-700", label: `${Math.round(pct * 100)}%` };
  return { bg: "bg-red-100", text: "text-red-700", label: "0%" };
}

export default function AvancePage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [teachers, setTeachers] = useState<TeacherProgress[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("periods");
  const [search, setSearch] = useState("");
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

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

      const res = await fetch("/api/admin/avance");
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setTeachers(data.teachers || []);
      setPeriods(data.periods || []);
      setLoading(false);
    }
    init();
  }, []);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => t.full_name.toLowerCase().includes(q));
  }, [teachers, search]);

  // Summary stats
  const summary = useMemo(() => {
    const openPeriods = periods.filter((p) => p.is_open).map((p) => p.period_number);
    let totalComplete = 0;
    let totalPartial = 0;
    let totalEmpty = 0;

    teachers.forEach((t) => {
      openPeriods.forEach((pn) => {
        const p = t.periods[pn];
        if (!p || p.expected === 0) return;
        const pct = p.captured / p.expected;
        if (pct >= 1) totalComplete++;
        else if (pct > 0) totalPartial++;
        else totalEmpty++;
      });
    });

    return { totalComplete, totalPartial, totalEmpty, openPeriods };
  }, [teachers, periods]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando avance de captura...</div>
      </div>
    );
  }

  const displayProfile = effectiveProfile || profile;

  return (
    <div className="page-container">
      <Navbar userName={displayProfile.full_name} userRole={displayProfile.role} />
      <main className="page-content max-w-full animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Avance de Captura
            </h1>
            <p className="text-sm text-gray-500">Progreso de captura de calificaciones por profesor y periodo</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Inicio</Link>
        </div>

        {/* Summary cards */}
        {summary.openPeriods.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{summary.totalComplete}</p>
                <p className="text-[11px] text-gray-500">Completos</p>
              </div>
            </div>
            <div className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{summary.totalPartial}</p>
                <p className="text-[11px] text-gray-500">Parciales</p>
              </div>
            </div>
            <div className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{summary.totalEmpty}</p>
                <p className="text-[11px] text-gray-500">Sin captura</p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar profesor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm max-w-xs"
            />
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setViewMode("periods")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "periods"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Por periodo
              </button>
              <button
                onClick={() => setViewMode("trimesters")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "trimesters"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                Por trimestre
              </button>
            </div>
          </div>
        </div>

        {/* Semáforo legend */}
        <div className="flex gap-4 mb-3 text-xs">
          <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-medium">✓ Completo</span>
          <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">Parcial</span>
          <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Sin captura</span>
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-400">Sin asignación</span>
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          <table className="grade-table">
            <thead>
              <tr>
                <th className="min-w-[200px] sticky left-0 bg-white z-10">Profesor</th>
                {viewMode === "periods"
                  ? periods.map((p) => (
                      <th key={p.period_number} className={`text-center text-xs w-20 ${p.is_open ? "bg-green-50" : ""}`}>
                        <span className="block">{p.name}</span>
                        {p.is_open && <span className="block text-[9px] text-green-600 font-normal">Abierto</span>}
                      </th>
                    ))
                  : TRIMESTERS.map((t) => (
                      <th key={t.id} className="text-center text-xs w-24">{t.name}</th>
                    ))
                }
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((teacher) => {
                const isExpanded = expandedTeacher === teacher.teacher_id;
                return (
                  <React.Fragment key={teacher.teacher_id}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedTeacher(isExpanded ? null : teacher.teacher_id)}
                    >
                      <td className="sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <span className="text-xs font-medium text-gray-900">{teacher.full_name}</span>
                            <span className="block text-[10px] text-gray-400">
                              {teacher.assignments.length} asignación{teacher.assignments.length !== 1 ? "es" : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      {viewMode === "periods"
                        ? periods.map((p) => {
                            const prog = teacher.periods[p.period_number];
                            const st = statusColor(prog?.captured || 0, prog?.expected || 0);
                            return (
                              <td key={p.period_number} className={`text-center ${st.bg}`}>
                                <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                                {prog && prog.expected > 0 && (
                                  <span className="block text-[9px] text-gray-400">
                                    {prog.captured}/{prog.expected}
                                  </span>
                                )}
                              </td>
                            );
                          })
                        : TRIMESTERS.map((t) => {
                            const totalExp = t.periods.reduce((sum, pn) => sum + (teacher.periods[pn]?.expected || 0), 0);
                            const totalCap = t.periods.reduce((sum, pn) => sum + (teacher.periods[pn]?.captured || 0), 0);
                            const st = statusColor(totalCap, totalExp);
                            return (
                              <td key={t.id} className={`text-center ${st.bg}`}>
                                <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                                {totalExp > 0 && (
                                  <span className="block text-[9px] text-gray-400">
                                    {totalCap}/{totalExp}
                                  </span>
                                )}
                              </td>
                            );
                          })
                      }
                    </tr>
                    {/* Expanded detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={viewMode === "periods" ? periods.length + 1 : TRIMESTERS.length + 1} className="!p-0">
                          <div className="bg-gray-50 px-6 py-3 border-t border-b border-gray-200">
                            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Detalle de asignaciones
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left py-1 pr-4 font-medium">Grupo</th>
                                    <th className="text-left py-1 pr-4 font-medium">Materia</th>
                                    {viewMode === "periods"
                                      ? periods.map((p) => (
                                          <th key={p.period_number} className="text-center py-1 w-16 font-medium">{p.name}</th>
                                        ))
                                      : TRIMESTERS.map((t) => (
                                          <th key={t.id} className="text-center py-1 w-20 font-medium">{t.name}</th>
                                        ))
                                    }
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacher.assignments.map((a, idx) => {
                                    // Per-assignment progress: count from captured set
                                    return (
                                      <tr key={idx} className="border-t border-gray-200">
                                        <td className="py-1.5 pr-4 font-medium text-gray-700">{a.group_label}</td>
                                        <td className="py-1.5 pr-4 text-gray-600">{a.subject_short}</td>
                                        {viewMode === "periods"
                                          ? periods.map((p) => {
                                              const prog = teacher.periods[p.period_number];
                                              // We don't have per-assignment breakdown in the API response,
                                              // so show "—" for detail (could enhance later)
                                              return (
                                                <td key={p.period_number} className="text-center py-1.5 text-gray-400">—</td>
                                              );
                                            })
                                          : TRIMESTERS.map((t) => (
                                              <td key={t.id} className="text-center py-1.5 text-gray-400">—</td>
                                            ))
                                        }
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={viewMode === "periods" ? periods.length + 1 : TRIMESTERS.length + 1} className="text-center py-8 text-gray-400 text-sm">
                    {search ? "No se encontraron profesores" : "No hay datos de avance"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
