"use client";

import { formatStudentName } from "@/lib/format-name";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Group = { id: string; grade: number; letter: string };
type Student = { id: string; full_name: string; list_num: number };

type Props = {
  groups: Group[];
};

const GRADE_COLORS: Record<number, { chip: string; active: string }> = {
  1: { chip: "bg-blue-100 text-blue-700 hover:bg-blue-200", active: "bg-blue-600 text-white shadow-sm" },
  2: { chip: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", active: "bg-emerald-600 text-white shadow-sm" },
  3: { chip: "bg-purple-100 text-purple-700 hover:bg-purple-200", active: "bg-purple-600 text-white shadow-sm" },
};

export default function BoletaSelector({ groups }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Available grades
  const grades = Array.from(new Set(groups.map((g) => g.grade))).sort();

  // Groups for selected grade
  const gradeGroups = selectedGrade
    ? groups.filter((g) => g.grade === selectedGrade).sort((a, b) => a.letter.localeCompare(b.letter))
    : [];

  // Auto-select grade if only one
  useEffect(() => {
    if (grades.length === 1 && !selectedGrade) {
      setSelectedGrade(grades[0]);
    }
  }, [grades, selectedGrade]);

  // Load students when group changes
  useEffect(() => {
    if (!selectedGroup) {
      setStudents([]);
      setSelectedStudent("");
      return;
    }
    setLoading(true);
    setSelectedStudent("");
    supabase
      .from("students")
      .select("id, full_name, list_num")
      .eq("group_id", selectedGroup)
      .eq("status", "activo")
      .order("full_name")
      .then(({ data }) => {
        setStudents(data || []);
        setLoading(false);
      });
  }, [selectedGroup, supabase]);

  const handleGradeSelect = (grade: number) => {
    setSelectedGrade(grade);
    setSelectedGroup("");
    setStudents([]);
    setSelectedStudent("");
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedStudent("");
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    if (studentId) {
      router.push(`/boleta/${studentId}`);
    }
  };

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      {/* ── Grado chips ── */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Grado
        </label>
        <div className="flex flex-wrap gap-2">
          {grades.map((grade) => {
            const isActive = selectedGrade === grade;
            const colors = GRADE_COLORS[grade] || GRADE_COLORS[1];
            return (
              <button
                key={grade}
                onClick={() => handleGradeSelect(grade)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  isActive ? colors.active : colors.chip
                }`}
              >
                {grade}° Grado
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grupo chips ── */}
      {selectedGrade && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Grupo
          </label>
          <div className="flex flex-wrap gap-2">
            {gradeGroups.map((g) => {
              const isActive = selectedGroup === g.id;
              const colors = GRADE_COLORS[g.grade] || GRADE_COLORS[1];
              return (
                <button
                  key={g.id}
                  onClick={() => handleGroupSelect(g.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    isActive ? colors.active : colors.chip
                  }`}
                >
                  {g.grade}° {g.letter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Student dropdown ── */}
      {selectedGroup && (
        <div>
          <label htmlFor="boleta-student" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Alumno
          </label>
          {loading ? (
            <div className="text-sm text-slate-400 py-2">Cargando alumnos...</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-slate-400 py-2">No hay alumnos en este grupo</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <select
                id="boleta-student"
                value={selectedStudent}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="input-field text-sm py-2 pr-8 w-full sm:max-w-md"
              >
                <option value="">— Seleccionar alumno —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.list_num}. {formatStudentName(s.full_name)}
                  </option>
                ))}
              </select>

              {/* Grupo completo button */}
              <Link
                href={`/boleta/grupo/${selectedGroup}`}
                className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Grupo completo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
