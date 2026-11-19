import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import AsignarCliente from "./AsignarCliente";

export const dynamic = "force-dynamic";

export default async function AsignarPage() {
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

  // Only admin/directora can assign
  const canAssign = ["admin", "directora_anita"].includes(effectiveProfile.role);
  if (!canAssign) redirect("/dashboard");

  const admin = createAdminClient();

  // Fetch groups, subjects, teachers, and existing assignments in parallel
  const [groupsRes, subjectsRes, teachersRes, assignmentsRes] = await Promise.all([
    admin.from("groups").select("id, grade, letter").neq("letter", "Bajas").order("grade").order("letter"),
    admin.from("subjects").select("id, name, short_name, grade, sort_order, counts_for_avg").order("sort_order").order("name"),
    admin.from("profiles").select("id, full_name").eq("role", "teacher").order("full_name"),
    admin.from("teacher_assignments").select("id, teacher_id, group_id, subject_id"),
  ]);

  const groups = (groupsRes.data || []).map((g) => ({
    id: g.id,
    grade: g.grade as number,
    letter: g.letter as string,
  }));

  const subjects = (subjectsRes.data || []).map((s) => ({
    id: s.id,
    name: s.name as string,
    short_name: s.short_name as string,
    grade: s.grade as number,
    sort_order: s.sort_order as number,
    counts_for_avg: s.counts_for_avg as boolean,
  }));

  const teachers = (teachersRes.data || []).map((t) => ({
    id: t.id as string,
    full_name: t.full_name as string,
  }));

  const assignments = (assignmentsRes.data || []).map((a) => ({
    id: a.id as string,
    teacher_id: a.teacher_id as string,
    group_id: a.group_id as string,
    subject_id: a.subject_id as string,
  }));

  return (
    <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role}>
      <main className="page-content animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Asignar</h1>
              <p className="text-sm text-slate-400">El maestro de cada materia en cada grupo · se guarda al elegirlo</p>
            </div>
          </div>
        </div>

        <AsignarCliente
          groups={groups}
          subjects={subjects}
          teachers={teachers}
          assignments={assignments}
        />
      </main>
    </Navbar>
  );
}
