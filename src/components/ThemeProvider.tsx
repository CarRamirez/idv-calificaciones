"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type ThemeMode = "light" | "dark" | "auto";
// Tipos de Modo y Skin compatibles con SIGEFCP
export type Modo = ThemeMode;
export type Skin =
  | "azul" | "verde" | "guinda" | "violeta" | "indigo"
  | "oro" | "plata" | "naranja" | "turquesa" | "rojo" | "rosa" | "fucsia" | "lima";

// Alias: Mnemósine usaba ThemeColor con nombres en inglés
export type ThemeColor = Skin;

export type SkinInfo = { id: Skin; nombre: string; color: string; grupo: "Clásicos" | "Metálicos" | "Llamativos" };

export const SKINS: SkinInfo[] = [
  { id: "azul",      nombre: "Azul",       color: "#2563eb", grupo: "Clásicos" },
  { id: "verde",     nombre: "Verde",      color: "#059669", grupo: "Clásicos" },
  { id: "guinda",    nombre: "Guinda",     color: "#9f2242", grupo: "Clásicos" },
  { id: "violeta",   nombre: "Violeta",    color: "#7c3aed", grupo: "Clásicos" },
  { id: "indigo",    nombre: "Índigo",     color: "#4f46e5", grupo: "Clásicos" },
  { id: "oro",       nombre: "Dorado",     color: "#b8860b", grupo: "Metálicos" },
  { id: "plata",     nombre: "Plata",      color: "#64748b", grupo: "Metálicos" },
  { id: "naranja",   nombre: "Naranja",    color: "#ea580c", grupo: "Llamativos" },
  { id: "turquesa",  nombre: "Turquesa",   color: "#0891b2", grupo: "Llamativos" },
  { id: "rojo",      nombre: "Rojo",       color: "#dc2626", grupo: "Llamativos" },
  { id: "rosa",      nombre: "Rosa",       color: "#db2777", grupo: "Llamativos" },
  { id: "fucsia",    nombre: "Fucsia",     color: "#c026d3", grupo: "Llamativos" },
  { id: "lima",      nombre: "Lima",       color: "#65a30d", grupo: "Llamativos" },
];

// Backward compatibility exports
export const SKIN_LABELS: Record<string, string> = Object.fromEntries(SKINS.map(s => [s.id, s.nombre]));
export const SKIN_DOT: Record<string, string> = Object.fromEntries(SKINS.map(s => [s.id, s.color]));

// Map old Mnemósine color names → new skin names
const LEGACY_MAP: Record<string, Skin> = {
  blue: "azul", emerald: "verde", rose: "rosa", amber: "oro",
  cyan: "turquesa", silver: "plata", gold: "oro", bronze: "naranja", graphite: "plata",
};

function migrateSkin(raw: string | null): Skin {
  if (!raw) return "azul";
  if (SKINS.some(s => s.id === raw)) return raw as Skin;
  return LEGACY_MAP[raw] || "azul";
}

type Ctx = {
  mode: ThemeMode; color: Skin; vidrio: boolean; resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void; setColor: (s: Skin) => void; setVidrio: (v: boolean) => void;
  // SIGEFCP-compatible aliases
  modo: ThemeMode; skin: Skin; setModo: (m: ThemeMode) => void; setSkin: (s: Skin) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyToDOM(modo: ThemeMode, skin: Skin, vidrio: boolean) {
  const oscuro = modo === "dark" || (modo === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
  document.documentElement.classList.toggle("glass", vidrio);
  document.documentElement.dataset.skin = skin;
  document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
  return oscuro ? "dark" as const : "light" as const;
}

/** Script anti-parpadeo que corre antes de pintar */
export const SCRIPT_TEMA = `(function(){try{var m=localStorage.getItem('tema-modo')||localStorage.getItem('theme-mode')||'light';if(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');else if(m==='dark')document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme',document.documentElement.classList.contains('dark')?'dark':'light');var s=localStorage.getItem('tema-skin')||localStorage.getItem('theme-color')||'azul';var map={blue:'azul',emerald:'verde',rose:'rosa',amber:'oro',cyan:'turquesa',silver:'plata',gold:'oro',bronze:'naranja',graphite:'plata'};s=map[s]||s;document.documentElement.dataset.skin=s;if((localStorage.getItem('tema-vidrio')||localStorage.getItem('theme-vidrio'))==='1')document.documentElement.classList.add('glass');}catch(e){}})();`;

function readPref(userId: string): { mode: ThemeMode; skin: Skin; vidrio: boolean } {
  try {
    // Try new keys first, then legacy
    const mode = (localStorage.getItem(`tema-modo-${userId}`) || localStorage.getItem(`theme-mode-${userId}`) || localStorage.getItem("tema-modo") || "light") as ThemeMode;
    const rawSkin = localStorage.getItem(`tema-skin-${userId}`) || localStorage.getItem(`theme-color-${userId}`) || localStorage.getItem("tema-skin") || "azul";
    const vidrio = (localStorage.getItem(`tema-vidrio-${userId}`) || localStorage.getItem(`theme-vidrio-${userId}`) || localStorage.getItem("tema-vidrio")) === "1";
    return { mode, skin: migrateSkin(rawSkin), vidrio };
  } catch {
    return { mode: "light", skin: "azul", vidrio: false };
  }
}

function writePref(userId: string, mode: ThemeMode, skin: Skin, vidrio: boolean) {
  try {
    localStorage.setItem(`tema-modo-${userId}`, mode);
    localStorage.setItem(`tema-skin-${userId}`, skin);
    localStorage.setItem(`tema-vidrio-${userId}`, vidrio ? "1" : "0");
    // Global keys for the flash-prevention script
    localStorage.setItem("tema-modo", mode);
    localStorage.setItem("tema-skin", skin);
    localStorage.setItem("tema-vidrio", vidrio ? "1" : "0");
  } catch {}
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [skin, setSkinState] = useState<Skin>("azul");
  const [vidrio, setVidrioState] = useState(false);
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      const pref = readPref(user.id);
      setModeState(pref.mode);
      setSkinState(pref.skin);
      setVidrioState(pref.vidrio);
      const r = applyToDOM(pref.mode, pref.skin, pref.vidrio);
      setResolved(r);
      writePref(user.id, pref.mode, pref.skin, pref.vidrio);
    });
  }, []);

  useEffect(() => {
    const r = applyToDOM(mode, skin, vidrio);
    setResolved(r);
  }, [mode, skin, vidrio]);

  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { const r = applyToDOM("auto", skin, vidrio); setResolved(r); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, skin, vidrio]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    if (userIdRef.current) writePref(userIdRef.current, m, skin, vidrio);
  }, [skin, vidrio]);

  const setColor = useCallback((s: Skin) => {
    setSkinState(s);
    if (userIdRef.current) writePref(userIdRef.current, mode, s, vidrio);
  }, [mode, vidrio]);

  const setVidrio = useCallback((v: boolean) => {
    setVidrioState(v);
    if (userIdRef.current) writePref(userIdRef.current, mode, skin, v);
  }, [mode, skin]);

  const ctx: Ctx = {
    mode, color: skin, vidrio, resolved,
    setMode, setColor: setColor, setVidrio,
    // SIGEFCP-compatible aliases
    modo: mode, skin, setModo: setMode, setSkin: setColor,
  };

  return <ThemeCtx.Provider value={ctx}>{children}</ThemeCtx.Provider>;
}

/** Hook principal — compatible con ambas APIs */
export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme fuera de ThemeProvider");
  return c;
}

/** Alias SIGEFCP */
export const useTema = useTheme;

// Re-export ThemeProvider as named export too
export { ThemeProvider };
