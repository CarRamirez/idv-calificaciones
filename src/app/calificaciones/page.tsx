import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveProfile } from "@/lib/impersonation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function CalificacionesPage() {
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
  if (!ADMIN_ROLES.includes(effectiveProfile.role) && effectiveProfile.role !== "teacher") {
    redirect("/dashboard");
  }

  const isAdmin = ADMIN_ROLES.includes(effectiveProfile.role);
  const isTeacher = effectiveProfile.role === "teacher";

  const options = [
    {
      title: "Captura de Calificaciones",
      description: isTeacher
        ? "Registra calificaciones de tus grupos y materias asignadas."
        : "Registra y edita calificaciones por grupo y materia para cada trimestre.",
      href: "/captura",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: "primary",
      roles: ["admin", "directora_anita", "teacher"],
    },
    {
      title: "Concentrado de Calificaciones",
      description: isTeacher
        ? "Consulta el resumen de calificaciones de tus grupos asignados."
        : "Consulta el resumen de calificaciones por grupo con promedios trimestrales y finales.",
      href: "/dashboard",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "accent",
      roles: ["admin", "directora_anita", "teacher"],
    },
    {
      title: "Boleta de Calificaciones",
      description: isTeacher
        ? "Consulta la boleta individual de los alumnos de tus grupos."
        : "Consulta y descarga la boleta individual de cualquier alumno.",
      href: "/boleta",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "success",
      roles: ["admin", "directora_anita", "teacher"],
    },
    {
      title: "Corrección de Calificaciones",
      description: "Solicita correcciones de calificaciones ya registradas cuando el periodo ha cerrado.",
      href: "/calificaciones/correccion",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "warning",
      roles: ["teacher"],
    },
    {
      title: "Materias",
      description: "Administra el cat\u00e1logo de materias: nombre, abreviatura, grado, orden y si abona al promedio.",
      href: "/admin/materias",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: "indigo",
      roles: ["admin", "directora_anita"],
    },
    {
      title: "Tareas",
      description: "Envía notificaciones de tareas del día a los padres de familia por correo electrónico.",
      href: "/tareas",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      color: "rose",
      roles: ["admin"],
    },
  ];

  const visibleOptions = options.filter((opt) => opt.roles.includes(effectiveProfile.role));

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
    warning: {
      bg: "bg-white",
      iconBg: "bg-yellow-100",
      iconText: "text-yellow-600",
      border: "border-yellow-100",
      hover: "hover:border-yellow-300 hover:shadow-md",
    },
    rose: {
      bg: "bg-white",
      iconBg: "bg-rose-100",
      iconText: "text-rose-600",
      border: "border-rose-100",
      hover: "hover:border-rose-300 hover:shadow-md",
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Calificaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona la sección que deseas consultar</p>
        </div>

        <div className={`grid grid-cols-1 ${visibleOptions.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-6`}>
          {visibleOptions.map((opt) => {
            const c = colorMap[opt.color];
            return (
              <Link
                key={opt.href}
                href={opt.href}
                className={`${c.bg} border-2 ${c.border} ${c.hover} rounded-xl p-6 transition-all group block`}
              >
                <div className={`w-14 h-14 rounded-xl ${c.iconBg} ${c.iconText} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  {opt.icon}
                </div>
                <h2 className="text-base font-bold text-gray-900 mb-1">{opt.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed">{opt.description}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
