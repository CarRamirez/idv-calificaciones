export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import PeriodosCliente from "./PeriodosCliente";

export default async function PeriodosPage() {
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
  if (effectiveProfile.role !== "admin" && effectiveProfile.role !== "direccion") {
    redirect("/dashboard");
  }

  /* ── School year ── */
  const { data: schoolYear } = await supabase
    .from("school_years")
    .select("id, name")
    .eq("is_current", true)
    .single();

  /* ── Evaluation periods ── */
  const { data: periodsRaw } = await supabase
    .from("evaluation_periods")
    .select("id, period_number, name, trimester, is_open, open_date, close_date")
    .eq("school_year_id", schoolYear?.id ?? "")
    .order("period_number");

  const periods = (periodsRaw || []) as {
    id: string;
    period_number: number;
    name: string;
    trimester: number;
    is_open: boolean;
    open_date: string | null;
    close_date: string | null;
  }[];

  /* ── Grade counts per period (to know if data exists) ── */
  const conteos = await Promise.all(
    periods.map((p) =>
      supabase
        .from("grades")
        .select("id", { count: "exact", head: true })
        .eq("period", p.period_number)
        .not("score", "is", null)
    )
  );
  const capturadas: Record<string, number> = {};
  periods.forEach((p, i) => {
    capturadas[p.id] = conteos[i].count ?? 0;
  });

  /* ── Compute effective state ── */
  const now = new Date();
  const enrichedPeriods = periods.map((p) => {
    let estado: "abierto" | "programado" | "vencido" | "cerrado" = "cerrado";
    if (p.is_open) {
      const afterOpen = !p.open_date || now >= new Date(p.open_date);
      const beforeClose = !p.close_date || now <= new Date(p.close_date);
      if (!afterOpen) estado = "programado";
      else if (!beforeClose) estado = "vencido";
      else estado = "abierto";
    }
    return { ...p, estado };
  });

  return (
    <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role}>
      <main className="page-content space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Periodos de evaluación
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ciclo escolar {schoolYear?.name ?? "—"} · Abre cada periodo y define
            sus fechas de captura.
          </p>
        </div>

        {schoolYear ? (
          <PeriodosCliente
            periods={enrichedPeriods}
            capturadas={capturadas}
          />
        ) : (
          <div className="card border-dashed p-10 text-center text-slate-400">
            No hay un ciclo escolar activo.
          </div>
        )}
      </main>
    </Navbar>
  );
}
