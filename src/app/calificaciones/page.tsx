import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
    redirect("/dashboard");
  }

  const isTeacher = profile.role === "teacher";

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
      roles: ["admin", "teacher"],
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
      roles: ["admin", "teacher"],
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
  ];

  const visibleOptions = options.filter((opt) => opt.roles.includes(profile.role));

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
    warning: {
      bg: "bg-white",
      iconBg: "bg-yellow-100",
      iconText: "text-yellow-600",
      border: "border-yellow-100",
      hover: "hover:border-yellow-300 hover:shadow-md",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />
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
