import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import BoletaSelector from "@/components/BoletaSelector";

export default async function BoletaIndexPage() {
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

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);
  if (effectiveProfile.role === "viewer") redirect("/dashboard");

  // Para admin: todos los grupos. Para teacher: solo sus grupos asignados
  let groups: { id: string; grade: number; letter: string }[] = [];

  if (effectiveProfile.role === "admin" || effectiveProfile.role === "directora_anita") {
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
    // Extraer grupos únicos
    const seen = new Set<string>();
    (data || []).forEach((a: any) => {
      if (a.groups && !seen.has(a.groups.id)) {
        seen.add(a.groups.id);
        groups.push(a.groups);
      }
    });
    groups.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
  }

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Boleta de Calificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona el grupo y el alumno para consultar su boleta
          </p>
        </div>

        <BoletaSelector groups={groups} />
      </main>
    </div>
  );
}
