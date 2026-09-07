import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function CapturaIndexPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "viewer") redirect("/dashboard");

  let assignments: any[] = [];

  if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_assignments")
      .select("id, subjects ( id, name, short_name, sort_order ), groups ( id, grade, letter )")
      .eq("teacher_id", user.id);
    assignments = data || [];
  } else if (profile.role === "admin") {
    const { data: groups } = await supabase
      .from("groups")
      .select("id, grade, letter")
      .order("grade")
      .order("letter");

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, short_name, grade, sort_order")
      .order("sort_order");

    assignments = (groups || []).flatMap((g) =>
      (subjects || [])
        .filter((s) => s.grade === g.grade)
        .map((s) => ({
          id: `${g.id}-${s.id}`,
          subjects: s,
          groups: g,
        }))
    );
  }

  const byGroup: Record<string, { group: any; items: any[] }> = {};
  assignments.forEach((a) => {
    const key = `${a.groups.grade}${a.groups.letter}`;
    if (!byGroup[key]) {
      byGroup[key] = { group: a.groups, items: [] };
    }
    byGroup[key].items.push(a);
  });

  Object.values(byGroup).forEach((g) => {
    g.items.sort((a: any, b: any) =>
      (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">
          Captura de Calificaciones
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Selecciona el grupo y la asignatura
        </p>

        {Object.entries(byGroup)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, { group, items }]) => (
            <div key={key} className="mb-6">
              <h2 className="text-sm font-semibold text-primary-600 uppercase tracking-wide mb-2">
                {group.grade}° {group.letter}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/captura/${a.groups.id}/${a.subjects.id}`}
                    className="card px-4 py-3 hover:border-primary-300 hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                        {a.subjects.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                      {a.subjects.short_name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

        {assignments.length === 0 && (
          <div className="card p-8 text-center text-gray-500 text-sm">
            No tienes asignaturas asignadas aún.
          </div>
        )}
      </main>
    </div>
  );
}
