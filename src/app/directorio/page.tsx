"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  directora_anita: "Dirección",
  teacher: "Profesor",
  viewer: "Consulta",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary-100 text-primary-700",
  directora_anita: "bg-emerald-100 text-emerald-700",
  teacher: "bg-violet-100 text-violet-700",
  viewer: "bg-gray-100 text-gray-600",
};

const AVATAR_GRADIENTS: Record<string, string> = {
  admin: "from-primary-400 to-primary-600",
  directora_anita: "from-emerald-400 to-emerald-600",
  teacher: "from-violet-400 to-violet-600",
  viewer: "from-gray-400 to-gray-500",
};

type User = {
  id: string;
  full_name: string;
  role: string;
  celular: string | null;
  correo_personal: string | null;
  telefono_emergencia: string | null;
  nombre_emergencia: string | null;
  relacion_emergencia: string | null;
};

export default function DirectorioPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/directorio").then((r) => r.json()),
      fetch("/api/auth/effective-profile").then((r) => r.json()),
    ])
      .then(([dirData, profData]) => {
        if (dirData.users) setUsers(dirData.users);
        if (profData.full_name) setProfile({ full_name: profData.full_name, role: profData.role });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.correo_personal || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roles = Array.from(new Set(users.map((u) => u.role)));

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10
      ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      : phone;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile?.full_name || ""} userRole={profile?.role || ""} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            Directorio
          </h1>
          <p className="text-sm text-gray-400 mt-1">Información de contacto de profesores y personal</p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field sm:w-48"
            >
              <option value="all">Todos los roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400 mb-4">
          {filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Cargando directorio...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <p className="text-sm text-gray-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u) => {
              const initials = u.full_name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const gradient = AVATAR_GRADIENTS[u.role] || "from-gray-400 to-gray-500";
              const whatsappUrl = u.celular
                ? `https://wa.me/52${u.celular.replace(/\D/g, "")}`
                : null;

              return (
                <div key={u.id} className="card p-5 hover:shadow-md transition-shadow duration-200 flex flex-col">
                  {/* Top: Avatar + Name + Role */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-sm font-bold">{initials}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name}</p>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-2 flex-1">
                    {/* Phone */}
                    {u.celular && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-600">{formatPhone(u.celular)}</span>
                      </div>
                    )}

                    {/* Email */}
                    {u.correo_personal && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                          </svg>
                        </div>
                        <a href={`mailto:${u.correo_personal}`} className="text-xs text-gray-600 hover:text-primary-600 truncate transition-colors">
                          {u.correo_personal}
                        </a>
                      </div>
                    )}

                    {/* Emergency phone */}
                    {u.telefono_emergencia && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-600">{formatPhone(u.telefono_emergencia)}</span>
                      </div>
                    )}

                    {/* Emergency contact */}
                    {u.nombre_emergencia && (
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
                          </svg>
                        </div>
                        <div className="text-xs text-gray-600">
                          <p className="font-medium">{u.nombre_emergencia}</p>
                          {u.relacion_emergencia && (
                            <p className="text-gray-400">{u.relacion_emergencia}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No data */}
                    {!u.celular && !u.correo_personal && !u.telefono_emergencia && !u.nombre_emergencia && (
                      <p className="text-xs text-gray-300 italic">Sin datos de contacto</p>
                    )}
                  </div>

                  {/* WhatsApp button at bottom */}
                  {whatsappUrl && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors shadow-sm"
                        title={`Enviar WhatsApp a ${u.full_name}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                        </svg>
                        Enviar WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
