"use client";

import { useState, useMemo, useCallback } from "react";

type Group = { id: string; grade: number; letter: string };
type Subject = { id: string; name: string; short_name: string; grade: number; sort_order: number; counts_for_avg: boolean };
type Teacher = { id: string; full_name: string };
type Assignment = { id: string; teacher_id: string; group_id: string; subject_id: string };

type Props = {
  groups: Group[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
};

const GRADE_COLORS: Record<number, { chip: string; active: string }> = {
  1: { chip: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200", active: "bg-blue-600 text-white border border-blue-600" },
  2: { chip: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200", active: "bg-emerald-600 text-white border border-emerald-600" },
  3: { chip: "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200", active: "bg-purple-600 text-white border border-purple-600" },
};

export default function AsignarCliente({ groups, subjects, teachers, assignments: initialAssignments }: Props) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [saving, setSaving] = useState<string | null>(null);
  const [soloSinMaestro, setSoloSinMaestro] = useState(false);
  const [bulkSubject, setBulkSubject] = useState<string | null>(null);
  const [bulkTeacher, setBulkTeacher] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  // Mobile view
  const [mobileSubject, setMobileSubject] = useState<string | null>(null);

  const availableGrades = useMemo(() => {
    const gs = Array.from(new Set(groups.map((g) => g.grade))).sort();
    return gs;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!selectedGrade) return groups;
    return groups.filter((g) => g.grade === selectedGrade);
  }, [groups, selectedGrade]);

  const filteredSubjects = useMemo(() => {
    if (!selectedGrade) return subjects;
    return subjects.filter((s) => s.grade === selectedGrade);
  }, [subjects, selectedGrade]);

  // Build assignment map: `${group_id}-${subject_id}` -> teacher_id
  const assignmentMap = useMemo(() => {
    const map: Record<string, { id: string; teacher_id: string }> = {};
    for (const a of assignments) {
      map[`${a.group_id}-${a.subject_id}`] = { id: a.id, teacher_id: a.teacher_id };
    }
    return map;
  }, [assignments]);

  const getTeacherId = (groupId: string, subjectId: string) => {
    return assignmentMap[`${groupId}-${subjectId}`]?.teacher_id || "";
  };

  const handleAssign = useCallback(async (groupId: string, subjectId: string, teacherId: string) => {
    const key = `${groupId}-${subjectId}`;
    setSaving(key);
    try {
      const existing = assignmentMap[key];
      if (teacherId === "") {
        // Remove assignment
        if (existing) {
          await fetch("/api/admin/assignments", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacher_id: existing.teacher_id, group_id: groupId, subject_id: subjectId }),
          });
          setAssignments((prev) => prev.filter((a) => !(a.group_id === groupId && a.subject_id === subjectId)));
        }
      } else {
        if (existing) {
          // Delete old, create new
          await fetch("/api/admin/assignments", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacher_id: existing.teacher_id, group_id: groupId, subject_id: subjectId }),
          });
        }
        const res = await fetch("/api/admin/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacher_id: teacherId, group_id: groupId, subject_id: subjectId }),
        });
        const data = await res.json();
        setAssignments((prev) => {
          const filtered = prev.filter((a) => !(a.group_id === groupId && a.subject_id === subjectId));
          return [...filtered, { id: data.id || crypto.randomUUID(), teacher_id: teacherId, group_id: groupId, subject_id: subjectId }];
        });
      }
    } catch (err) {
      console.error("Error saving assignment:", err);
    } finally {
      setSaving(null);
    }
  }, [assignmentMap]);

  const handleBulkAssign = useCallback(async () => {
    if (!bulkSubject || !bulkTeacher) return;
    const groupsToAssign = filteredGroups;
    setSaving("bulk");
    try {
      for (const g of groupsToAssign) {
        await handleAssign(g.id, bulkSubject, bulkTeacher);
      }
    } finally {
      setSaving(null);
      setShowBulkModal(false);
      setBulkSubject(null);
      setBulkTeacher("");
    }
  }, [bulkSubject, bulkTeacher, filteredGroups, handleAssign]);

  const openBulkModal = (subjectId: string) => {
    setBulkSubject(subjectId);
    setBulkTeacher("");
    setShowBulkModal(true);
  };

  // Stats
  const totalCells = filteredGroups.length * filteredSubjects.length;
  const filledCells = filteredGroups.reduce((acc, g) => {
    return acc + filteredSubjects.filter((s) => getTeacherId(g.id, s.id) !== "").length;
  }, 0);
  const pct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  // Mobile subject for card view
  const mobileFilteredSubject = mobileSubject ? filteredSubjects.find((s) => s.id === mobileSubject) : null;

  return (
    <div className="space-y-4">
      {/* Grade chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">Grado:</span>
        <button
          onClick={() => setSelectedGrade(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selectedGrade === null
              ? "bg-slate-700 text-white border border-slate-700"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Todos
        </button>
        {availableGrades.map((g) => {
          const colors = GRADE_COLORS[g] || GRADE_COLORS[1];
          return (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedGrade === g ? colors.active : colors.chip
              }`}
            >
              {g}°
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{filteredGroups.length} grupos</span>
        <span>·</span>
        <span>{filteredSubjects.length} materias</span>
        <span>·</span>
        <span className="font-medium">{filledCells}/{totalCells} asignadas ({pct}%)</span>
        <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={soloSinMaestro}
            onChange={(e) => setSoloSinMaestro(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Solo sin maestro
        </label>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-2.5 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[80px]">
                Grupo
              </th>
              {filteredSubjects.map((s) => (
                <th key={s.id} className="text-center px-1.5 py-2.5 font-medium text-slate-600 min-w-[130px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span title={s.name}>{s.short_name || s.name}</span>
                    <button
                      onClick={() => openBulkModal(s.id)}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline font-normal"
                      title="Llenar columna"
                    >
                      Llenar ▼
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map((g) => {
              const gradeColor = g.grade === 1 ? "text-blue-600" : g.grade === 2 ? "text-emerald-600" : "text-purple-600";
              const hasEmpty = filteredSubjects.some((s) => getTeacherId(g.id, s.id) === "");
              if (soloSinMaestro && !hasEmpty) return null;
              return (
                <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className={`px-3 py-1.5 font-semibold sticky left-0 bg-white z-10 ${gradeColor}`}>
                    {g.grade}°{g.letter}
                  </td>
                  {filteredSubjects.map((s) => {
                    const tid = getTeacherId(g.id, s.id);
                    const key = `${g.id}-${s.id}`;
                    const isSaving = saving === key;
                    if (soloSinMaestro && tid !== "") return <td key={s.id} className="px-1 py-1" />;
                    return (
                      <td key={s.id} className="px-1 py-1">
                        <select
                          value={tid}
                          onChange={(e) => handleAssign(g.id, s.id, e.target.value)}
                          disabled={isSaving}
                          className={`w-full text-[11px] rounded-md border px-1.5 py-1 transition-colors ${
                            tid === ""
                              ? "border-amber-200 bg-amber-50/50 text-slate-400"
                              : "border-slate-200 bg-white text-slate-700"
                          } ${isSaving ? "opacity-50" : ""} focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300`}
                        >
                          <option value="">—</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        <select
          value={mobileSubject || ""}
          onChange={(e) => setMobileSubject(e.target.value || null)}
          className="input-field text-sm w-full"
        >
          <option value="">— Seleccionar materia —</option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.short_name || s.name}</option>
          ))}
        </select>

        {mobileFilteredSubject && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{mobileFilteredSubject.name}</h3>
              <button
                onClick={() => openBulkModal(mobileFilteredSubject.id)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Llenar todos ▼
              </button>
            </div>
            {filteredGroups.map((g) => {
              const tid = getTeacherId(g.id, mobileFilteredSubject.id);
              if (soloSinMaestro && tid !== "") return null;
              const gradeColor = g.grade === 1 ? "text-blue-600" : g.grade === 2 ? "text-emerald-600" : "text-purple-600";
              return (
                <div key={g.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
                  <span className={`font-semibold text-sm ${gradeColor} min-w-[36px]`}>{g.grade}°{g.letter}</span>
                  <select
                    value={tid}
                    onChange={(e) => handleAssign(g.id, mobileFilteredSubject.id, e.target.value)}
                    className={`flex-1 text-xs rounded-md border px-2 py-1.5 ${
                      tid === "" ? "border-amber-200 bg-amber-50/50 text-slate-400" : "border-slate-200 bg-white text-slate-700"
                    } focus:ring-1 focus:ring-indigo-300`}
                  >
                    <option value="">— Sin maestro —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk assign modal */}
      {showBulkModal && bulkSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Llenar columna</h3>
            <p className="text-xs text-slate-500">
              Asignar un maestro a <strong>{filteredSubjects.find((s) => s.id === bulkSubject)?.name}</strong> en
              {selectedGrade ? ` todos los grupos de ${selectedGrade}°` : " todos los grupos"}.
            </p>
            <select
              value={bulkTeacher}
              onChange={(e) => setBulkTeacher(e.target.value)}
              className="input-field text-sm w-full"
            >
              <option value="">— Seleccionar maestro —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkTeacher || saving === "bulk"}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {saving === "bulk" ? "Guardando…" : "Asignar a todos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
