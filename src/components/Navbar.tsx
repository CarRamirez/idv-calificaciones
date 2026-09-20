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

const SESSION_DURATION = 10 * 60 * 1000;
const WARNING_AT = 9.5 * 60 * 1000;
const EXTENSION_TIME = 5 * 60 * 1000;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  directora_anita: "Dirección",
  teacher: "Profesor",
  viewer: "Consulta",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700",
  directora_anita: "bg-emerald-100 text-emerald-700",
  teacher: "bg-primary-100 text-primary-700",
  viewer: "bg-sky-100 text-sky-700",
};

export default function Navbar({ userName, userRole }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDropdown, setUserDropdown] = useState(false);
  const [calDropdown, setCalDropdown] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; type: string; detail: string; href: string }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [weather, setWeather] = useState<{ temp: number; desc: string; icon: string } | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const sessionExpiry = useRef(Date.now() + SESSION_DURATION);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const calDropdownRef = useRef<HTMLDivElement>(null);

  const watermarkBg = useMemo(() => {
    const label = `${userName}  ·  ${ROLE_LABELS[userRole] || userRole}`;
    const encoded = encodeURIComponent(label);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(-25 200 100)' font-family='system-ui,sans-serif' font-size='14' font-weight='500' fill='%23000' fill-opacity='0.03' letter-spacing='1'>${encoded}</text></svg>`;
    return `url("data:image/svg+xml,${svg}")`;
  }, [userName, userRole]);

  useEffect(() => {
    fetch("/api/auth/permissions")
      .then((res) => res.json())
      .then((data) => setPermissions(data.permissions || []))
      .catch(() => setPermissions([]));
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [userRole]);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    }
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
          const data = await res.json();
          const code = data.current?.weather_code ?? 0;
          const temp = Math.round(data.current?.temperature_2m ?? 0);
          const { desc, icon } = weatherInfo(code);
          setWeather({ temp, desc, icon });
        } catch { /* noop */ }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setUserDropdown(false);
      if (calDropdownRef.current && !calDropdownRef.current.contains(e.target as Node)) setCalDropdown(false);
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

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleSearchSelect(href: string) {
    setSearchOpen(false); setSearchQuery(""); setSearchResults([]); router.push(href);
  }

  const can = useCallback((perm: string) => permissions.includes(perm), [permissions]);
  const canAny = useCallback((...perms: string[]) => perms.some(p => permissions.includes(p)), [permissions]);
  const firstName = userName.split(" ")[0];

  return (
    <>
      {/* Watermark */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none select-none" style={{ backgroundImage: watermarkBg, backgroundRepeat: "repeat" }} />

      <nav className="sticky top-0 z-50 border-b" style={{ background: "var(--nav-bg)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderColor: "var(--nav-border)" }}>
        {/* Thin gradient accent bar at top */}
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #5c7cfa, #7c3aed, #ff9800, #2ba672, #22d3ee)" }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative">
                <Image src="/logo-idv.png" alt="Instituto Don Vasco" width={36} height={36} className="rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-200" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-mint-400 border-2 border-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display)" }}>
                  Mnemósine
                </span>
                <span className="text-[10px] text-gray-400 font-medium hidden sm:block">Instituto Don Vasco</span>
              </div>
            </Link>

            {/* Center: time + weather */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
              <span className="tabular-nums text-xs font-semibold text-gray-600">{currentTime}</span>
              {weather && (
                <>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="flex items-center gap-1 text-xs text-gray-500" title={weather.desc}>
                    <span>{weather.icon}</span>
                    <span className="font-medium">{weather.temp}°</span>
                  </span>
                </>
              )}
            </div>

            {/* Desktop nav + user */}
            <div className="hidden sm:flex items-center gap-1">
              {/* Search */}
              <div className="relative mr-2" ref={searchRef}>
                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary-200 focus-within:bg-white focus-within:border-primary-200 transition-all duration-200">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Buscar..." value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    className="bg-transparent border-none outline-none text-xs text-gray-700 placeholder-gray-400 ml-2 w-32 lg:w-44"
                  />
                  {searchLoading && <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin ml-1" />}
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-float border border-gray-100 py-2 z-50 max-h-80 overflow-y-auto animate-slide-down">
                    {searchResults.map((r) => (
                      <button key={`${r.type}-${r.id}`} onClick={() => handleSearchSelect(r.href)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors rounded-xl mx-1" style={{ width: "calc(100% - 8px)" }}>
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.type === "student" ? "bg-primary-100 text-primary-600" : "bg-mint-100 text-mint-600"}`}>
                          {r.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                          <p className="text-[10px] text-gray-400">{r.type === "student" ? "Alumno" : "Profesor"} · {r.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchOpen && searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-float border border-gray-100 py-4 z-50 text-center text-xs text-gray-400 animate-slide-down">Sin resultados</div>
                )}
              </div>

              {/* Nav links */}
              <NavLink href="/dashboard">Inicio</NavLink>
              {canAny("calificaciones", "captura", "boleta", "concentrado") && (
                <div className="relative" ref={calDropdownRef}>
                  <button onClick={() => setCalDropdown(!calDropdown)} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200">
                    Calificaciones
                    <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${calDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {calDropdown && (
                    <div className="absolute left-0 mt-1 w-48 bg-white rounded-2xl shadow-float border border-gray-100 py-2 z-50 animate-slide-down">
                      {canAny("calificaciones", "captura") && (
                        <Link href="/calificaciones" onClick={() => setCalDropdown(false)} className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-xl mx-1" style={{ width: "calc(100% - 8px)" }}>
                          Calificaciones
                        </Link>
                      )}
                      {can("concentrado") && (
                        <Link href="/concentrado" onClick={() => setCalDropdown(false)} className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-xl mx-1" style={{ width: "calc(100% - 8px)" }}>
                          Concentrado
                        </Link>
                      )}
                      {can("boleta") && (
                        <Link href="/boleta" onClick={() => setCalDropdown(false)} className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors rounded-xl mx-1" style={{ width: "calc(100% - 8px)" }}>
                          Boleta
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
              {canAny("admin_profesores", "admin_alumnos", "admin_grupos", "admin_materias", "admin_sesiones", "admin_roles") && (
                <NavLink href="/usuarios">Usuarios</NavLink>
              )}
              {can("periodos") && <NavLink href="/periodos">Periodos</NavLink>}

              {/* User dropdown */}
              <div className="relative ml-1 pl-3 border-l border-gray-200" ref={dropdownRef}>
                <button onClick={() => setUserDropdown(!userDropdown)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #5c7cfa, #7c3aed)", color: "white" }}>
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{firstName}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{ROLE_LABELS[userRole] || userRole}</p>
                  </div>
                  <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${userDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-float border border-gray-100 py-2 z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{userName}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${ROLE_COLORS[userRole] || "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[userRole] || userRole}
                      </span>
                    </div>
                    {userId && (
                      <Link href={`/perfil/${userId}`} onClick={() => setUserDropdown(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                        Mi perfil
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-coral-600 hover:bg-coral-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden flex items-center gap-2">
              <span className="text-xs text-gray-500 tabular-nums font-medium">{currentTime}</span>
              {weather && <span className="text-xs">{weather.icon} {weather.temp}°</span>}
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="sm:hidden pb-4 space-y-1 animate-slide-down">
              {/* Mobile search */}
              <div className="px-1 py-2">
                <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Buscar alumno o profesor..." value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 ml-2 w-full"
                  />
                </div>
                {searchOpen && searchResults.length > 0 && (
                  <div className="mt-2 bg-white rounded-2xl border border-gray-100 py-1 max-h-60 overflow-y-auto shadow-soft">
                    {searchResults.map((r) => (
                      <button key={`m-${r.type}-${r.id}`} onClick={() => { handleSearchSelect(r.href); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 rounded-xl">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${r.type === "student" ? "bg-primary-100 text-primary-600" : "bg-mint-100 text-mint-600"}`}>
                          {r.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 truncate">{r.name}</p>
                          <p className="text-[10px] text-gray-400">{r.type === "student" ? "Alumno" : "Profesor"} · {r.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <MobileNavLink href="/dashboard" onClick={() => setMenuOpen(false)}>Inicio</MobileNavLink>
              {canAny("calificaciones", "captura", "boleta", "concentrado") && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calificaciones</p>
                  {canAny("calificaciones", "captura") && <MobileNavLink href="/calificaciones" onClick={() => setMenuOpen(false)} indent>Calificaciones</MobileNavLink>}
                  {can("concentrado") && <MobileNavLink href="/concentrado" onClick={() => setMenuOpen(false)} indent>Concentrado</MobileNavLink>}
                  {can("boleta") && <MobileNavLink href="/boleta" onClick={() => setMenuOpen(false)} indent>Boleta</MobileNavLink>}
                </>
              )}
              {canAny("admin_profesores", "admin_alumnos", "admin_grupos", "admin_materias", "admin_sesiones", "admin_roles") && (
                <MobileNavLink href="/usuarios" onClick={() => setMenuOpen(false)}>Usuarios</MobileNavLink>
              )}
              {can("periodos") && <MobileNavLink href="/periodos" onClick={() => setMenuOpen(false)}>Periodos</MobileNavLink>}

              <div className="border-t border-gray-100 mt-2 pt-3">
                {userId && (
                  <MobileNavLink href={`/perfil/${userId}`} onClick={() => setMenuOpen(false)}>Mi perfil</MobileNavLink>
                )}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, #5c7cfa, #7c3aed)" }}>
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500">{userName}</span>
                  </div>
                  <button onClick={handleLogout} className="text-xs font-semibold text-coral-500 hover:text-coral-600 transition-colors">
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Session timeout modal */}
      {showTimeout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-float p-7 max-w-sm w-full mx-4 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>Sesión por expirar</h3>
            <p className="text-sm text-gray-500 mb-1">
              Tu sesión se cerrará en <span className="font-bold text-accent-600 tabular-nums">{countdown}s</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">¿Deseas continuar?</p>
            <div className="flex gap-3">
              <button onClick={handleLogout} className="btn-secondary flex-1">Cerrar sesión</button>
              <button onClick={handleExtendSession} className="btn-primary flex-1">+5 minutos</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick, indent }: { href: string; children: React.ReactNode; onClick?: () => void; indent?: boolean }) {
  return (
    <Link href={href} onClick={onClick} className={`block px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-colors ${indent ? "ml-3" : ""}`}>
      {children}
    </Link>
  );
}
