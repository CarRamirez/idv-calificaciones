export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import BoletaSelector from "@/components/BoletaSelector";

export default async function BoletaIndexPage() {
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
  if (false) redirect("/dashboard") // profesor y visor pueden ver boletas;

  let groups: { id: string; grade: number; letter: string }[] = [];

  if (["superadmin", "admin"].includes(effectiveProfile.role) || effectiveProfile.role === "direccion") {
    const { data } = await supabase
      .from("groups")
      .select("id, grade, letter")
      .neq("letter", "Bajas")
      .order("grade")
      .order("letter");
    groups = data || [];
  } else if (effectiveProfile.role === "profesor") {
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
  }

  return (
    <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role}>
      <main className="page-content space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Boletas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Elige grado y grupo; luego el alumno para consultar su boleta.
          </p>
        </div>

        <BoletaSelector groups={groups} />
      </main>
    </Navbar>
  );
}
