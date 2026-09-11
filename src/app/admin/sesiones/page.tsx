import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type LoginLog = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  ip_address: string;
  user_agent: string;
  city: string | null;
  region: string | null;
  country: string | null;
  logged_in_at: string;
};

type UserStats = {
  email: string;
  role: string;
  total_logins: number;
  last_login: string;
  last_ip: string;
  last_location: string;
};

export default async function SesionesPage() {
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

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  // Obtener los últimos 100 logs
  const { data: logs } = await supabase
    .from("login_logs")
    .select("*")
    .order("logged_in_at", { ascending: false })
    .limit(100);

  const allLogs: LoginLog[] = logs || [];

  // Calcular estadísticas por usuario
  const statsMap: Record<string, UserStats> = {};
  allLogs.forEach((log) => {
    if (!statsMap[log.email]) {
      const locationParts = [log.city, log.region, log.country].filter(Boolean);
      statsMap[log.email] = {
        email: log.email,
        role: log.role,
        total_logins: 0,
        last_login: log.logged_in_at,
        last_ip: log.ip_address,
        last_location: locationParts.length > 0 ? locationParts.join(", ") : "—",
      };
    }
    statsMap[log.email].total_logins++;
  });

  const userStats = Object.values(statsMap).sort(
    (a, b) => new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
  );

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRoleBadge(role: string): string {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "teacher":
        return "bg-blue-100 text-blue-700";
      case "viewer":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-500";
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case "admin":
        return "Admin";
      case "teacher":
        return "Profesor";
      case "viewer":
        return "Consulta";
      default:
        return role;
    }
  }

  function parseDevice(ua: string): string {
    if (/iPhone|iPad/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    if (/Windows/.test(ua)) return "Windows";
    if (/Mac/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";
    return "Otro";
  }

  function parseBrowser(ua: string): string {
    if (/Edg\//.test(ua)) return "Edge";
    if (/Chrome\//.test(ua)) return "Chrome";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
    return "Otro";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Registro de Sesiones
            </h1>
            <p className="text-sm text-gray-500">
              Historial de inicios de sesión de todos los usuarios
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">
            ← Volver
          </Link>
        </div>

        {/* Resumen por usuario */}
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Resumen por usuario
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {userStats.map((u) => (
            <div key={u.email} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {u.email}
                  </p>
                </div>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getRoleBadge(
                    u.role
                  )}`}
                >
                  {getRoleLabel(u.role)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-xs text-gray-400">Conexiones</p>
                  <p className="text-lg font-bold text-primary-600">
                    {u.total_logins}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Última IP</p>
                  <p className="text-xs font-mono text-gray-600 mt-1">
                    {u.last_ip}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Último acceso</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatDate(u.last_login)}
                  </p>
                </div>
                {u.last_location !== "—" && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Ubicación</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {u.last_location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {userStats.length === 0 && (
            <div className="col-span-full card p-8 text-center text-gray-500 text-sm">
              No hay registros de sesiones aún. Los logs se generan a partir del próximo inicio de sesión.
            </div>
          )}
        </div>

        {/* Tabla detallada de logs */}
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Últimos 100 inicios de sesión
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Fecha / Hora
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  IP
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Ubicación
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Dispositivo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allLogs.map((log) => {
                const locationParts = [log.city, log.region, log.country].filter(Boolean);
                const location = locationParts.length > 0 ? locationParts.join(", ") : "—";
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap tabular-nums">
                      {formatDate(log.logged_in_at)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                      {log.email}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getRoleBadge(
                          log.role
                        )}`}
                      >
                        {getRoleLabel(log.role)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-500">
                      {log.ip_address}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {location}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {parseBrowser(log.user_agent)} / {parseDevice(log.user_agent)}
                    </td>
                  </tr>
                );
              })}
              {allLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    Sin registros aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
