import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import ListaAlumnos from "@/components/ListaAlumnos";

type Props = {
  params: { groupId: string };
};

export default async function ListaPage({ params }: Props) {
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

  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", params.groupId)
    .single();

  if (!group) redirect("/dashboard");

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num, curp")
    .eq("group_id", params.groupId)
    .eq("is_active", true)
    .order("list_num");

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />

      <main className="page-content animate-fade-in">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Lista de Alumnos — {group.grade}° {group.letter}
            </h1>
            <p className="text-sm text-gray-500">
              {(students || []).length} alumno{(students || []).length !== 1 ? "s" : ""} activos
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Volver
          </Link>
        </div>

        <ListaAlumnos
          students={(students || []).map((s) => ({
            id: s.id,
            full_name: s.full_name,
            list_num: s.list_num,
          }))}
          groupName={`${group.grade}° ${group.letter}`}
        />
      </main>
    </div>
  );
}
