import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function DashboardPage() {
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

  let assignments: any[] = [];
  if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_assignments")
      .select("id, subjects ( id, name, short_name ), groups ( id, grade, letter )")
      .eq("teacher_id", user.id);
    assignments = data || [];
  }

  let groups: any[] = [];
  if (profile.role === "admin" || profile.role === "viewer") {
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter, school_years ( name )")
      .order("grade")
      .order("letter");
    groups = data || [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">
          Bienvenido, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Ciclo escolar 2026-2027
        </p>

        {profile.role === "teacher" && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Mis asignaturas
            </h2>
            {assignments.length === 0 ? (
              <div className="card p-8 text-center text-gray-500 text-sm">
                No tienes asignaturas asignadas. Contacta al administrador.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignments.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/captura/${a.groups.id}/${a.subjects.id}`}
                    className="card p-4 hover:border-primary-300 hover:shadow-md transition-all group"
                  >
                    <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {a.subjects.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {a.groups.grade}° {a.groups.letter}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {(profile.role === "admin" || profile.role === "viewer") && (
          <div className="space-y-6">
            {profile.role === "admin" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/admin/alumnos" className="card p-4 text-center hover:border-primary-300 transition-all">
                  <p className="text-2xl mb-1">👥</p>
                  <p className="text-sm font-medium text-gray-700">Alumnos</p>
                </Link>
                <Link href="/admin/profesores" className="card p-4 text-center hover:border-primary-300 transition-all">
                  <p className="text-2xl mb-1">👨‍🏫</p>
                  <p className="text-sm font-medium text-gray-700">Profesores</p>
                </Link>
                <Link href="/admin/ciclo" className="card p-4 text-center hover:border-primary-300 transition-all">
                  <p className="text-2xl mb-1">📅</p>
                  <p className="text-sm font-medium text-gray-700">Ciclo Escolar</p>
                </Link>
                <Link href="/captura" className="card p-4 text-center hover:border-primary-300 transition-all">
                  <p className="text-2xl mb-1">✏️</p>
                  <p className="text-sm font-medium text-gray-700">Captura</p>
                </Link>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Concentrado por grupo
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {groups.map((g: any) => (
                  <Link
                    key={g.id}
                    href={`/concentrado/${g.id}`}
                    className="card p-3 text-center hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <p className="text-lg font-bold text-primary-600">
                      {g.grade}° {g.letter}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
