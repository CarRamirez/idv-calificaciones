import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function ConcentradoIndexPage() {
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

  // Cargar grupos disponibles
  const ADMIN_ROLES = ["admin", "directora_anita"];
  let groups: { id: string; grade: number; letter: string }[] = [];

  if (ADMIN_ROLES.includes(effectiveProfile.role)) {
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter")
      .order("grade")
      .order("letter");
    groups = data || [];
  } else if (effectiveProfile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_assignments")
      .select("groups ( id, grade, letter )")
      .eq("teacher_id", user.id);
    const seen = new Set<string>();
    (data || []).forEach((a: any) => {
      if (a.groups && !seen.has(a.groups.id)) {
        seen.add(a.groups.id);
        groups.push(a.groups);
      }
    });
    groups.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
  } else if (effectiveProfile.role === "viewer") {
    // Viewer: access via dashboard concentrado links
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter")
      .order("grade")
      .order("letter");
    groups = data || [];
  } else {
    redirect("/dashboard");
  }

  // Agrupar por grado
  const byGrade: Record<number, typeof groups> = {};
  groups.forEach((g) => {
    if (!byGrade[g.grade]) byGrade[g.grade] = [];
    byGrade[g.grade].push(g);
  });

  const GRADE_COLORS: Record<number, { bg: string; border: string; text: string; hover: string }> = {
    1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", hover: "hover:bg-blue-100 hover:border-blue-300" },
    2: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", hover: "hover:bg-emerald-100 hover:border-emerald-300" },
    3: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", hover: "hover:bg-violet-100 hover:border-violet-300" },
  };

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />
      <main className="page-content max-w-3xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            Concentrado de Calificaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona el grupo para consultar el concentrado
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">No hay grupos disponibles.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byGrade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, grps]) => {
                const colors = GRADE_COLORS[Number(grade)] || GRADE_COLORS[1];
                return (
                  <div key={grade}>
                    <h2 className={`text-xs font-bold uppercase tracking-widest ${colors.text} mb-3`}>
                      {grade}° Grado
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {grps.map((g) => (
                        <Link
                          key={g.id}
                          href={`/concentrado/${g.id}`}
                          className={`${colors.bg} border ${colors.border} ${colors.hover} rounded-xl p-4 text-center transition-all group block`}
                        >
                          <p className={`text-2xl font-extrabold ${colors.text}`} style={{ fontFamily: "var(--font-display)" }}>
                            {g.grade}° {g.letter}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}
