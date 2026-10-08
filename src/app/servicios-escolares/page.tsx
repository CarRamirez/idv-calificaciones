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
  const ADMIN_ROLES = ["admin", "directora_anita"];
  if (!ADMIN_ROLES.includes(effectiveProfile.role)) {
    redirect("/dashboard");
  }

  const options = [
    {
      title: "Constancia Escolar",
      description: "Genera una constancia de estudios para el alumno seleccionado.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      color: "primary",
    },
    {
      title: "Constancia Escolar con Promedio",
      description: "Genera una constancia de estudios que incluye el promedio general del alumno.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
      color: "accent",
    },
    {
      title: "Constancia para Pasaporte",
      description: "Genera una constancia escolar con los datos requeridos para trámite de pasaporte.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
      color: "success",
    },
    {
      title: "Constancia de Asistencia CTE",
      description: "Genera una constancia de asistencia para el Consejo Técnico Escolar.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
      color: "indigo",
    },
  ];

  const colorMap: Record<string, { bg: string; iconBg: string; iconText: string; border: string; hover: string }> = {
    primary: {
      bg: "bg-white",
      iconBg: "bg-primary-100",
      iconText: "text-primary-600",
      border: "border-primary-100",
      hover: "hover:border-primary-300 hover:shadow-md",
    },
    accent: {
      bg: "bg-white",
      iconBg: "bg-accent-100",
      iconText: "text-accent-600",
      border: "border-accent-100",
      hover: "hover:border-accent-300 hover:shadow-md",
    },
    success: {
      bg: "bg-white",
      iconBg: "bg-green-100",
      iconText: "text-green-600",
      border: "border-green-100",
      hover: "hover:border-green-300 hover:shadow-md",
    },
    indigo: {
      bg: "bg-white",
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-600",
      border: "border-indigo-100",
      hover: "hover:border-indigo-300 hover:shadow-md",
    },
  };

  return (
    <div className="page-container">
      <Navbar userName={effectiveProfile.full_name} userRole={effectiveProfile.role} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Regresar al Dashboard
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Servicios Escolares</h1>
          <p className="text-sm text-gray-500 mt-1">Generación de constancias y documentos oficiales</p>
        </div>

        {/* Banner de en construcción */}
        <div className="mb-8 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.6-4.66a.75.75 0 01.04-1.16l.97-.65a.75.75 0 011 .13l3.25 3.97 7.5-10.5a.75.75 0 011.08-.13l.88.7a.75.75 0 01.13 1.08l-8.75 12.25a.75.75 0 01-1.1.13zM11.42 15.17L6.75 21M17.25 3L12 10.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Módulo en construcción</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Este módulo está en desarrollo. Próximamente podrás generar constancias directamente desde aquí.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {options.map((opt) => {
            const c = colorMap[opt.color];
            return (
              <div
                key={opt.title}
                className={`${c.bg} border-2 ${c.border} rounded-xl p-6 transition-all opacity-60 cursor-not-allowed relative`}
              >
                {/* Badge en construcción */}
                <span className="absolute top-3 right-3 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Próximamente
                </span>

                <div className={`w-14 h-14 rounded-xl ${c.iconBg} ${c.iconText} flex items-center justify-center mb-4`}>
                  {opt.icon}
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">{opt.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{opt.description}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
