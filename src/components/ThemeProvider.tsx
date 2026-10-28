"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type ThemeMode = "light" | "dark" | "auto";
export type ThemeColor = "indigo" | "blue" | "emerald" | "rose" | "amber" | "cyan" | "silver" | "gold" | "bronze" | "graphite";

type ThemeCtx = {
  mode: ThemeMode;
  color: ThemeColor;
  vidrio: boolean;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  setColor: (c: ThemeColor) => void;
  setVidrio: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: "light",
  color: "indigo",
  vidrio: false,
  resolved: "light",
  setMode: () => {},
  setColor: () => {},
  setVidrio: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const COLOR_VARS: Record<ThemeColor, Record<string, string>> = {
  indigo: {
    "--skin-primary": "#5c7cfa",
    "--skin-secondary": "#7c3aed",
    "--skin-gradient": "linear-gradient(135deg, #5c7cfa 0%, #7c3aed 100%)",
    "--skin-ring": "rgba(92, 124, 250, 0.5)",
    "--skin-shadow": "rgba(92, 124, 250, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #5c7cfa, #7c3aed, #ff9800, #2ba672, #22d3ee)",
  },
  blue: {
    "--skin-primary": "#2563eb",
    "--skin-secondary": "#3b82f6",
    "--skin-gradient": "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
    "--skin-ring": "rgba(37, 99, 235, 0.5)",
    "--skin-shadow": "rgba(37, 99, 235, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #2563eb, #0ea5e9, #06b6d4, #3b82f6, #60a5fa)",
  },
  emerald: {
    "--skin-primary": "#059669",
    "--skin-secondary": "#10b981",
    "--skin-gradient": "linear-gradient(135deg, #059669 0%, #34d399 100%)",
    "--skin-ring": "rgba(5, 150, 105, 0.5)",
    "--skin-shadow": "rgba(5, 150, 105, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #059669, #10b981, #34d399, #6ee7b7, #a7f3d0)",
  },
  rose: {
    "--skin-primary": "#e11d48",
    "--skin-secondary": "#f43f5e",
    "--skin-gradient": "linear-gradient(135deg, #e11d48 0%, #fb7185 100%)",
    "--skin-ring": "rgba(225, 29, 72, 0.5)",
    "--skin-shadow": "rgba(225, 29, 72, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #e11d48, #f43f5e, #fb7185, #fda4af, #fecdd3)",
  },
  amber: {
    "--skin-primary": "#d97706",
    "--skin-secondary": "#f59e0b",
    "--skin-gradient": "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
    "--skin-ring": "rgba(217, 119, 6, 0.5)",
    "--skin-shadow": "rgba(217, 119, 6, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24, #fde68a, #fef3c7)",
  },
  cyan: {
    "--skin-primary": "#0891b2",
    "--skin-secondary": "#06b6d4",
    "--skin-gradient": "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
    "--skin-ring": "rgba(8, 145, 178, 0.5)",
    "--skin-shadow": "rgba(8, 145, 178, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #0891b2, #06b6d4, #22d3ee, #67e8f9, #a5f3fc)",
  },
  silver: {
    "--skin-primary": "#94a3b8",
    "--skin-secondary": "#cbd5e1",
    "--skin-gradient": "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 50%, #e2e8f0 100%)",
    "--skin-ring": "rgba(148, 163, 184, 0.5)",
    "--skin-shadow": "rgba(148, 163, 184, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #64748b, #94a3b8, #cbd5e1, #e2e8f0, #f1f5f9)",
  },
  gold: {
    "--skin-primary": "#b8860b",
    "--skin-secondary": "#daa520",
    "--skin-gradient": "linear-gradient(135deg, #b8860b 0%, #daa520 50%, #f0d060 100%)",
    "--skin-ring": "rgba(184, 134, 11, 0.5)",
    "--skin-shadow": "rgba(184, 134, 11, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #8b6914, #b8860b, #daa520, #f0d060, #fdf0b0)",
  },
  bronze: {
    "--skin-primary": "#a0522d",
    "--skin-secondary": "#cd7f32",
    "--skin-gradient": "linear-gradient(135deg, #a0522d 0%, #cd7f32 50%, #dea06c 100%)",
    "--skin-ring": "rgba(205, 127, 50, 0.5)",
    "--skin-shadow": "rgba(205, 127, 50, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #8b4513, #a0522d, #cd7f32, #dea06c, #f0c8a0)",
  },
  graphite: {
    "--skin-primary": "#374151",
    "--skin-secondary": "#4b5563",
    "--skin-gradient": "linear-gradient(135deg, #1f2937 0%, #374151 50%, #6b7280 100%)",
    "--skin-ring": "rgba(55, 65, 81, 0.5)",
    "--skin-shadow": "rgba(55, 65, 81, 0.35)",
    "--skin-accent-bar": "linear-gradient(90deg, #111827, #1f2937, #374151, #4b5563, #6b7280)",
  },
};

export const SKIN_LABELS: Record<ThemeColor, string> = {
  indigo: "Índigo",
  blue: "Azul",
  emerald: "Esmeralda",
  rose: "Rosa",
  amber: "Ámbar",
  cyan: "Cian",
  silver: "Plata",
  gold: "Oro",
  bronze: "Bronce",
  graphite: "Grafito",
};

export const SKIN_DOT: Record<ThemeColor, string> = {
  indigo: "#5c7cfa",
  blue: "#2563eb",
  emerald: "#059669",
  rose: "#e11d48",
  amber: "#d97706",
  cyan: "#0891b2",
  silver: "#94a3b8",
  gold: "#daa520",
  bronze: "#cd7f32",
  graphite: "#374151",
};

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "auto") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyToDOM(m: ThemeMode, c: ThemeColor, v: boolean) {
  const r = resolveMode(m);
  document.documentElement.setAttribute("data-theme", r);
  document.documentElement.classList.toggle("glass", v);
  const vars = COLOR_VARS[c] || COLOR_VARS.indigo;
  for (const [key, val] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, val);
  }
  return r;
}

// Read per-user keys from localStorage
function readUserPref(userId: string): { mode: ThemeMode; color: ThemeColor; vidrio: boolean } {
  try {
    const mode = (localStorage.getItem(`theme-mode-${userId}`) as ThemeMode) || "light";
    const color = (localStorage.getItem(`theme-color-${userId}`) as ThemeColor) || "indigo";
    const vidrio = localStorage.getItem(`theme-vidrio-${userId}`) === "1";
    return { mode, color, vidrio };
  } catch {
    return { mode: "light", color: "indigo", vidrio: false };
  }
}

function writeUserPref(userId: string, mode: ThemeMode, color: ThemeColor, vidrio: boolean) {
  try {
    localStorage.setItem(`theme-mode-${userId}`, mode);
    localStorage.setItem(`theme-color-${userId}`, color);
    localStorage.setItem(`theme-vidrio-${userId}`, vidrio ? "1" : "0");
    // Also write generic keys for the flash-prevention script in layout.tsx
    localStorage.setItem("theme-mode", mode);
    localStorage.setItem("theme-color", color);
    localStorage.setItem("theme-vidrio", vidrio ? "1" : "0");
  } catch {}
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [color, setColorState] = useState<ThemeColor>("indigo");
  const [vidrio, setVidrioState] = useState(false);
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const userIdRef = useRef<string | null>(null);

  // On mount: get user ID, then load their specific preferences
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;
      const pref = readUserPref(user.id);
      setModeState(pref.mode);
      setColorState(pref.color);
      setVidrioState(pref.vidrio);
      const r = applyToDOM(pref.mode, pref.color, pref.vidrio);
      setResolved(r);
      writeUserPref(user.id, pref.mode, pref.color, pref.vidrio);
    });
  }, []);

  // Re-apply when mode, color, or vidrio changes
  useEffect(() => {
    const r = applyToDOM(mode, color, vidrio);
    setResolved(r);
  }, [mode, color, vidrio]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = applyToDOM("auto", color, vidrio);
      setResolved(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, color, vidrio]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    if (userIdRef.current) writeUserPref(userIdRef.current, m, color, vidrio);
  }, [color, vidrio]);

  const setColor = useCallback((c: ThemeColor) => {
    setColorState(c);
    if (userIdRef.current) writeUserPref(userIdRef.current, mode, c, vidrio);
  }, [mode, vidrio]);

  const setVidrio = useCallback((v: boolean) => {
    setVidrioState(v);
    if (userIdRef.current) writeUserPref(userIdRef.current, mode, color, v);
  }, [mode, color]);

  return (
    <ThemeContext.Provider value={{ mode, color, vidrio, resolved, setMode, setColor, setVidrio }}>
      {children}
    </ThemeContext.Provider>
  );
}
