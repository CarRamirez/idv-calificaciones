"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Teacher = { id: string; full_name: string; email?: string };
type Group = { id: string; grade: number; letter: string };
type Subject = { id: string; name: string; short_name: string; grade: number };
type Assignment = { id: string; teacher_id: string; group_id: string; subject_id: string };

export default function AdminProfesoresPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // New teacher modal
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [newError, setNewError] = useState("");
  const [saving, setSaving] = useState(false);

  // Assignment modal
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null);
  const [assignGroup, setAssignGroup] = useState("");
  const [assignSubject, setAssignSubject] = useState("");

  // Delete confirmation
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!prof || prof.role !== "admin") { router.push("/dashboard"); return; }
      setProfile(prof);

      const [grps, subs] = await Promise.all([
        supabase.from("groups").select("id, grade, letter").order("grade").order("letter"),
        supabase.from("subjects").select("id, name, short_name, grade").order("grade").order("sort_order"),
      ]);
      setGroups(grps.data || []);
      setSubjects(subs.data || []);
      setLoading(false);
    }
    init();
  }, []);

  const loadTeachers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher")
      .order("full_name");
    setTeachers(data || []);
  }, []);

  const loadAssignments = useCallback(async () => {
    const { data } = await supabase.from("teacher_assignments").select("*");
    setAssignments(data || []);
  }, []);

  useEffect(() => { loadTeachers(); loadAssignments(); }, [loadTeachers, loadAssignments]);

  // Create teacher
  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim() || !newPass.trim()) {
      setNewError("Todos los campos son obligatorios"); return;
    }
    if (newPass.length < 6) { setNewError("La contraseña debe tener al menos 6 caracteres"); return; }
    setSaving(true); setNewError("");

    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim(), password: newPass, full_name: newName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setNewError(data.error || "Error al crear"); setSaving(false); return; }

    setSaving(false);
    setShowNew(false);
    setNewName(""); setNewEmail(""); setNewPass("");
    loadTeachers();
  }

  // Delete teacher
  async function handleDelete() {
    if (!deleteTeacher) return;
    await fetch("/api/admin/teachers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTeacher.id }),
    });
    setDeleteTeacher(null);
    loadTeachers();
    loadAssignments();
  }

  // Add assignment
  async function handleAddAssignment() {
    if (!assignTeacher || !assignGroup || !assignSubject) return;
    const exists = assignments.some(
      (a) => a.teacher_id === assignTeacher.id && a.group_id === assignGroup && a.subject_id === assignSubject
    );
    if (exists) return;

    await supabase.from("teacher_assignments").insert({
      teacher_id: assignTeacher.id,
      group_id: assignGroup,
      subject_id: assignSubject,
    });
    loadAssignments();
  }

  // Remove assignment
  async function removeAssignment(id: string) {
    await supabase.from("teacher_assignments").delete().eq("id", id);
    loadAssignments();
  }

  // Helper: get teacher assignments
  function getTeacherAssignments(teacherId: string) {
    return assignments.filter((a) => a.teacher_id === teacherId);
  }

  function groupLabel(gId: string) {
    const g = groups.find((g) => g.id === gId);
    return g ? `${g.grade}°${g.letter}` : "";
  }

  function subjectLabel(sId: string) {
    const s = subjects.find((s) => s.id === sId);
    return s ? s.short_name : "";
  }

  // Subjects filtered by selected group's grade
  const selectedGroupObj = groups.find((g) => g.id === assignGroup);
  const filteredSubjects = selectedGroupObj
    ? subjects.filter((s) => s.grade === selectedGroupObj.grade)
    : [];

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
          <h1 className="text-lg font-bold text-gray-900">Profesores</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(true)} className="btn-primary text-sm">
              + Nuevo profesor
            </button>
            <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
          </div>
        </div>

        {/* Teachers list */}
        {teachers.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No hay profesores registrados. Agrega el primero.
          </div>
        ) : (
          <div className="space-y-3">
            {teachers.map((t) => {
              const ta = getTeacherAssignments(t.id);
              return (
                <div key={t.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{t.full_name}</h3>
                      {ta.length === 0 ? (
                        <p className="text-xs text-gray-400 mt-1">Sin materias asignadas</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ta.map((a) => (
                            <span
                              key={a.id}
                              className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full"
                            >
                              {groupLabel(a.group_id)} — {subjectLabel(a.subject_id)}
                              <button
                                onClick={() => removeAssignment(a.id)}
                                className="text-primary-400 hover:text-red-600 ml-0.5"
                                title="Quitar asignación"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => {
                          setAssignTeacher(t);
                          setAssignGroup("");
                          setAssignSubject("");
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        + Asignar
                      </button>
                      <button
                        onClick={() => setDeleteTeacher(t)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New teacher modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">Nuevo profesor</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Nombre completo *</label>
                  <input
                    type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="input-field" placeholder="Nombre del profesor" autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Correo electrónico *</label>
                  <input
                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="input-field" placeholder="profesor@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                      className="input-field pr-10" placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
              </div>
              {newError && <p className="text-xs text-red-600 mt-2">{newError}</p>}
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowNew(false)} className="btn-secondary text-sm" disabled={saving}>Cancelar</button>
                <button onClick={handleCreate} className="btn-primary text-sm" disabled={saving}>
                  {saving ? "Creando..." : "Crear profesor"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment modal */}
        {assignTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-1">Asignar materia</h2>
              <p className="text-sm text-gray-500 mb-4">{assignTeacher.full_name}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Grupo</label>
                  <select
                    value={assignGroup}
                    onChange={(e) => { setAssignGroup(e.target.value); setAssignSubject(""); }}
                    className="input-field"
                  >
                    <option value="">Selecciona grupo...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.grade}° {g.letter}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Materia</label>
                  <select
                    value={assignSubject}
                    onChange={(e) => setAssignSubject(e.target.value)}
                    className="input-field"
                    disabled={!assignGroup}
                  >
                    <option value="">Selecciona materia...</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setAssignTeacher(null)} className="btn-secondary text-sm">Cerrar</button>
                <button
                  onClick={handleAddAssignment}
                  className="btn-primary text-sm"
                  disabled={!assignGroup || !assignSubject}
                >
                  Asignar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {deleteTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-2">¿Eliminar profesor?</h2>
              <p className="text-sm text-gray-600 mb-1">{deleteTeacher.full_name}</p>
              <p className="text-xs text-gray-500 mb-5">
                Se eliminará su cuenta, perfil y todas sus asignaciones.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTeacher(null)} className="btn-secondary text-sm">Cancelar</button>
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
