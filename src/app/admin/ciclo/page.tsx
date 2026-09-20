"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Group = {
  id: string;
  grade: number;
  letter: string;
  parent_email: string | null;
  created_at: string;
};

const GRADE_LABELS: Record<number, string> = { 1: "1er Grado", 2: "2do Grado", 3: "3er Grado" };
const GRADE_COLORS: Record<number, string> = {
  1: "bg-blue-50 border-blue-200 text-blue-700",
  2: "bg-emerald-50 border-emerald-200 text-emerald-700",
  3: "bg-purple-50 border-purple-200 text-purple-700",
};

export default function AdminCicloPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/effective-profile")
      .then((r) => r.json())
      .then((data) => { if (data.full_name) setEffectiveProfile(data); })
      .catch(() => {});
  }, []);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [formGrade, setFormGrade] = useState(1);
  const [formLetter, setFormLetter] = useState("");
  const [formEmail, setFormEmail] = useState("");
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

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/admin/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
    loadGroups();
  }, [loadProfile, loadGroups]);

  function openNew() {
    setEditing(null);
    setFormGrade(1);
    setFormLetter("");
    setFormEmail("");
    setError("");
    setShowModal(true);
  }

  function openEdit(g: Group) {
    setEditing(g);
    setFormGrade(g.grade);
    setFormLetter(g.letter);
    setFormEmail(g.parent_email || "");
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!formLetter.trim()) {
      setError("La letra del grupo es obligatoria");
      return;
    }

    setSaving(true);
    setError("");

    const body = {
      ...(editing ? { id: editing.id } : {}),
      grade: formGrade,
      letter: formLetter.trim().toUpperCase(),
      parent_email: formEmail.trim() || null,
    };

    const res = await fetch("/api/admin/groups", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowModal(false);
      loadGroups();
    } else {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/admin/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setDeleting(null);
      loadGroups();
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar");
      setDeleting(null);
    }
  }

  const filtered = filterGrade
    ? groups.filter((g) => g.grade === filterGrade)
    : groups;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={(effectiveProfile || profile)!.full_name} userRole={(effectiveProfile || profile)!.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Grupos</h1>
            <p className="text-sm text-gray-500">
              {groups.length} grupo{groups.length !== 1 ? "s" : ""} registrado{groups.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn-secondary text-sm">
              ← Volver
            </Link>
            <button onClick={openNew} className="btn-primary text-sm">
              + Nuevo grupo
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterGrade(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterGrade === null
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todos
          </button>
          {[1, 2, 3].map((g) => (
            <button
              key={g}
              onClick={() => setFilterGrade(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterGrade === g
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {GRADE_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Grupo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Grado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Correo de padres</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No hay grupos registrados
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-base font-bold text-gray-900">
                        {g.grade}°{g.letter}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${GRADE_COLORS[g.grade] || ""}`}>
                        {GRADE_LABELS[g.grade] || `${g.grade}°`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {g.parent_email ? (
                        <span className="text-sm text-gray-700 font-mono">{g.parent_email}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin correo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(g)}
                          className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          Editar
                        </button>
                        {deleting === g.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(g.id)}
                              className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded font-medium"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleting(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleting(g.id)}
                            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editing ? `Editar ${editing.grade}°${editing.letter}` : "Nuevo grupo"}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grado</label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>1er Grado</option>
                    <option value={2}>2do Grado</option>
                    <option value={3}>3er Grado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Letra</label>
                  <input
                    type="text"
                    value={formLetter}
                    onChange={(e) => setFormLetter(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo de padres de familia
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="secgrupo1a@institutodonvasco.edu.mx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Opcional. Se usa para enviar notificaciones de tareas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary text-sm"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving ? "Guardando..." : editing ? "Actualizar" : "Crear grupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
