"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import AvatarUpload from "@/components/AvatarUpload";

type Group = { id: string; grade: number; letter: string };
type Student = {
  id: string;
  full_name: string;
  curp: string | null;
  list_num: number;
  group_id: string;
  status: string; // 'activo' | 'inactivo' | 'baja'
  avatar_url: string | null;
};

// Helper to identify "Bajas" groups
function isBajasGroup(g: Group): boolean {
  return g.letter === "Bajas";
}

/** Title Case display: "MICHAUS VELAZQUEZ KEVIN" → "Michaus Velazquez Kevin" */
function toTitleCase(str: string): string {
  return str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo", color: "bg-green-100 text-green-700" },
  { value: "inactivo", label: "Inactivo", color: "bg-amber-100 text-amber-700" },
  { value: "baja", label: "Baja", color: "bg-red-100 text-red-700" },
];

export default function AdminAlumnosPage() {
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
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  // Modal state for add/edit
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState("");
  const [formCurp, setFormCurp] = useState("");
  const [formListNum, setFormListNum] = useState("");
  const [formError, setFormError] = useState("");

  // Group change modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupChangeStudent, setGroupChangeStudent] = useState<Student | null>(null);
  const [targetGroup, setTargetGroup] = useState<string>("");
  const [groupChangeError, setGroupChangeError] = useState("");
  const [pendingReactivateStatus, setPendingReactivateStatus] = useState<string | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Status change (inline)
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  // Init
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!prof) { router.push("/dashboard"); return; }
      const permRes = await fetch("/api/auth/permissions");
      const { permissions } = await permRes.json();
      if (!permissions?.includes("admin_alumnos")) {
        router.push("/dashboard"); return;
      }
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

  // Load students
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
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.curp && s.curp.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "todos" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const currentGroup = groups.find((g) => g.id === selectedGroup);
  const groupLabel = currentGroup ? `${currentGroup.grade}° ${currentGroup.letter}` : "";

  // Same-grade groups for transfers (exclude Bajas groups)
  const sameGradeGroups = currentGroup
    ? groups.filter((g) => g.grade === currentGroup.grade && g.id !== selectedGroup && !isBajasGroup(g))
    : [];

  // Find the Bajas group for the current grade
  const bajasGroupForGrade = currentGroup
    ? groups.find((g) => g.grade === currentGroup.grade && isBajasGroup(g))
    : null;

  // Is current group a Bajas group?
  const isCurrentBajas = currentGroup ? isBajasGroup(currentGroup) : false;

  // ── Add modal ──
  function openAdd() {
    setEditStudent(null);
    setFormName("");
    setFormCurp("");
    const maxNum = students.length > 0 ? Math.max(...students.map((s) => s.list_num)) : 0;
    setFormListNum(String(maxNum + 1));
    setFormError("");
    setShowModal(true);
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setFormName(s.full_name);
    setFormCurp(s.curp || "");
    setFormListNum(String(s.list_num));
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    const name = formName.trim();
    if (!name) { setFormError("El nombre es obligatorio"); return; }
    const num = parseInt(formListNum);
    if (isNaN(num) || num < 1) { setFormError("N° de lista inválido"); return; }

    setSaving(true);
    setFormError("");

    if (editStudent) {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: name,
          curp: formCurp.trim().toUpperCase() || null,
          list_num: num,
        })
        .eq("id", editStudent.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from("students")
        .insert({
          full_name: name,
          curp: formCurp.trim().toUpperCase() || null,
          list_num: num,
          group_id: selectedGroup,
          status: "activo",
        });
      if (error) { setFormError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    // Re-sort alphabetically and reassign list_num
    await autoSortStudents();
  }

  /** Sort students alphabetically by full_name and reassign list_num */
  async function autoSortStudents() {
    if (!selectedGroup) return;
    const { data } = await supabase
      .from("students")
      .select("id, full_name, list_num")
      .eq("group_id", selectedGroup)
      .order("full_name");
    if (!data || data.length === 0) { loadStudents(); return; }

    // Build batch of updates only where list_num changed
    const updates: { id: string; list_num: number }[] = [];
    data.forEach((s, idx) => {
      const newNum = idx + 1;
      if (s.list_num !== newNum) updates.push({ id: s.id, list_num: newNum });
    });

    // Apply updates in parallel (small batch per group)
    if (updates.length > 0) {
      await Promise.all(
        updates.map((u) =>
          supabase.from("students").update({ list_num: u.list_num }).eq("id", u.id)
        )
      );
    }

    loadStudents();
  }

  // ── Status change ──
  async function handleStatusChange(studentId: string, newStatus: string) {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    setChangingStatus(studentId);

    if (newStatus === "baja" && bajasGroupForGrade && !isCurrentBajas) {
      // Auto-move to Bajas group
      const { data: targetStudents } = await supabase
        .from("students")
        .select("list_num")
        .eq("group_id", bajasGroupForGrade.id)
        .order("list_num", { ascending: false })
        .limit(1);
      const nextNum = targetStudents && targetStudents.length > 0 ? targetStudents[0].list_num + 1 : 1;

      await supabase
        .from("students")
        .update({ status: "baja", group_id: bajasGroupForGrade.id, list_num: nextNum })
        .eq("id", studentId);
    } else if (newStatus !== "baja" && isCurrentBajas) {
      // Reactivating from Bajas — need to pick a group
      setGroupChangeStudent(student);
      setTargetGroup(sameGradeGroups.length > 0 ? sameGradeGroups[0].id : "");
      setGroupChangeError("");
      setPendingReactivateStatus(newStatus);
      setShowGroupModal(true);
      setChangingStatus(null);
      return;
    } else {
      await supabase
        .from("students")
        .update({ status: newStatus })
        .eq("id", studentId);
    }

    await loadStudents();
    setChangingStatus(null);
  }

  // ── Group change ──
  function openGroupChange(s: Student) {
    setGroupChangeStudent(s);
    setTargetGroup(sameGradeGroups.length > 0 ? sameGradeGroups[0].id : "");
    setGroupChangeError("");
    setShowGroupModal(true);
  }

  async function handleGroupChange() {
    if (!groupChangeStudent || !targetGroup) return;
    setSaving(true);
    setGroupChangeError("");

    // Get next available list_num in target group
    const { data: targetStudents } = await supabase
      .from("students")
      .select("list_num")
      .eq("group_id", targetGroup)
      .order("list_num", { ascending: false })
      .limit(1);

    const nextNum = targetStudents && targetStudents.length > 0
      ? targetStudents[0].list_num + 1
      : 1;

    // If reactivating from Bajas, also update status
    const updateData: Record<string, unknown> = { group_id: targetGroup, list_num: nextNum };
    if (pendingReactivateStatus) {
      updateData.status = pendingReactivateStatus;
    }

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", groupChangeStudent.id);

    if (error) {
      setGroupChangeError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowGroupModal(false);
    setGroupChangeStudent(null);
    setPendingReactivateStatus(null);
    loadStudents();
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteId) return;
    await supabase.from("students").delete().eq("id", deleteId);
    setDeleteId(null);
    loadStudents();
  }

  // ── Counts ──
  const countByStatus = {
    activo: students.filter((s) => s.status === "activo").length,
    inactivo: students.filter((s) => s.status === "inactivo").length,
    baja: students.filter((s) => s.status === "baja").length,
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar userName={(effectiveProfile || profile)!.full_name} userRole={(effectiveProfile || profile)!.role} />
      <main className="page-content max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              Alumnos
            </h1>
            <p className="text-sm text-gray-500">Gestión de alumnos por grupo</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {groups.filter((g) => !isBajasGroup(g)).map((g) => (
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
          {/* Separator + Bajas groups */}
          {groups.some((g) => isBajasGroup(g)) && (
            <>
              <span className="text-gray-300 self-center">|</span>
              {groups.filter((g) => isBajasGroup(g)).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedGroup === g.id
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  ⊘ {g.grade}° Bajas
                </button>
              ))}
            </>
          )}
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-auto"
          >
            <option value="todos">Todos ({students.length})</option>
            <option value="activo">Activos ({countByStatus.activo})</option>
            <option value="inactivo">Inactivos ({countByStatus.inactivo})</option>
            <option value="baja">Bajas ({countByStatus.baja})</option>
          </select>
          <button onClick={openAdd} className="btn-primary text-sm whitespace-nowrap">
            + Agregar alumno
          </button>
        </div>

        {/* Students table */}
        <div className="card overflow-x-auto">
          <table className="grade-table">
            <thead>
              <tr>
                <th className="w-14">N°</th>
                <th>Nombre completo</th>
                <th className="hidden sm:table-cell">CURP</th>
                <th className="w-28 text-center">Estado</th>
                <th className="w-36 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                    {students.length === 0
                      ? `No hay alumnos en ${groupLabel}. Agrega el primero.`
                      : "Sin resultados para el filtro aplicado."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className={s.status !== "activo" ? "opacity-50" : ""}>
                    <td className="text-center font-medium">{s.list_num}</td>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {s.full_name.charAt(0)}
                          </div>
                        )}
                        {toTitleCase(s.full_name)}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell text-xs text-gray-500 font-mono">
                      {s.curp || "—"}
                    </td>
                    <td className="text-center">
                      <select
                        value={s.status}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        disabled={changingStatus === s.id}
                        className={`text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer ${
                          STATUS_OPTIONS.find((o) => o.value === s.status)?.color || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-xs text-primary-600 hover:text-primary-800 px-1.5 py-0.5"
                          title="Editar datos"
                        >
                          Editar
                        </button>
                        {sameGradeGroups.length > 0 && !isCurrentBajas && (
                          <button
                            onClick={() => openGroupChange(s)}
                            className="text-xs text-violet-600 hover:text-violet-800 px-1.5 py-0.5"
                            title="Cambiar de grupo"
                          >
                            Mover
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5"
                          title="Eliminar alumno"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {students.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-right flex flex-wrap gap-3 justify-end">
              <span className="text-green-600 font-medium">{countByStatus.activo} activos</span>
              {countByStatus.inactivo > 0 && <span className="text-amber-600">{countByStatus.inactivo} inactivos</span>}
              {countByStatus.baja > 0 && <span className="text-red-600">{countByStatus.baja} bajas</span>}
              <span>· {students.length} total en {groupLabel}</span>
            </div>
          )}
        </div>

        {/* ── Add/Edit Modal ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                {editStudent ? "Editar alumno" : `Nuevo alumno — ${groupLabel}`}
              </h2>

              {editStudent && (
                <div className="flex justify-center mb-4">
                  <AvatarUpload
                    currentUrl={editStudent.avatar_url}
                    entityType="student"
                    entityId={editStudent.id}
                    size={80}
                    onUploaded={(url) => {
                      setStudents((prev) => prev.map((s) => s.id === editStudent.id ? { ...s, avatar_url: url } : s));
                    }}
                  />
                </div>
              )}

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
                <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>
                  Cancelar
                </button>
                <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
                  {saving ? "Guardando..." : editStudent ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Group Change Modal ── */}
        {showGroupModal && groupChangeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-2">
                {pendingReactivateStatus ? "Reactivar alumno — Seleccionar grupo" : "Cambiar de grupo"}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {pendingReactivateStatus
                  ? <>Selecciona el grupo destino para <span className="font-semibold">{groupChangeStudent.full_name}</span>:</>
                  : <>Mover a <span className="font-semibold">{groupChangeStudent.full_name}</span> de{" "}
                    <span className="font-semibold">{groupLabel}</span> a:</>
                }
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {sameGradeGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setTargetGroup(g.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      targetGroup === g.id
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {g.grade}° {g.letter}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Se asignará el siguiente número de lista disponible en el grupo destino. Las calificaciones existentes se conservan.
              </p>

              {groupChangeError && (
                <p className="text-xs text-red-600 mb-3">{groupChangeError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowGroupModal(false); setGroupChangeStudent(null); setPendingReactivateStatus(null); }}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGroupChange}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
                  disabled={saving || !targetGroup}
                >
                  {saving ? "Moviendo..." : "Confirmar cambio"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete confirmation ── */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-2">¿Eliminar alumno?</h2>
              <p className="text-sm text-gray-600 mb-5">
                Se eliminarán también sus calificaciones registradas. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteId(null)} className="btn-secondary">
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
