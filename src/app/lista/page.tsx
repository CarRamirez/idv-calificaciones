export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function ListaGruposPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);
  if (!["superadmin", "admin", "direccion"].includes(effectiveProfile.role)) {
    redirect("/dashboard");
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .neq("letter", "Bajas")
    .order("grade")
    .order("letter");

  // Count students per group
  const { data: studentCounts } = await supabase
    .from("students")
    .select("group_id")
    .eq("status", "activo");

  const countMap: Record<string, number> = {};
  (studentCounts || []).forEach((s) => {
    countMap[s.group_id] = (countMap[s.group_id] || 0) + 1;
  });

  const safeGroups = (groups || []).map((g) => ({
    id: g.id,
    grade: g.grade,
    letter: g.letter,
    count: countMap[g.id] || 0,
  }));

  // Group by grade
  const byGrade: Record<number, typeof safeGroups> = {};
  safeGroups.forEach((g) => {
    if (!byGrade[g.grade]) byGrade[g.grade] = [];
    byGrade[g.grade].push(g);
  });

  const gradeLabel = (g: number) =>
    g === 1 ? "1° Grado" : g === 2 ? "2° Grado" : g === 3 ? "3° Grado" : `${g}° Grado`;

  return (
    <Navbar userName={effectiveProfile.full_name || ""} userRole={effectiveProfile.role}>
      <div className="page-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grupos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Selecciona un grupo para ver la lista de alumnos
          </p>
        </div>

        {Object.keys(byGrade)
          .sort((a, b) => Number(a) - Number(b))
          .map((grade) => (
            <div key={grade} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {gradeLabel(Number(grade))}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {byGrade[Number(grade)].map((g) => (
                  <Link
                    key={g.id}
                    href={`/lista/${g.id}`}
                    className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {g.grade}° {g.letter}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {g.count} alumnos
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

        {safeGroups.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No hay grupos registrados
          </div>
        )}
      </div>
    </Navbar>
  );
}
