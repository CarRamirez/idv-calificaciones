import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function ServiciosEscolaresPage() {
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

  const colorMap: Record<string, { bg: string; border: string; iconBg: string; iconText: string }> = {
    primary: { bg: "bg-primary-50/60", border: "border-primary-200", iconBg: "bg-primary-100", iconText: "text-primary-600" },
    accent:  { bg: "bg-blue-50/60",    border: "border-blue-200",    iconBg: "bg-blue-100",    iconText: "text-blue-600" },
    success: { bg: "bg-emerald-50/60",  border: "border-emerald-200",  iconBg: "bg-emerald-100",  iconText: "text-emerald-600" },
    amber:   { bg: "bg-amber-50/60",    border: "border-amber-200",    iconBg: "bg-amber-100",    iconText: "text-amber-600" },
    purple:  { bg: "bg-purple-50/60",   border: "border-purple-200",   iconBg: "bg-purple-100",   iconText: "text-purple-600" },
    rose:    { bg: "bg-rose-50/60",      border: "border-rose-200",     iconBg: "bg-rose-100",     iconText: "text-rose-600" },
  };

  const options = [
    {
      title: "Constancia Genérica",
      description: "Constancia de estudios básica para cualquier trámite.",
      href: "/servicios-escolares/constancias",
      color: "primary",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      title: "Con Promedio",
      description: "Incluye el promedio general mensual, trimestral o acumulado.",
      href: "/servicios-escolares/constancias",
      color: "accent",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      title: "Ciclos Anteriores",
      description: "Constancia que abarca un rango de ciclos escolares.",
      href: "/servicios-escolares/constancias",
      color: "purple",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Con Foto",
      description: "Constancia de estudios con fotografía del alumno.",
      href: "/servicios-escolares/constancias",
      color: "success",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
    },
    {
      title: "Vacaciones",
      description: "Constancia de período vacacional del alumno.",
      href: "/servicios-escolares/constancias",
      color: "amber",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
    },
    {
      title: "Asistencia CTE",
      description: "Constancia de asistencia al Consejo Técnico Escolar.",
      href: "/servicios-escolares/constancias",
      color: "rose",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ];

  return (
    <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Regresar al Dashboard
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Servicios Escolares</h1>
          <p className="text-sm text-slate-500 mt-1">Generación de constancias y documentos oficiales</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {options.map((opt) => {
            const c = colorMap[opt.color];
            return (
              <Link
                key={opt.title}
                href={opt.href}
                className={`${c.bg} border-2 ${c.border} rounded-xl p-5 transition-all hover:shadow-md hover:scale-[1.02] group`}
              >
                <div className={`w-12 h-12 rounded-xl ${c.iconBg} ${c.iconText} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  {opt.icon}
                </div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">{opt.title}</h2>
                <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </Navbar>
  );
}
