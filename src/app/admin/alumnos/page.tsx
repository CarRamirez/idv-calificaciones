"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  status: string;
  avatar_url: string | null;
  control_number: string | null;
};

type CambioInterno = {
  student_id: string;
  grupo_destino: string;
  motivo: string | null;
};

function isBajasGroup(g: Group): boolean {
  return g.letter === "Bajas";
}

function toTitleCase(str: string): string {
  return str.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

const GRADE_COLOR: Record<number, string> = {
  1: "text-blue-700 dark:text-blue-400",
  2: "text-emerald-700 dark:text-emerald-400",
  3: "text-purple-700 dark:text-purple-400",
};

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo", color: "bg-green-100 text-green-700" },
  { value: "inactivo", label: "Inactivo", color: "bg-amber-100 text-amber-700" },
  { value: "baja", label: "Baja", color: "bg-red-100 text-red-700" },
];

/* ── Segment chip component (like SIGEFCP) ── */
function Segmento({ etiqueta, valor, opciones, onCambio }: {
  etiqueta: string;
  valor: string;
  opciones: [string, string][];
  onCambio: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">{etiqueta}</span>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {opciones.map(([v, t]) => (
          <button key={v} onClick={() => onCambio(v)}
            className={`rounded-lg px-3 py-1 text-sm font-semibold transition-colors ${
              valor === v ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}>{t}</button>
        ))}
      </div>
    </div>
  );
}

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
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"activos" | "sin_curp" | "bajas">("activos");
  const [gradoF, setGradoF] = useState<number | "">("");
  const [grupoF, setGrupoF] = useState<string>("");

  // Cambios internos
  const [cambiosInternos, setCambiosInternos] = useState<Record<string, CambioInterno>>({});

  // Modal state for add/edit
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState("");
  const [formCurp, setFormCurp] = useState("");
  const [formListNum, setFormListNum] = useState("");
  const [formError, setFormError] = useState("");

  // Cambio interno modal
  const [cambioModal, setCambioModal] = useState<{ student: Student; terminar: boolean } | null>(null);
  const [cambioDestino, setCambioDestino] = useState<string>("");
  const [cambioMotivo, setCambioMotivo] = useState("");
  const [cambiando, setCambiando] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Status change
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  // Group change modal (for moves/reactivation from bajas)
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupChangeStudent, setGroupChangeStudent] = useState<Student | null>(null);
  const [targetGroup, setTargetGroup] = useState<string>("");
  const [groupChangeError, setGroupChangeError] = useState("");
  const [pendingReactivateStatus, setPendingReactivateStatus] = useState<string | null>(null);

  // Init — load ALL students at once
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

      // Load groups
      const { data: grps } = await supabase
        .from("groups")
        .select("id, grade, letter")
        .order("grade")
        .order("letter");
      if (grps) setGroups(grps);

      // Load ALL students at once (not per-group)
      const { data: studs } = await supabase
        .from("students")
        .select("id, full_name, curp, list_num, group_id, status, avatar_url, control_number")
        .order("full_name");
      if (studs) setAllStudents(studs as Student[]);

      // Load active cambios internos
      const { data: cambios } = await supabase
        .from("cambios_internos")
        .select("student_id, grupo_destino, motivo")
        .is("fin", null);
      if (cambios) {
        const map: Record<string, CambioInterno> = {};
        (cambios as CambioInterno[]).forEach((c) => { map[c.student_id] = c; });
        setCambiosInternos(map);
      }

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload students
  const reloadStudents = useCallback(async () => {
    const { data: studs } = await supabase
      .from("students")
      .select("id, full_name, curp, list_num, group_id, status, avatar_url, control_number")
      .order("full_name");
    if (studs) setAllStudents(studs as Student[]);

    const { data: cambios } = await supabase
      .from("cambios_internos")
      .select("student_id, grupo_destino, motivo")
      .is("fin", null);
    if (cambios) {
      const map: Record<string, CambioInterno> = {};
      (cambios as CambioInterno[]).forEach((c) => { map[c.student_id] = c; });
      setCambiosInternos(map);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group map
  const gMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const etiqueta = useCallback((id: string) => {
    const g = gMap.get(id);
    return g ? `${g.grade}°${g.letter}` : "?";
  }, [gMap]);

  // Filtered list (all client-side)
  type Row = Student & { huesped?: boolean; grupoReal?: string };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base: Row[] = [];

    // Regular students
    allStudents.forEach((s) => { base.push(s); });

    // Add ghost rows for cloned students (they appear in destination group too)
    allStudents.forEach((s) => {
      const c = cambiosInternos[s.id];
      if (c && s.status === "activo") {
        base.push({ ...s, huesped: true, grupoReal: s.group_id, group_id: c.grupo_destino });
      }
    });

    return base
      .filter((s) => {
        // Grade filter
        if (gradoF !== "") {
          const g = gMap.get(s.group_id);
          if (!g || g.grade !== gradoF) return false;
        }
        // Group filter
        if (grupoF) {
          if (s.group_id !== grupoF) return false;
        }
        // Status filter
        if (filterStatus === "bajas") {
          if (s.status !== "baja") return false;
        } else if (filterStatus === "sin_curp") {
          if (s.status === "baja" || s.curp) return false;
        } else {
          if (s.status === "baja") return false;
        }
        // Search
        if (q) {
          const haystack = `${s.full_name} ${s.curp || ""} ${s.control_number || ""}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ga = gMap.get(a.group_id);
        const gb = gMap.get(b.group_id);
        if (!ga || !gb) return 0;
        if (ga.grade !== gb.grade) return ga.grade - gb.grade;
        if (ga.letter !== gb.letter) return ga.letter.localeCompare(gb.letter);
        return a.full_name.localeCompare(b.full_name);
      });
  }, [allStudents, cambiosInternos, search, gradoF, grupoF, filterStatus, gMap]);

  const sinCurp = useMemo(() => allStudents.filter((s) => s.status !== "baja" && !s.curp).length, [allStudents]);

  // ── Same-grade groups for a student ──
  function sameGradeGroups(studentGroupId: string) {
    const g = gMap.get(studentGroupId);
    if (!g) return [];
    return groups.filter((gr) => gr.grade === g.grade && gr.id !== studentGroupId && !isBajasGroup(gr));
  }

  // ── Add modal ──
  function openAdd() {
    setEditStudent(null);
    setFormName("");
    setFormCurp("");
    setFormListNum("");
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

    setSaving(true);
    setFormError("");

    if (editStudent) {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: name,
          curp: formCurp.trim().toUpperCase() || null,
        })
        .eq("id", editStudent.id);
      if (error) { setFormError(error.message); setSaving(false); return; }
    } else {
      // For new student, determine group
      const gId = grupoF || (groups.length > 0 ? groups[0].id : "");
      if (!gId) { setFormError("No hay grupos disponibles"); setSaving(false); return; }
      // Get next list_num
      const groupStudents = allStudents.filter((s) => s.group_id === gId);
      const maxNum = groupStudents.length > 0 ? Math.max(...groupStudents.map((s) => s.list_num)) : 0;
      const { error } = await supabase
        .from("students")
        .insert({
          full_name: name,
          curp: formCurp.trim().toUpperCase() || null,
          list_num: maxNum + 1,
          group_id: gId,
          status: "activo",
        });
      if (error) { setFormError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    setShowModal(false);
    await reloadStudents();
  }

  // ── Status change ──
  async function handleStatusChange(student: Student, newStatus: string) {
    setChangingStatus(student.id);
    const g = gMap.get(student.group_id);
    const bajasGroup = g ? groups.find((gr) => gr.grade === g.grade && isBajasGroup(gr)) : null;
    const isInBajas = g ? isBajasGroup(g) : false;

    if (newStatus === "baja" && bajasGroup && !isInBajas) {
      const groupStudents = allStudents.filter((s) => s.group_id === bajasGroup.id);
      const nextNum = groupStudents.length > 0 ? Math.max(...groupStudents.map((s) => s.list_num)) + 1 : 1;
      await supabase.from("students").update({ status: "baja", group_id: bajasGroup.id, list_num: nextNum }).eq("id", student.id);
    } else if (newStatus !== "baja" && isInBajas) {
      setGroupChangeStudent(student);
      const sg = sameGradeGroups(student.group_id);
      setTargetGroup(sg.length > 0 ? sg[0].id : "");
      setGroupChangeError("");
      setPendingReactivateStatus(newStatus);
      setShowGroupModal(true);
      setChangingStatus(null);
      return;
    } else {
      await supabase.from("students").update({ status: newStatus }).eq("id", student.id);
    }
    await reloadStudents();
    setChangingStatus(null);
  }

  // ── Cambio interno ──
  async function ejecutarCambio() {
    if (!cambioModal) return;
    setCambiando(true);

    if (cambioModal.terminar) {
      const { error } = await supabase.rpc("terminar_cambio_interno", { p_student_id: cambioModal.student.id });
      if (error) { alert(error.message); setCambiando(false); return; }
    } else {
      if (!cambioDestino) { setCambiando(false); return; }
      const { error } = await supabase.rpc("crear_cambio_interno", {
        p_student_id: cambioModal.student.id,
        p_destino: cambioDestino,
        p_motivo: cambioMotivo.trim() || null,
      });
      if (error) { alert(error.message); setCambiando(false); return; }
    }

    setCambiando(false);
    setCambioModal(null);
    setCambioDestino("");
    setCambioMotivo("");
    await reloadStudents();
  }

  // ── Group change (reactivation from bajas) ──
  async function handleGroupChange() {
    if (!groupChangeStudent || !targetGroup) return;
    setSaving(true);
    setGroupChangeError("");
    const groupStudents = allStudents.filter((s) => s.group_id === targetGroup);
    const nextNum = groupStudents.length > 0 ? Math.max(...groupStudents.map((s) => s.list_num)) + 1 : 1;
    const updateData: Record<string, unknown> = { group_id: targetGroup, list_num: nextNum };
    if (pendingReactivateStatus) updateData.status = pendingReactivateStatus;

    const { error } = await supabase.from("students").update(updateData).eq("id", groupChangeStudent.id);
    if (error) { setGroupChangeError(error.message); setSaving(false); return; }

    setSaving(false);
    setShowGroupModal(false);
    setGroupChangeStudent(null);
    setPendingReactivateStatus(null);
    await reloadStudents();
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteId) return;
    await supabase.from("students").delete().eq("id", deleteId);
    setDeleteId(null);
    await reloadStudents();
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <Navbar userName={(effectiveProfile || profile)!.full_name} userRole={(effectiveProfile || profile)!.role}>
      <main className="page-content animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
            <p className="text-sm text-slate-500">Altas, bajas, cambios de grupo y corrección de datos.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
        </div>

        {/* Top bar: search + status chips + actions */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="text"
              placeholder="Buscar nombre, CURP o N° de control…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-64"
            />
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {([
                ["activos", "Activos"],
                ["sin_curp", `Sin CURP (${sinCurp})`],
                ["bajas", "Bajas"],
              ] as const).map(([k, t]) => (
                <button key={k} onClick={() => setFilterStatus(k)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    filterStatus === k ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <button onClick={openAdd} className="btn-primary text-sm whitespace-nowrap">+ Nuevo alumno</button>
        </div>

        {/* Filter chips: Grado → Grupo (like SIGEFCP) */}
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl p-3 mb-4">
          <Segmento etiqueta="Grado" valor={String(gradoF)}
            opciones={[["", "Todos"], ["1", "1°"], ["2", "2°"], ["3", "3°"]]}
            onCambio={(v) => { setGradoF(v ? Number(v) : ""); setGrupoF(""); }} />
          {gradoF !== "" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">Grupo</span>
              <button onClick={() => setGrupoF("")}
                className={`rounded-lg px-2.5 py-1 text-sm font-semibold transition-colors ${
                  grupoF === "" ? "bg-primary-600 text-white" : "bg-slate-100"
                }`}>Todos</button>
              {groups.filter((g) => g.grade === gradoF && !isBajasGroup(g)).map((g) => (
                <button key={g.id} onClick={() => setGrupoF(g.id)}
                  className={`min-w-[2.75rem] rounded-lg px-2.5 py-1 text-sm font-bold transition-colors ${
                    grupoF === g.id ? "bg-primary-600 text-white shadow-sm" : `bg-slate-100 ${GRADE_COLOR[g.grade] || ""}`
                  }`}>
                  {g.grade}°{g.letter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count */}
        <p className="text-xs text-slate-500 mb-2">
          {filtered.length} {filtered.length === 1 ? "alumno" : "alumnos"}
          {grupoF ? ` · ${etiqueta(grupoF)}` : gradoF !== "" ? ` · ${gradoF}°` : ""}
        </p>

        {/* Table */}
        <div className="card overflow-x-auto">
          <table className="grade-table w-full">
            <thead>
              <tr>
                <th className="w-20 text-left">Grupo</th>
                <th className="text-left">Alumno</th>
                <th className="text-left">N° Control</th>
                <th className="hidden sm:table-cell text-left">CURP</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                    No hay alumnos con ese filtro.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 400).map((s: Row) => {
                  const g = gMap.get(s.group_id);
                  const isHuesped = !!s.huesped;
                  const cambio = cambiosInternos[s.id];
                  return (
                    <tr key={`${s.id}${isHuesped ? "-h" : ""}`}
                      className={`${s.status === "baja" ? "opacity-50" : ""} ${isHuesped ? "bg-sky-50/60" : ""}`}>
                      <td className={`font-bold ${g ? GRADE_COLOR[g.grade] || "" : ""}`}>
                        {etiqueta(s.group_id)}
                      </td>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {s.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {s.full_name.charAt(0)}
                            </div>
                          )}
                          <span>{toTitleCase(s.full_name)}</span>
                          {isHuesped && (
                            <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">
                              Clonado · alumno de {etiqueta(s.grupoReal || s.group_id)}
                            </span>
                          )}
                          {!isHuesped && cambio && (
                            <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                              Clonado en {etiqueta(cambio.grupo_destino)}
                            </span>
                          )}
                          {s.status === "baja" && (
                            <span className="inline-flex items-center ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">baja</span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-xs tabular-nums">{s.control_number || <span className="text-slate-300">—</span>}</td>
                      <td className="hidden sm:table-cell font-mono text-xs text-slate-500">
                        {s.curp || <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">falta</span>}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {!isHuesped && (
                            <button onClick={() => openEdit(s)}
                              className="text-xs text-primary-600 hover:text-primary-800 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                              Editar
                            </button>
                          )}
                          {/* Cambio interno */}
                          {s.status === "activo" && !isHuesped && !cambio && (
                            <button onClick={() => { setCambioModal({ student: s, terminar: false }); setCambioDestino(""); setCambioMotivo(""); }}
                              className="text-xs text-violet-600 hover:text-violet-800 px-2 py-1 rounded hover:bg-violet-50 transition-colors">
                              Cambio interno
                            </button>
                          )}
                          {/* Regresar de cambio interno */}
                          {!isHuesped && cambio && (
                            <button onClick={() => setCambioModal({ student: s, terminar: true })}
                              className="text-xs text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50 transition-colors">
                              ↩ Regresar a {etiqueta(s.group_id)}
                            </button>
                          )}
                          {/* Baja / Reactivar */}
                          {!isHuesped && (
                            <button onClick={() => handleStatusChange(s, s.status === "baja" ? "activo" : "baja")}
                              disabled={changingStatus === s.id}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                s.status === "baja"
                                  ? "text-green-600 hover:text-green-800 hover:bg-green-50"
                                  : "text-red-600 hover:text-red-800 hover:bg-red-50"
                              }`}>
                              {changingStatus === s.id ? "..." : s.status === "baja" ? "Reactivar" : "Baja"}
                            </button>
                          )}
                          {!isHuesped && s.status === "baja" && (
                            <button onClick={() => setDeleteId(s.id)}
                              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filtered.length > 400 && (
            <p className="p-3 text-center text-xs text-slate-400">
              Mostrando 400 de {filtered.length}. Filtra por grupo o busca por nombre.
            </p>
          )}
        </div>

        {/* ── Add/Edit Modal ── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                {editStudent ? "Editar alumno" : "Nuevo alumno"}
              </h2>

              {editStudent && (
                <div className="flex justify-center mb-4">
                  <AvatarUpload
                    currentUrl={editStudent.avatar_url}
                    entityType="student"
                    entityId={editStudent.id}
                    size={80}
                    onUploaded={(url) => {
                      setAllStudents((prev) => prev.map((s) => s.id === editStudent.id ? { ...s, avatar_url: url } : s));
                    }}
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Nombre completo *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="input-field" placeholder="APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">CURP <span className="text-slate-400">(opcional)</span></label>
                  <input type="text" value={formCurp} onChange={(e) => setFormCurp(e.target.value)}
                    className="input-field font-mono uppercase" placeholder="18 caracteres" maxLength={18} />
                </div>
              </div>

              {formError && <p className="text-xs text-red-600 mt-2">{formError}</p>}

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
                <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
                  {saving ? "Guardando..." : editStudent ? "Guardar cambios" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Cambio interno Modal ── */}
        {cambioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                {cambioModal.terminar ? "Regresar a su grupo" : "Cambio interno de grupo"}
              </h2>

              {cambioModal.terminar ? (
                <p className="text-sm text-slate-600 mb-4">
                  <strong>{toTitleCase(cambioModal.student.full_name)}</strong> deja de estar clonado en{" "}
                  {etiqueta(cambiosInternos[cambioModal.student.id]?.grupo_destino || "")} y
                  regresa a su grupo original <strong>{etiqueta(cambioModal.student.group_id)}</strong>.
                  Las calificaciones que ya se capturaron se conservan.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    <strong>{toTitleCase(cambioModal.student.full_name)}</strong> sigue inscrito en{" "}
                    <strong>{etiqueta(cambioModal.student.group_id)}</strong>.
                    Mientras dure el cambio, los profesores del grupo elegido le capturan calificaciones.
                  </p>
                  <label className="block text-sm font-medium text-slate-700">
                    Grupo donde tomará clases
                    <select className="input-field mt-1" value={cambioDestino}
                      onChange={(e) => setCambioDestino(e.target.value)}>
                      <option value="">Elige el grupo…</option>
                      {sameGradeGroups(cambioModal.student.group_id).map((g) => (
                        <option key={g.id} value={g.id}>{g.grade}°{g.letter}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Motivo <span className="font-normal text-slate-400">(opcional)</span>
                    <input className="input-field mt-1" maxLength={200} value={cambioMotivo}
                      onChange={(e) => setCambioMotivo(e.target.value)} />
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setCambioModal(null)} className="btn-secondary" disabled={cambiando}>Cancelar</button>
                <button onClick={ejecutarCambio}
                  disabled={cambiando || (!cambioModal.terminar && !cambioDestino)}
                  className="btn-primary text-sm">
                  {cambiando ? "Guardando…" : cambioModal.terminar ? "Regresar" : "Hacer cambio"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Group Change Modal (reactivation from Bajas) ── */}
        {showGroupModal && groupChangeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-2">Reactivar alumno — Seleccionar grupo</h2>
              <p className="text-sm text-slate-600 mb-4">
                Selecciona el grupo destino para <span className="font-semibold">{toTitleCase(groupChangeStudent.full_name)}</span>:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {sameGradeGroups(groupChangeStudent.group_id).map((g) => (
                  <button key={g.id} onClick={() => setTargetGroup(g.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      targetGroup === g.id ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}>{g.grade}° {g.letter}</button>
                ))}
              </div>
              {groupChangeError && <p className="text-xs text-red-600 mb-3">{groupChangeError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowGroupModal(false); setGroupChangeStudent(null); setPendingReactivateStatus(null); }}
                  className="btn-secondary" disabled={saving}>Cancelar</button>
                <button onClick={handleGroupChange} disabled={saving || !targetGroup}
                  className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
                  {saving ? "Moviendo..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete confirmation ── */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-2">¿Eliminar alumno?</h2>
              <p className="text-sm text-slate-600 mb-5">
                Se eliminarán también sus calificaciones registradas. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
                <button onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Navbar>
  );
}
