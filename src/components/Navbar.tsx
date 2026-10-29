"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Tutorial from "@/components/Tutorial";
import Sidebar from "@/components/Sidebar";
import { useTheme, SKIN_LABELS, SKIN_DOT, type ThemeMode, type ThemeColor } from "@/components/ThemeProvider";
import { Menu } from "lucide-react";

type Props = {
  userName: string;
  userRole: string;
  children?: React.ReactNode;
};

const SESSION_DURATION = 10 * 60 * 1000;
const WARNING_AT = 9.5 * 60 * 1000;
const EXTENSION_TIME = 5 * 60 * 1000;

const ADMIN_ROLES = ["admin", "directora_anita"];

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

const MODE_ICONS: Record<ThemeMode, string> = {
  light: "☀️",
  dark: "🌙",
  auto: "💻",
};

const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  auto: "Automático",
};

type OnlineUser = { id: string; full_name: string; role: string; last_active: string };

/* ── Cookie helpers for sidebar collapse state ── */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}
function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

export default function Navbar({ userName, userRole, children }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const supabase = createClient();
  const { mode, color, vidrio, setMode, setColor, setVidrio } = useTheme();

  /* ── Sidebar state ── */
  const [colapsado, setColapsado] = useState(() => getCookie("sgf_menu") === "1");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const esEscritorio = () => window.matchMedia("(min-width: 1024px)").matches;

  const alternar = useCallback(() => {
    if (esEscritorio()) {
      setColapsado((prev) => {
        const next = !prev;
        setCookie("sgf_menu", next ? "1" : "0");
        return next;
      });
    } else {
      setDrawerOpen((d) => !d);
    }
  }, []);

  /* ── Existing state ── */
  const [userId, setUserId] = useState<string | null>(null);
  const [userDropdown, setUserDropdown] = useState(false);
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineDropdown, setOnlineDropdown] = useState(false);
  const [themeDropdown, setThemeDropdown] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const sessionExpiry = useRef(Date.now() + SESSION_DURATION);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const onlineRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const isAdmin = ADMIN_ROLES.includes(userRole);

  /* ── Watermark ── */
  const watermarkBg = useMemo(() => {
    const label = `${userName}  ·  ${ROLE_LABELS[userRole] || userRole}`;
    const encoded = encodeURIComponent(label);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' transform='rotate(-25 200 100)' font-family='system-ui,sans-serif' font-size='14' font-weight='500' fill='%23000' fill-opacity='0.03' letter-spacing='1'>${encoded}</text></svg>`;
    return `url("data:image/svg+xml,${svg}")`;
  }, [userName, userRole]);

  /* ── Effects ── */
  useEffect(() => {
    fetch("/api/auth/permissions")
      .then((res) => res.json())
      .then((data) => setPermissions(data.permissions || []))
      .catch(() => setPermissions([]));
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    fetch("/api/auth/effective-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.effectiveUserId) setUserId(data.effectiveUserId);
      })
      .catch(() => {});
  }, [userRole]);

  useEffect(() => {
    const sendHeartbeat = () => fetch("/api/presence", { method: "POST" }).catch(() => {});
    const fetchOnline = () =>
      fetch("/api/presence")
        .then((r) => r.json())
        .then((d) => {
          setOnlineCount(d.count || 0);
          if (d.users) setOnlineUsers(d.users);
        })
        .catch(() => {});
    sendHeartbeat();
    fetchOnline();
    const hbInterval = setInterval(sendHeartbeat, 60_000);
    const countInterval = setInterval(fetchOnline, 60_000);
    return () => { clearInterval(hbInterval); clearInterval(countInterval); };
  }, []);

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
      if (onlineRef.current && !onlineRef.current.contains(e.target as Node)) setOnlineDropdown(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeDropdown(false);
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
    }, 150);
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

  const firstName = userName.split(" ")[0];

  /* ── Close drawer on route change ── */
  useEffect(() => {
    setDrawerOpen(false);
  }, [ruta]);

  /* ── Drawer: close on resize to desktop, Escape key, body scroll lock ── */
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setDrawerOpen(false); }
      if (e.key === "Tab" && drawerRef.current) {
        const els = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
        if (!els.length) return;
        const [first, last] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const onResize = () => { if (esEscritorio()) setDrawerOpen(false); };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    setTimeout(() => {
      const els = drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      els?.[0]?.focus();
    }, 30);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      hamburgerRef.current?.focus();
    };
  }, [drawerOpen]);

  /* ─────────────────────────────────────
     RENDER
     ───────────────────────────────────── */
  return (
    <div className="page-container flex min-h-screen">
      {/* Watermark */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none select-none print:hidden" style={{ backgroundImage: watermarkBg, backgroundRepeat: "repeat" }} />

      {/* ═══ SIDEBAR — desktop (sticky, flex sibling) ═══ */}
      <aside
        className={`sidebar-fondo sticky top-0 z-40 hidden lg:flex h-screen shrink-0 flex-col print:hidden transition-[width] duration-200 ease-in-out ${
          colapsado ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <Sidebar
          userRole={userRole}
          permissions={permissions}
          colapsado={colapsado}
          onAlternar={alternar}
        />
      </aside>

      {/* ═══ MOBILE DRAWER overlay ═══ */}
      <div className={`fixed inset-0 z-50 lg:hidden print:hidden ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          className={`sidebar-fondo absolute inset-y-0 left-0 w-[min(18rem,85vw)] shadow-float transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {drawerOpen && (
            <Sidebar
              userRole={userRole}
              permissions={permissions}
              colapsado={false}
              drawer
              onCerrar={() => setDrawerOpen(false)}
            />
          )}
        </div>
      </div>

      {/* ═══ Content column (flex-1) ═══ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ═══ TOP BAR ═══ */}
        <header
          className="barra-superior sticky top-0 z-30 border-b print:hidden"
          style={{
            background: "var(--nav-bg)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            borderColor: "var(--nav-border)",
          }}
        >
        {/* Thin gradient accent bar */}
        <div className="h-[3px] w-full" style={{ background: "var(--skin-accent-bar, linear-gradient(90deg, #5c7cfa, #7c3aed, #ff9800, #2ba672, #22d3ee))" }} />

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: hamburger (always) + logo (mobile only) */}
            <div className="flex items-center gap-3">
              <button
                ref={hamburgerRef}
                onClick={alternar}
                aria-label="Mostrar u ocultar el menú"
                aria-expanded={drawerOpen}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Menu size={21} />
              </button>

              <Link href="/dashboard" className="flex items-center gap-2.5 group lg:hidden">
                <Image src="/logo-idv.png" alt="Instituto Don Vasco" width={32} height={32} className="rounded-lg shadow-sm" />
                <span className="text-sm font-bold bg-clip-text text-transparent" style={{ backgroundImage: "var(--skin-gradient)", fontFamily: "var(--font-display)" }}>
                  Mnemósine
                </span>
              </Link>
            </div>

            {/* Center: search */}
            <div className="relative flex-1 max-w-md" ref={searchRef}>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:shadow-glow focus-within:bg-white focus-within:border-primary-300 transition-all duration-200">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Buscar alumno o profesor..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 ml-2 w-full"
                />
                {searchLoading && <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin ml-1" />}
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-float border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto animate-slide-down">
                  {searchResults.map((r) => (
                    <button key={`${r.type}-${r.id}`} onClick={() => handleSearchSelect(r.href)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-lg mx-1" style={{ width: "calc(100% - 8px)" }}>
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.type === "student" ? "bg-primary-100 text-primary-600" : "bg-mint-100 text-mint-600"}`}>
                        {r.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                        <p className="text-[10px] text-slate-400">{r.type === "student" ? "Alumno" : "Profesor"} · {r.detail}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-float border border-slate-200 py-4 z-50 text-center text-xs text-slate-400 animate-slide-down">Sin resultados</div>
              )}
            </div>

            {/* Right: time/weather/online + theme + user */}
            <div className="flex items-center gap-2">
              {/* Time + weather + online pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
                <span className="tabular-nums text-xs font-semibold text-slate-600">{currentTime}</span>
                {weather && (
                  <>
                    <span className="w-px h-3 bg-slate-200" />
                    <span className="flex items-center gap-1 text-xs text-slate-500" title={weather.desc}>
                      <span>{weather.icon}</span>
                      <span className="font-medium">{weather.temp}°</span>
                    </span>
                  </>
                )}
                {onlineCount > 0 && (
                  <>
                    <span className="w-px h-3 bg-slate-200" />
                    {isAdmin ? (
                      <div className="relative" ref={onlineRef}>
                        <button
                          onClick={() => setOnlineDropdown(!onlineDropdown)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                          title={`${onlineCount} usuario${onlineCount !== 1 ? "s" : ""} en línea — clic para ver`}
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                          <span className="font-medium">{onlineCount}</span>
                          <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform duration-200 ${onlineDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {onlineDropdown && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-float border border-slate-200 py-2 z-50 animate-slide-down">
                            <div className="px-3 py-2 border-b border-slate-200">
                              <p className="text-xs font-semibold text-slate-700">Usuarios en línea</p>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                              {onlineUsers.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-slate-400 text-center">Cargando...</p>
                              ) : (
                                onlineUsers.map((u) => (
                                  <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors">
                                    <div className="relative">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--skin-gradient)", color: "white" }}>
                                        {u.full_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-slate-800 truncate">{u.full_name}</p>
                                      <p className="text-[10px] text-slate-400">{ROLE_LABELS[u.role] || u.role}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500" title={`${onlineCount} usuario${onlineCount !== 1 ? "s" : ""} en línea`}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        <span className="font-medium">{onlineCount}</span>
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Mobile: compact time + weather */}
              <div className="sm:hidden flex items-center gap-2">
                <span className="text-xs text-slate-500 tabular-nums font-medium">{currentTime}</span>
                {weather && <span className="text-xs">{weather.icon} {weather.temp}°</span>}
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    <span className="font-medium">{onlineCount}</span>
                  </span>
                )}
              </div>

              {/* Theme switcher */}
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => setThemeDropdown(!themeDropdown)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition duration-150"
                  title="Personalizar tema"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                  </svg>
                </button>
                {themeDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-float border border-slate-200 py-3 z-50 animate-slide-down">
                    {/* Mode selector */}
                    <div className="px-3 mb-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2">Modo</p>
                      <div className="flex gap-1">
                        {(["light", "dark", "auto"] as ThemeMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                              mode === m
                                ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
                                : "text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <span className="text-sm">{MODE_ICONS[m]}</span>
                            <span>{MODE_LABELS[m]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 my-2" />
                    {/* Color skin */}
                    <div className="px-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2">Color</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(Object.keys(SKIN_LABELS) as ThemeColor[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                              color === c
                                ? "bg-slate-100 ring-1 ring-slate-200"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full border-2 transition-transform duration-200"
                              style={{
                                background: SKIN_DOT[c],
                                borderColor: color === c ? SKIN_DOT[c] : "transparent",
                                transform: color === c ? "scale(1.15)" : "scale(1)",
                              }}
                            />
                            <span className="text-slate-600">{SKIN_LABELS[c]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-200 my-2" />
                    {/* Glass toggle */}
                    <div className="px-3">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                          <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Estilo vidrio</p>
                          <p className="text-[10px] text-slate-400 leading-tight">Paneles translúcidos</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={vidrio}
                          onClick={() => setVidrio(!vidrio)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                            vidrio ? "bg-green-500" : "bg-slate-200"
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            vidrio ? "translate-x-[18px]" : "translate-x-[3px]"
                          }`} />
                        </button>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* User dropdown */}
              <div className="relative pl-3 border-l border-slate-200" ref={dropdownRef}>
                <button onClick={() => setUserDropdown(!userDropdown)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--skin-gradient, linear-gradient(135deg, #5c7cfa, #7c3aed))" }}>
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{firstName}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">{ROLE_LABELS[userRole] || userRole}</p>
                  </div>
                  <svg className={`w-3 h-3 text-slate-400 transition-transform duration-200 hidden md:block ${userDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-float border border-slate-200 py-2 z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <p className="text-sm font-semibold text-slate-900">{userName}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${ROLE_COLORS[userRole] || "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABELS[userRole] || userRole}
                      </span>
                    </div>
                    {userId && (
                      <Link href={`/perfil/${userId}`} onClick={() => setUserDropdown(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                        Mi perfil
                      </Link>
                    )}
                    <button onClick={() => { setShowTutorial(true); setUserDropdown(false); }} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>
                      Tutorial
                    </button>
                    <div className="border-t border-slate-200 my-1" />
                    <button onClick={handleLogout} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-coral-600 hover:bg-coral-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </header>

        {/* Page content passed as children */}
        {children}
      </div>

      {/* Tutorial modal */}
      <Tutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} userRole={userRole} />

      {/* Session timeout modal */}
      {showTimeout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-float p-7 max-w-sm w-full mx-4 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>Sesión por expirar</h3>
            <p className="text-sm text-slate-500 mb-1">
              Tu sesión se cerrará en <span className="font-bold text-amber-600 tabular-nums">{countdown}s</span>
            </p>
            <p className="text-xs text-slate-400 mb-6">¿Deseas continuar?</p>
            <div className="flex gap-3">
              <button onClick={handleLogout} className="btn-secondary flex-1">Cerrar sesión</button>
              <button onClick={handleExtendSession} className="btn-primary flex-1">+5 minutos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
