import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import ConstanciasCliente from "@/components/ConstanciasCliente";
import type { AlumnoConst, ProfesorConst } from "@/lib/constancias";

const CICLO_ACTUAL = "2026-2027";

export default async function ConstanciasPage() {
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
  const ALLOWED = ["superadmin", "admin", "direccion", "secretaria"];
  if (!ALLOWED.includes(effectiveProfile.role)) {
    redirect("/dashboard");
  }

  // Fetch students with their enrollment info
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, curp, grade, group, list_number")
    .order("grade")
    .order("group")
    .order("list_number");

  const alumnos: AlumnoConst[] = (students ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    curp: s.curp,
    grado: s.grade,
    letra: s.group,
    ciclo: CICLO_ACTUAL,
    list_num: s.list_number,
  }));

  // Fetch teachers (profiles with role profesor)
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "profesor")
    .order("full_name");

  const profesores: ProfesorConst[] = (teachers ?? []).map((t) => ({
    id: t.id,
    full_name: t.full_name,
  }));

  return (
    <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role}>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <Link
            href="/servicios-escolares"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Servicios Escolares
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Constancias</h1>
          <p className="text-sm text-slate-500 mt-1">
            Genera constancias escolares para alumnos y profesores
          </p>
        </div>

        <ConstanciasCliente
          alumnos={alumnos}
          profesores={profesores}
          cicloActual={CICLO_ACTUAL}
        />
      </main>
    </Navbar>
  );
}
