"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatStudentName } from "@/lib/format-name";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type AuditEntry = {
  id: number;
  student_id: string;
  subject_id: string;
  period: number;
  action: string;
  old_score: number | null;
  new_score: number | null;
  old_absences: number | null;
  new_absences: number | null;
  changed_by: string;
  changed_at: string;
  students: {
    full_name: string;
    group_id: string;
    groups: { grade: number; letter: string };
  };
  subjects: { name: string; short_name: string };
  profiles: { full_name: string } | null;
};

type ApiResponse = {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept",
  2: "Oct",
  3: "Nov-Dic",
  4: "Ene-Feb",
  5: "Marzo",
  6: "Abril",
  7: "Mayo",
  8: "Junio",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: "Nuevo", color: "bg-green-100 text-green-800" },
  UPDATE: { label: "Cambio", color: "bg-amber-100 text-amber-800" },
  DELETE: { label: "Borrado", color: "bg-red-100 text-red-800" },
};

export default function AuditoriaPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [teacherFilter, setTeacherFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  // Teachers list for dropdown
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      if (p) setProfile(p);
    }
    loadProfile();
  }, [supabase]);

  useEffect(() => {
    async function loadTeachers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["teacher", "admin", "directora_anita"])
        .order("full_name");
      setTeachers(data || []);
    }
    loadTeachers();
  }, [supabase]);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (teacherFilter) params.set("teacher", teacherFilter);
    if (periodFilter) params.set("period", periodFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    try {
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching audit:", err);
    } finally {
      setLoading(false);
    }
  }, [page, teacherFilter, periodFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [teacherFilter, periodFilter, actionFilter, dateFrom, dateTo]);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatScore(n: number | null): string {
    return n !== null ? n.toString() : "—";
  }

  const filteredItems = data?.items.filter((item) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    const studentName = item.students?.full_name?.toLowerCase() || "";
    const subjectName = item.subjects?.name?.toLowerCase() || "";
    return studentName.includes(q) || subjectName.includes(q);
  }) || [];

  if (!profile) return null;

  return (
    <div className="page-container">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="page-content animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Log de Auditoría</h1>
            <p className="text-sm text-gray-500">
              Registro de cambios en calificaciones
              {data && ` — ${data.total.toLocaleString()} registros`}
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Teacher */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Profesor</label>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Todos</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Periodo</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Todos</option>
                {Object.entries(PERIOD_NAMES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Todos</option>
                <option value="INSERT">Nuevo</option>
                <option value="UPDATE">Cambio</option>
                <option value="DELETE">Borrado</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Alumno o materia..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Clear filters */}
          {(teacherFilter || periodFilter || actionFilter || dateFrom || dateTo || searchText) && (
            <button
              onClick={() => {
                setTeacherFilter("");
                setPeriodFilter("");
                setActionFilter("");
                setDateFrom("");
                setDateTo("");
                setSearchText("");
              }}
              className="mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Fecha / Hora</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Profesor</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Alumno</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Materia</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Periodo</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Cambio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-gray-400">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filteredItems.map((entry) => {
                  const actionInfo = ACTION_LABELS[entry.action] || {
                    label: entry.action,
                    color: "bg-gray-100 text-gray-800",
                  };
                  const scoreChanged =
                    entry.old_score !== entry.new_score;
                  const absChanged =
                    entry.old_absences !== entry.new_absences;

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(entry.changed_at)}</div>
                        <div className="text-xs text-gray-400">{formatTime(entry.changed_at)}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {entry.profiles?.full_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {entry.students ? formatStudentName(entry.students.full_name) : "—"}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {entry.students?.groups
                          ? `${entry.students.groups.grade}° "${entry.students.groups.letter}"`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {entry.subjects?.short_name || entry.subjects?.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs font-medium text-gray-600">
                          {PERIOD_NAMES[entry.period] || entry.period}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${actionInfo.color}`}
                        >
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {entry.action === "INSERT" ? (
                          <span className="text-sm text-green-700 font-medium">
                            Cal: {formatScore(entry.new_score)}
                            {entry.new_absences ? `, IA: ${entry.new_absences}` : ""}
                          </span>
                        ) : entry.action === "UPDATE" ? (
                          <div className="text-xs space-y-0.5">
                            {scoreChanged && (
                              <div>
                                Cal: <span className="text-red-500 line-through">{formatScore(entry.old_score)}</span>
                                {" → "}
                                <span className="text-green-700 font-semibold">{formatScore(entry.new_score)}</span>
                              </div>
                            )}
                            {absChanged && (
                              <div>
                                IA: <span className="text-red-500 line-through">{formatScore(entry.old_absences)}</span>
                                {" → "}
                                <span className="text-green-700 font-semibold">{formatScore(entry.new_absences)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-red-600">
                            Cal: {formatScore(entry.old_score)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-400">
              Página {data.page} de {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
