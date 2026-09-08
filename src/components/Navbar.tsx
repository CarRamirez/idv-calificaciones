"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, useCallback } from "react";

type Props = {
  userName: string;
  userRole: string;
};

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE = 2 * 60 * 1000; // Aviso 2 min antes

export default function Navbar({ userName, userRole }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string } | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const lastActivity = useRef(Date.now());
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Timeout por inactividad
  useEffect(() => {
    function resetActivity() {
      lastActivity.current = Date.now();
      setShowTimeout(false);
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetActivity));

    const checker = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= INACTIVITY_LIMIT) {
        supabase.auth.signOut().then(() => router.push("/login"));
      } else if (elapsed >= INACTIVITY_LIMIT - WARNING_BEFORE) {
        setShowTimeout(true);
      }
    }, 30000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity));
      clearInterval(checker);
    };
  }, [router, supabase.auth]);

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
    router.push("/login");
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

  const firstName = userName.split(" ")[0];

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
              {(userRole === "teacher" || userRole === "admin") && (
                <Link
                  href="/captura"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Captura
                </Link>
              )}
              {(userRole === "admin" || userRole === "viewer") && (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Concentrado
                </Link>
              )}
              {userRole === "admin" && (
                <Link
                  href="/admin/alumnos"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Admin
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
              {(userRole === "teacher" || userRole === "admin") && (
                <Link href="/captura" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Captura
                </Link>
              )}
              {(userRole === "admin" || userRole === "viewer") && (
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Concentrado
                </Link>
              )}
              {userRole === "admin" && (
                <Link href="/admin/alumnos" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Admin
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

      {/* Warning de inactividad */}
      {showTimeout && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-sm">
          <span className="text-yellow-600 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">Sesión por expirar</p>
            <p className="text-xs text-yellow-600">Mueve el mouse o presiona una tecla para mantener tu sesión activa.</p>
          </div>
        </div>
      )}
    </>
  );
}
