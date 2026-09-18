"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

type Props = {
  userName: string;
  userRole: string;
};

const SESSION_DURATION = 10 * 60 * 1000; // 10 minutos
const WARNING_AT = 9.5 * 60 * 1000; // Aviso a los 9:30
const EXTENSION_TIME = 5 * 60 * 1000; // Extensión de 5 minutos

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  teacher: "Profesor",
  viewer: "Consulta",
};

export default function Navbar({ userName, userRole }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string } | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const sessionExpiry = useRef(Date.now() + SESSION_DURATION);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Marca de agua SVG generada dinámicamente
  const watermarkBg = useMemo(() => {
    const label = `${userName}  ·  ${ROLE_LABELS[userRole] || userRole}`;
    const encoded = encodeURIComponent(label);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(-25 200 100)' font-family='system-ui,sans-serif' font-size='14' font-weight='500' fill='%23000' fill-opacity='0.04' letter-spacing='1'>${encoded}</text></svg>`;
    return `url("data:image/svg+xml,${svg}")`;
  }, [userName, userRole]);

  // Permisos según rol
  useEffect(() => {
    const BUILTIN_PERMS: Record<string, string[]> = {
      admin: ["dashboard", "calificaciones", "captura", "boleta", "periodos", "usuarios", "tareas", "concentrado", "admin_profesores", "admin_alumnos", "admin_grupos", "admin_materias", "admin_sesiones", "admin_roles"],
      teacher: ["dashboard", "calificaciones", "captura", "boleta"],
      viewer: ["dashboard", "concentrado"],
    };

    if (BUILTIN_PERMS[userRole]) {
      setPermissions(BUILTIN_PERMS[userRole]);
    } else {
      supabase
        .from("roles")
        .select("permissions")
        .eq("name", userRole)
        .single()
        .then(({ data }) => {
          setPermissions(data?.permissions || []);
        });
    }
  }, [userRole, supabase]);

  // Reloj en tiempo real
  useEffect(() => {
    function updateTime() {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
      );
    }
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Clima por geolocalización
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const data = await res.json();
          const code = data.current?.weather_code ?? 0;
          const temp = Math.round(data.current?.temperature_2m ?? 0);
          const { desc, icon } = weatherInfo(code);
          setWeather({ temp, desc, icon });
        } catch {
          // Sin clima disponible
        }
      },
      () => {
        // Permiso denegado
      },
      { timeout: 5000 }
    );
  }, []);

  // Temporizador absoluto de sesión
  useEffect(() => {
    const checker = setInterval(() => {
      const remaining = sessionExpiry.current - Date.now();
      if (remaining <= 0) {
        clearInterval(checker);
        supabase.auth.signOut().then(() => router.replace("/login"));
      } else if (remaining <= (SESSION_DURATION - WARNING_AT)) {
        setShowTimeout(true);
        setCountdown(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(checker);
  }, [router, supabase.auth]);

  const handleExtendSession = useCallback(() => {
    sessionExpiry.current = Date.now() + EXTENSION_TIME;
    setShowTimeout(false);
    setCountdown(30);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase.auth]);

  function weatherInfo(code: number): { desc: string; icon: string } {
    if (code === 0) return { desc: "Despejado", icon: "☀️" };
    if (code <= 3) return { desc: "Nublado", icon: "⛅" };
    if (code <= 48) return { desc: "Niebla", icon: "🌫️" };
    if (code <= 57) return { desc: "Llovizna", icon: "🌦️" };
    if (code <= 67) return { desc: "Lluvia", icon: "🌧️" };
    if (code <= 77) return { desc: "Nieve", icon: "🌨️" };
    if (code <= 82) return { desc: "Aguacero", icon: "🌧️" };
    if (code <= 86) return { desc: "Nevada", icon: "❄️" };
    return { desc: "Tormenta", icon: "⛈️" };
  }

  const can = useCallback((perm: string) => permissions.includes(perm), [permissions]);
  const canAny = useCallback((...perms: string[]) => perms.some(p => permissions.includes(p)), [permissions]);

  const firstName = userName.split(" ")[0];

  return (
    <>
      {/* Marca de agua global */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none"
        style={{ backgroundImage: watermarkBg, backgroundRepeat: "repeat" }}
      />

      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo-idv.png"
                alt="Instituto Don Vasco"
                width={36}
                height={36}
                className="rounded-full"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-primary-700">Mnemósine</span>
                <span className="text-[10px] text-accent-600 font-medium hidden sm:block">
                  Instituto Don Vasco
                </span>
              </div>
            </Link>

            {/* Centro: hora y clima */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              <span className="tabular-nums font-medium">{currentTime}</span>
              {weather && (
                <span className="flex items-center gap-1" title={weather.desc}>
                  <span>{weather.icon}</span>
                  <span>{weather.temp}°C</span>
                </span>
              )}
            </div>

            {/* Desktop: nav + usuario */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Inicio
              </Link>
              {canAny("calificaciones", "captura") && (
                <Link
                  href="/calificaciones"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Calificaciones
                </Link>
              )}
              {canAny("admin_profesores", "admin_alumnos", "admin_grupos", "admin_materias", "admin_sesiones", "admin_roles") && (
                <Link
                  href="/usuarios"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Usuarios
                </Link>
              )}
              {can("periodos") && (
                <Link
                  href="/periodos"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Periodos
                </Link>
              )}
              {can("boleta") && (
                <Link
                  href="/boleta"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Boleta
                </Link>
              )}
              {can("tareas") && (
                <Link
                  href="/tareas"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Tareas
                </Link>
              )}
              {can("concentrado") && (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Concentrado
                </Link>
              )}

              {/* Dropdown de usuario */}
              <div className="relative ml-2 pl-4 border-l border-gray-200" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs">{firstName}</span>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-900">{userName}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{userRole}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Móvil: hora + menú */}
            <div className="sm:hidden flex items-center gap-3">
              <span className="text-xs text-gray-500 tabular-nums">{currentTime}</span>
              {weather && (
                <span className="text-xs">{weather.icon} {weather.temp}°</span>
              )}
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Menú móvil */}
          {menuOpen && (
            <div className="sm:hidden pb-3 space-y-1">
              <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                Inicio
              </Link>
              {canAny("calificaciones", "captura") && (
                <Link href="/calificaciones" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Calificaciones
                </Link>
              )}
              {canAny("admin_profesores", "admin_alumnos", "admin_grupos", "admin_materias", "admin_sesiones", "admin_roles") && (
                <Link href="/usuarios" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Usuarios
                </Link>
              )}
              {can("periodos") && (
                <Link href="/periodos" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Periodos
                </Link>
              )}
              {can("boleta") && (
                <Link href="/boleta" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Boleta
                </Link>
              )}
              {can("tareas") && (
                <Link href="/tareas" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Tareas
                </Link>
              )}
              {can("concentrado") && (
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Concentrado
                </Link>
              )}
              <div className="px-3 py-2 flex items-center justify-between border-t border-gray-100 mt-1 pt-2">
                <span className="text-xs text-gray-500">{userName}</span>
                <button onClick={handleLogout} className="text-xs text-red-600">
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Modal de sesión por expirar */}
      {showTimeout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Sesión por expirar</h3>
            <p className="text-sm text-gray-500 mb-1">
              Tu sesión se cerrará en <span className="font-bold text-yellow-600 tabular-nums">{countdown}s</span>
            </p>
            <p className="text-xs text-gray-400 mb-5">¿Deseas continuar trabajando?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cerrar sesión
              </button>
              <button
                onClick={handleExtendSession}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
              >
                +5 minutos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
