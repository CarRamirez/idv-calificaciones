"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Group = { id: string; grade: number; letter: string };
type Student = {
  id: string;
  full_name: string;
  curp: string | null;
  list_num: number;
  group_id: string;
  is_active: boolean;
};

export default function AdminAlumnosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState("");
  const [formCurp, setFormCurp] = useState("");
  const [formListNum, setFormListNum] = useState("");
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Init: check auth, load groups
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!prof || prof.role !== "admin") { router.push("/dashboard"); return; }
      setProfile(prof);

      const { data: grps } = await supabase
        .from("groups")
        .select("id, grade, letter")
        .order("grade")
        .order("letter");

      if (grps && grps.length > 0) {
        setGroups(grps);
        setSelectedGroup(grps[0].id);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Load students when group changes
  const loadStudents = useCallback(async () => {
    if (!selectedGroup) return;
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("group_id", selectedGroup)
      .order("list_num");
    setStudents(data || []);
  }, [selectedGroup]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Filter students
  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.curp && s.curp.toLowerCase().includes(search.toLowerCase()))
  );

  // Open modal for add
  function openAdd() {
    setEditStudent(null);
    setFormName("");
    setFormCurp("");
    // Auto-assign next list number
    const maxNum = students.length > 0 ? Math.max(...students.map((s) => s.list_num)) : 0;
    setFormListNum(String(maxNum + 1));
    setFormError("");
    setShowModal(true);
  }

  // Open modal for edit
  function openEdit(s: Student) {
    setEditStudent(s);
    setFormName(s.full_name);
    setFormCurp(s.curp || "");
    setFormListNum(String(s.list_num));
    setFormError("");
    setShowModal(true);
  }

  // Save (add or edit)
  async function handleSave() {
    const name = formName.trim();
    if (!name) { setFormError("El nombre es obligatorio"); return; }
    const num = parseInt(formListNum);
    if (isNaN(num) || num < 1) { setFormError("N° de lista inválido"); return; }

    setSaving(true);
    setFormError("");

    if (editStudent) {
      // Update
      const { error } = await supabase
        .from("students")
        .update({
          full_name: name.toUpperCase(),
          curp: formCurp.trim().toUpperCase() || null,
          list_num: num,
        })
        .eq("id", editStudent.id);

      if (error) { setFormError(error.message); setSaving(false); return; }
    } else {
      // Insert
      const { error } = await supabase
        .from("students")
        .insert({
          full_name: name.toUpperCase(),
          curp: formCurp.trim().toUpperCase() || null,
          list_num: num,
          group_id: selectedGroup,
        });

      if (error) { setFormError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    loadStudents();
  }

  // Delete
  async function handleDelete() {
    if (!deleteId) return;
    await supabase.from("students").delete().eq("id", deleteId);
    setDeleteId(null);
    loadStudents();
  }

  // Toggle active
  async function toggleActive(s: Student) {
    await supabase
      .from("students")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    loadStudents();
  }

  const currentGroup = groups.find((g) => g.id === selectedGroup);
  const groupLabel = currentGroup ? `${currentGroup.grade}° ${currentGroup.letter}` : "";

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">Alumnos</h1>
          <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedGroup === g.id
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {g.grade}° {g.letter}
            </button>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1"
          />
          <button onClick={openAdd} className="btn-primary text-sm whitespace-nowrap">
            + Agregar alumno
          </button>
        </div>

        {/* Students table */}
        <div className="card overflow-x-auto">
          <table className="grade-table">
            <thead>
              <tr>
                <th className="w-16">N°</th>
                <th>Nombre completo</th>
                <th className="hidden sm:table-cell">CURP</th>
                <th className="w-20 text-center">Estado</th>
                <th className="w-28 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                    {students.length === 0
                      ? `No hay alumnos en ${groupLabel}. Agrega el primero.`
                      : "Sin resultados para la búsqueda."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                    <td className="text-center font-medium">{s.list_num}</td>
                    <td className="font-medium">{s.full_name}</td>
                    <td className="hidden sm:table-cell text-xs text-gray-500 font-mono">
                      {s.curp || "—"}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.is_active ? "Activo" : "Baja"}
                      </button>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-primary-600 hover:text-primary-800 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {students.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-right">
              {students.filter((s) => s.is_active).length} activos de {students.length} alumnos en {groupLabel}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                {editStudent ? "Editar alumno" : `Nuevo alumno — ${groupLabel}`}
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input-field"
                    placeholder="APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">CURP</label>
                    <input
                      type="text"
                      value={formCurp}
                      onChange={(e) => setFormCurp(e.target.value)}
                      className="input-field font-mono"
                      placeholder="18 caracteres"
                      maxLength={18}
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">N° Lista</label>
                    <input
                      type="number"
                      value={formListNum}
                      onChange={(e) => setFormListNum(e.target.value)}
                      className="input-field text-center"
                      min={1}
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-600 mt-2">{formError}</p>
              )}

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-sm"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary text-sm"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : editStudent ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-2">¿Eliminar alumno?</h2>
              <p className="text-sm text-gray-600 mb-5">
                Se eliminarán también sus calificaciones registradas. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteId(null)} className="btn-secondary text-sm">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
