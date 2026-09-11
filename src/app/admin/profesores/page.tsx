"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Teacher = { id: string; full_name: string; email?: string };
type Group = { id: string; grade: number; letter: string };
type Subject = { id: string; name: string; short_name: string; grade: number };
type Assignment = { id: string; teacher_id: string; group_id: string; subject_id: string };
type BulkResult = { email: string; ok: boolean; error?: string };

export default function AdminProfesoresPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

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

  // CSV bulk upload
  const [showBulk, setShowBulk] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ full_name: string; email: string; password: string }[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [csvError, setCsvError] = useState("");

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
      .select("id, full_name, email")
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
    if (newPass.length < 6) { setNewError("La contrasena debe tener al menos 6 caracteres"); return; }
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

  // CSV parsing
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setBulkResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvError("El archivo debe tener al menos un encabezado y una fila de datos");
        return;
      }

      // Parse header
      const sep = lines[0].includes(";") ? ";" : ",";
      const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

      const nameIdx = header.findIndex((h) => h === "nombre" || h === "full_name" || h === "name");
      const emailIdx = header.findIndex((h) => h === "correo" || h === "email" || h === "mail");
      const passIdx = header.findIndex((h) => h === "contrasena" || h === "password" || h === "pass" || h === "contraseña");

      if (nameIdx === -1 || emailIdx === -1 || passIdx === -1) {
        setCsvError("El CSV debe tener columnas: nombre, correo, contrasena (o equivalentes en ingles)");
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
        return {
          full_name: cols[nameIdx] || "",
          email: cols[emailIdx] || "",
          password: cols[passIdx] || "",
        };
      }).filter((r) => r.full_name || r.email);

      if (rows.length === 0) {
        setCsvError("No se encontraron filas validas en el archivo");
        return;
      }

      setCsvPreview(rows);
      setShowBulk(true);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  // Bulk upload
  async function handleBulkUpload() {
    setBulkUploading(true);
    setBulkResults(null);

    const res = await fetch("/api/admin/teachers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teachers: csvPreview }),
    });
    const data = await res.json();
    setBulkUploading(false);

    if (!res.ok) {
      setCsvError(data.error || "Error en la carga");
      return;
    }

    setBulkResults(data.results);
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

  function getTeacherAssignments(teacherId: string) {
    return assignments.filter((a) => a.teacher_id === teacherId);
  }

  function groupLabel(gId: string) {
    const g = groups.find((gr) => gr.id === gId);
    return g ? `${g.grade}${g.letter}` : "";
  }

  function subjectLabel(sId: string) {
    const s = subjects.find((su) => su.id === sId);
    return s ? s.short_name : "";
  }

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h1 className="text-lg font-bold text-gray-900">Profesores</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowNew(true)} className="btn-primary text-sm">
              + Nuevo profesor
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-secondary text-sm inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Cargar CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className="hidden"
            />
            <Link href="/usuarios" className="btn-secondary text-sm">← Volver</Link>
          </div>
        </div>

        {/* CSV format hint */}
        {csvError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {csvError}
          </div>
        )}

        {/* Teachers list */}
        {teachers.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            <p>No hay profesores registrados.</p>
            <p className="mt-2">Usa el boton <strong>+ Nuevo profesor</strong> o carga un archivo CSV con columnas: <code className="bg-gray-100 px-1 rounded">nombre, correo, contrasena</code></p>
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
                      <p className="text-xs text-gray-400">{t.email || "Sin correo"}</p>
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
                                title="Quitar asignacion"
                              >
                                x
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
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Correo electronico *</label>
                  <input
                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="input-field" placeholder="profesor@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Contrasena *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                      className="input-field pr-10" placeholder="Minimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showPass ? "Ocultar" : "Ver"}
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

        {/* CSV Bulk Upload Modal */}
        {showBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-6 max-h-[80vh] flex flex-col">
              <h2 className="text-base font-bold text-gray-900 mb-1">Carga masiva de profesores</h2>
              <p className="text-sm text-gray-500 mb-4">
                {csvPreview.length} profesor{csvPreview.length !== 1 ? "es" : ""} encontrado{csvPreview.length !== 1 ? "s" : ""} en el archivo
              </p>

              {/* Preview table */}
              <div className="overflow-auto flex-1 border border-gray-200 rounded-lg mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">#</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Nombre</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Correo</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Contrasena</th>
                      {bulkResults && (
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Estado</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {csvPreview.map((row, i) => {
                      const result = bulkResults?.[i];
                      return (
                        <tr key={i} className={result ? (result.ok ? "bg-green-50" : "bg-red-50") : ""}>
                          <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-900">{row.full_name}</td>
                          <td className="px-3 py-2 text-gray-600">{row.email}</td>
                          <td className="px-3 py-2 text-gray-400">{"*".repeat(Math.min(row.password.length, 8))}</td>
                          {bulkResults && (
                            <td className="px-3 py-2 text-xs">
                              {result?.ok ? (
                                <span className="text-green-700 font-medium">Creado</span>
                              ) : (
                                <span className="text-red-600">{result?.error || "Error"}</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary after upload */}
              {bulkResults && (
                <div className="mb-4 flex gap-3 text-sm">
                  <span className="text-green-700 font-medium">
                    {bulkResults.filter((r) => r.ok).length} creados
                  </span>
                  {bulkResults.some((r) => !r.ok) && (
                    <span className="text-red-600 font-medium">
                      {bulkResults.filter((r) => !r.ok).length} con error
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowBulk(false);
                    setCsvPreview([]);
                    setBulkResults(null);
                    setCsvError("");
                  }}
                  className="btn-secondary text-sm"
                >
                  {bulkResults ? "Cerrar" : "Cancelar"}
                </button>
                {!bulkResults && (
                  <button
                    onClick={handleBulkUpload}
                    className="btn-primary text-sm"
                    disabled={bulkUploading}
                  >
                    {bulkUploading ? "Creando cuentas..." : `Crear ${csvPreview.length} profesor${csvPreview.length !== 1 ? "es" : ""}`}
                  </button>
                )}
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
                      <option key={g.id} value={g.id}>{g.grade} {g.letter}</option>
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
              <h2 className="text-base font-bold text-gray-900 mb-2">Eliminar profesor?</h2>
              <p className="text-sm text-gray-600 mb-1">{deleteTeacher.full_name}</p>
              <p className="text-xs text-gray-500 mb-5">
                Se eliminara su cuenta, perfil y todas sus asignaciones.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTeacher(null)} className="btn-secondary text-sm">Cancelar</button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Si, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
