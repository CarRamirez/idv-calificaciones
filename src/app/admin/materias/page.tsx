"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Subject = {
  id: string;
  name: string;
  short_name: string;
  grade: number;
  counts_for_avg: boolean;
  sort_order: number;
  created_at: string;
};

const GRADE_LABELS: Record<number, string> = { 1: "1er Grado", 2: "2do Grado", 3: "3er Grado" };
const GRADE_COLORS: Record<number, string> = {
  1: "bg-blue-50 border-blue-200 text-blue-700",
  2: "bg-emerald-50 border-emerald-200 text-emerald-700",
  3: "bg-purple-50 border-purple-200 text-purple-700",
};

export default function AdminMateriasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [formName, setFormName] = useState("");
  const [formShort, setFormShort] = useState("");
  const [formGrade, setFormGrade] = useState(1);
  const [formCounts, setFormCounts] = useState(true);
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Delete confirmation
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    if (!data || data.role !== "admin") { router.push("/dashboard"); return; }
    setProfile(data);
  }, [supabase, router]);

  const loadSubjects = useCallback(async () => {
    const res = await fetch("/api/admin/subjects");
    if (res.ok) {
      const data = await res.json();
      setSubjects(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
    loadSubjects();
  }, [loadProfile, loadSubjects]);

  function openNew() {
    setEditing(null);
    setFormName("");
    setFormShort("");
    setFormGrade(1);
    setFormCounts(true);
    setFormOrder(0);
    setError("");
    setShowModal(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setFormName(s.name);
    setFormShort(s.short_name);
    setFormGrade(s.grade);
    setFormCounts(s.counts_for_avg);
    setFormOrder(s.sort_order);
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formShort.trim()) {
      setError("Nombre y abreviatura son obligatorios");
      return;
    }
    setSaving(true);
    setError("");

    const body = {
      ...(editing ? { id: editing.id } : {}),
      name: formName.trim(),
      short_name: formShort.trim(),
      grade: formGrade,
      counts_for_avg: formCounts,
      sort_order: formOrder,
    };

    const res = await fetch("/api/admin/subjects", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const saved = await res.json();
      if (editing) {
        setSubjects((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      } else {
        setSubjects((prev) => [...prev, saved].sort((a, b) => a.grade - b.grade || a.sort_order - b.sort_order));
      }
      setShowModal(false);
    } else {
      const err = await res.json();
      setError(err.error || "Error al guardar");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/admin/subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
    setDeleting(null);
  }

  const filtered = filterGrade ? subjects.filter((s) => s.grade === filterGrade) : subjects;

  // Group by grade for display
  const byGrade: Record<number, Subject[]> = {};
  filtered.forEach((s) => {
    if (!byGrade[s.grade]) byGrade[s.grade] = [];
    byGrade[s.grade].push(s);
  });

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Materias</h1>
            <p className="text-sm text-gray-500">
              {subjects.length} materia{subjects.length !== 1 ? "s" : ""} registrada{subjects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary-600 transition-colors">
              ← Volver
            </Link>
            <button onClick={openNew} className="btn-primary text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva materia
            </button>
          </div>
        </div>

        {/* Grade filter */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFilterGrade(null)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              !filterGrade ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos ({subjects.length})
          </button>
          {[1, 2, 3].map((g) => {
            const count = subjects.filter((s) => s.grade === g).length;
            return (
              <button
                key={g}
                onClick={() => setFilterGrade(g)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  filterGrade === g ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {GRADE_LABELS[g]} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(byGrade)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([grade, subs]) => (
              <div key={grade} className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs border ${GRADE_COLORS[Number(grade)]}`}>
                    {GRADE_LABELS[Number(grade)]}
                  </span>
                  <span className="text-gray-400 font-normal">{subs.length} materia{subs.length !== 1 ? "s" : ""}</span>
                </h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orden</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Abreviatura</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Curricular</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((s, idx) => (
                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx === subs.length - 1 ? "border-b-0" : ""}`}>
                          <td className="px-4 py-2.5 text-gray-400 tabular-nums text-xs w-16">{s.sort_order}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.short_name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {s.counts_for_avg ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                S&iacute;
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(s)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {deleting === s.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(s.id)}
                                    className="text-[11px] px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeleting(null)}
                                    className="text-[11px] px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleting(s.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}

        {!loading && filtered.length === 0 && (
          <div className="card p-8 text-center text-gray-500 text-sm">
            {filterGrade ? `No hay materias en ${GRADE_LABELS[filterGrade]}` : "No hay materias registradas"}
          </div>
        )}
      </main>

      {/* ═══ Modal crear/editar ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? "Editar materia" : "Nueva materia"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Lengua Materna. Español"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abreviatura</label>
                  <input
                    value={formShort}
                    onChange={(e) => setFormShort(e.target.value.toUpperCase())}
                    className="input-field font-mono"
                    placeholder="ESP"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(Number(e.target.value))}
                    className="input-field"
                  >
                    <option value={1}>1er Grado</option>
                    <option value={2}>2do Grado</option>
                    <option value={3}>3er Grado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="input-field tabular-nums"
                    min={0}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCounts}
                      onChange={(e) => setFormCounts(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Abona al promedio</span>
                  </label>
                </div>
              </div>

              {editing && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-400">
                    ID: <span className="font-mono select-all">{editing.id}</span>
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear materia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
