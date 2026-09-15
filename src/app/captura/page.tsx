import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

/* Mapa de iconos por materia (short_name) */
const SUBJECT_ICONS: Record<string, string> = {
  MAT: "📐", ESP: "📖", ING: "🌐", CIEN: "🔬", HIS: "📜",
  GEO: "🌍", FIS: "⚡", QUI: "🧪", BIO: "🧬", ART: "🎨",
  MUS: "🎵", EFI: "🏃", TEC: "💻", FCE: "⚖️", EDU: "📚",
  SOC: "👥", FIL: "💭", CLUB: "🎯", TUT: "🤝", VSAL: "🌱",
  ORT: "✏️", SMEN: "🧠", VAL: "💎",
};

function getIcon(shortName: string): string {
  if (!shortName) return "📋";
  const key = shortName.toUpperCase().replace(/[^A-Z]/g, "");
  return SUBJECT_ICONS[key] || "📋";
}

/* Color sutil de acento por grupo (grado) */
const GRADE_ACCENTS: Record<number, { ring: string; badge: string; text: string }> = {
  1: { ring: "ring-blue-200/60", badge: "bg-blue-500/10 text-blue-700", text: "text-blue-700" },
  2: { ring: "ring-emerald-200/60", badge: "bg-emerald-500/10 text-emerald-700", text: "text-emerald-700" },
  3: { ring: "ring-violet-200/60", badge: "bg-violet-500/10 text-violet-700", text: "text-violet-700" },
};

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
      .select("id, subjects ( id, name, short_name, sort_order, counts_for_avg ), groups ( id, grade, letter )")
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
      .select("id, name, short_name, grade, sort_order, counts_for_avg")
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

  const byGroup: Record<string, { group: any; curricular: any[]; noCurricular: any[] }> = {};
  assignments.forEach((a) => {
    const key = `${a.groups.grade}${a.groups.letter}`;
    if (!byGroup[key]) {
      byGroup[key] = { group: a.groups, curricular: [], noCurricular: [] };
    }
    if (a.subjects.counts_for_avg === false) {
      byGroup[key].noCurricular.push(a);
    } else {
      byGroup[key].curricular.push(a);
    }
  });

  Object.values(byGroup).forEach((g) => {
    g.curricular.sort((a: any, b: any) => (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0));
    g.noCurricular.sort((a: any, b: any) => (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0));
  });

  const totalGroups = Object.keys(byGroup).length;
  const totalSubjects = assignments.length;

  return (
    <div className="bg-mesh">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header con stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Captura de Calificaciones
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Selecciona el grupo y la asignatura para comenzar
          </p>
          <div className="flex gap-3">
            <div className="glass-subtle rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-lg">📂</span>
              <div>
                <p className="text-xs text-gray-500">Grupos</p>
                <p className="text-sm font-bold text-gray-800">{totalGroups}</p>
              </div>
            </div>
            <div className="glass-subtle rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <p className="text-xs text-gray-500">Asignaturas</p>
                <p className="text-sm font-bold text-gray-800">{totalSubjects}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de grupos */}
        <div className="space-y-8">
          {Object.entries(byGroup)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, { group, curricular, noCurricular }]) => {
              const accent = GRADE_ACCENTS[group.grade] || GRADE_ACCENTS[1];
              return (
                <div key={key}>
                  {/* Encabezado de grupo */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${accent.badge}`}>
                      {group.grade}° {group.letter}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200/60 to-transparent" />
                  </div>

                  {/* Cards de materias curriculares */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {curricular.map((a: any) => (
                      <Link
                        key={a.id}
                        href={`/captura/${a.groups.id}/${a.subjects.id}`}
                        className={`group relative card hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ring-1 ${accent.ring} overflow-hidden`}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary-100/30 to-transparent -translate-y-8 translate-x-8" />
                        <div className="flex items-center gap-3 relative">
                          <div className="w-10 h-10 rounded-xl bg-white/60 border border-white/40 shadow-sm flex items-center justify-center text-lg flex-shrink-0">
                            {getIcon(a.subjects.short_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700 transition-colors truncate">
                              {a.subjects.name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {a.subjects.short_name}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Materias no curriculares */}
                  {noCurricular.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 ml-1">
                        No curriculares — no abonan al promedio
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {noCurricular.map((a: any) => (
                          <Link
                            key={a.id}
                            href={`/captura/${a.groups.id}/${a.subjects.id}`}
                            className="group glass-subtle rounded-xl px-3 py-2.5 hover:bg-white/60 transition-all flex items-center gap-2 ring-1 ring-gray-200/40"
                          >
                            <span className="text-base flex-shrink-0">
                              {getIcon(a.subjects.short_name)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors truncate">
                                {a.subjects.name}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {assignments.length === 0 && (
          <div className="card p-12 text-center">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-500 text-sm">
              No tienes asignaturas asignadas aún.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
