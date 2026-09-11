import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function UsuariosPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const options = [
    {
      title: "Alumnos",
      description: "Gestiona el registro de alumnos por grupo: alta, baja y edición de datos.",
      href: "/admin/alumnos",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      color: "primary",
    },
    {
      title: "Profesores",
      description: "Crea cuentas de profesor, asigna materias y grupos para la captura de calificaciones.",
      href: "/admin/profesores",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      ),
      color: "accent",
    },
    {
      title: "Sesiones",
      description: "Revisa el historial de inicios de sesión, direcciones IP y ubicaciones de conexión.",
      href: "/admin/sesiones",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      color: "emerald",
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
    emerald: {
      bg: "bg-white",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      border: "border-emerald-100",
      hover: "hover:border-emerald-300 hover:shadow-md",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los usuarios del sistema</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {options.map((opt) => {
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
