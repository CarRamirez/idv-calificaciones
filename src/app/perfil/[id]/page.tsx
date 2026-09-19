import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function PerfilPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (!myProfile) redirect("/login");

  // Fetch target profile
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email, role, label, created_at")
    .eq("id", params.id)
    .single();

  if (!profile) redirect("/dashboard");

  // Fetch role display name
  const { data: roleInfo } = await admin
    .from("roles")
    .select("display_name")
    .eq("name", profile.role)
    .single();

  const roleLabel = roleInfo?.display_name || (
    profile.role === "admin" ? "Administrador" :
    profile.role === "teacher" ? "Profesor" :
    profile.role === "viewer" ? "Consulta" : profile.role
  );

  // Fetch teacher assignments
  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select("id, subjects ( id, name, short_name ), groups ( id, grade, letter )")
    .eq("teacher_id", params.id);

  // Group assignments by group
  const byGroup: Record<string, { group: any; subjects: any[] }> = {};
  (assignments || []).forEach((a: any) => {
    const gId = a.groups.id;
    if (!byGroup[gId]) {
      byGroup[gId] = { group: a.groups, subjects: [] };
    }
    byGroup[gId].subjects.push(a.subjects);
  });

  // Student count per group
  const groupIds = Object.keys(byGroup);
  const studentCounts: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: students } = await admin
      .from("students")
      .select("id, group_id")
      .in("group_id", groupIds)
      .eq("is_active", true);
    (students || []).forEach((s: any) => {
      studentCounts[s.group_id] = (studentCounts[s.group_id] || 0) + 1;
    });
  }

  const GRADE_COLORS: Record<number, { header: string; border: string; badge: string }> = {
    1: { header: "bg-blue-600", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
    2: { header: "bg-emerald-600", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
    3: { header: "bg-purple-600", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  };

  const createdAt = new Date(profile.created_at).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={myProfile.full_name} userRole={myProfile.role} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Regresar
        </Link>

        {/* Profile card */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {profile.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900">{profile.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  profile.role === "admin" ? "bg-purple-100 text-purple-700" :
                  profile.role === "teacher" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {roleLabel}
                </span>
                {profile.label && (
                  <span className="text-xs text-gray-400">{profile.label}</span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {profile.email}
                </p>
                <p className="text-xs text-gray-400">Registrado el {createdAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments */}
        {Object.keys(byGroup).length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Asignaturas asignadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(byGroup)
                .sort(([, a], [, b]) =>
                  a.group.grade - b.group.grade || a.group.letter.localeCompare(b.group.letter)
                )
                .map(([gId, { group, subjects }]) => {
                  const count = studentCounts[gId] || 0;
                  const colors = GRADE_COLORS[group.grade as number] || GRADE_COLORS[1];
                  return (
                    <div key={gId} className={`card overflow-hidden border ${colors.border}`}>
                      <div className={`${colors.header} px-4 py-2.5 flex items-center justify-between`}>
                        <p className="text-base font-bold text-white">
                          {group.grade}&#176; {group.letter}
                        </p>
                        <p className="text-xs text-white/70">{count} alumnos</p>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        {subjects.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{s.name}</span>
                            <span className="text-xs text-gray-400 font-mono">{s.short_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400 text-sm">
            Este usuario no tiene asignaturas asignadas.
          </div>
        )}
      </main>
    </div>
  );
}
