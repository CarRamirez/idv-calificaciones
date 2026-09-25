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

export default function BoletaSelector({ groups }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedGroup) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setSearch("");
    supabase
      .from("students")
      .select("id, full_name, list_num")
      .eq("group_id", selectedGroup)
      .eq("is_active", true)
      .order("list_num")
      .then(({ data }) => {
        setStudents(data || []);
        setLoading(false);
      });
  }, [selectedGroup, supabase]);

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar grupos por grado
  const byGrade: Record<number, Group[]> = {};
  groups.forEach((g) => {
    if (!byGrade[g.grade]) byGrade[g.grade] = [];
    byGrade[g.grade].push(g);
  });

  return (
    <div className="space-y-6">
      {/* Selector de grupo */}
      <div className="card p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          1. Selecciona el grupo
        </label>
        <div className="space-y-3">
          {Object.entries(byGrade)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([grade, grps]) => (
              <div key={grade}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                  {grade}° Grado
                </p>
                <div className="flex flex-wrap gap-2">
                  {grps.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroup(g.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedGroup === g.id
                          ? "bg-primary-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {g.grade}° {g.letter}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Lista de alumnos */}
      {selectedGroup && (
        <div className="card p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            2. Selecciona el alumno
          </label>

          {/* Buscador */}
          <div className="relative mb-4">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar alumno por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Imprimir todas las boletas del grupo */}
          <div className="flex justify-end mb-3">
            <Link
              href={`/boleta/grupo/${selectedGroup}`}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir todas las boletas
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Cargando alumnos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? "No se encontraron alumnos" : "No hay alumnos en este grupo"}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/boleta/${s.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary-50 rounded-lg transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold tabular-nums">
                      {s.list_num}
                    </span>
                    <span className="text-sm font-medium text-gray-900 group-hover:text-primary-700">
                      {formatStudentName(s.full_name)}
                    </span>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-primary-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
