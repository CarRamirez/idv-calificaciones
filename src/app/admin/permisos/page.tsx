"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  Shield,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Home,
  PenLine,
  TrendingUp,
  BookOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Layers,
  BookMarked,
  GraduationCap,
  Link2,
  UserCog,
  Contact,
  Briefcase,
  Award,
  Users,
  Clock,
  ShieldCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";
import {
  PERFILES,
  SECCIONES,
  CONFIGURABLES,
  ROL_NOMBRE,
  ROL_COLOR,
  type Rol,
  type Cambios,
  calcularPermisos,
} from "@/lib/roles";

/* ── Iconos por módulo ── */
const ICON_MAP: Record<string, LucideIcon> = {
  inicio: Home,
  captura: PenLine,
  avance: TrendingUp,
  boleta: BookOpen,
  concentrado: ClipboardList,
  reportes: BarChart3,
  periodos: Calendar,
  lista: Layers,
  materias: BookMarked,
  profesores: GraduationCap,
  asignar: Link2,
  alumnos: UserCog,
  directorio: Contact,
  servicios_escolares: Briefcase,
  ciclo: Award,
  usuarios: Users,
  sesiones: Clock,
  auditoria: ClipboardList,
  permisos: ShieldCheck,
};

/* ── Color map (SIGEFCP-style) ── */
const COLOR: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  admin:      { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500" },
  direccion:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  secretaria: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500" },
  visor:      { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500" },
};

/* ── Toggle ── */
function Toggle({
  checked,
  onChange,
  disabled,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  color?: string;
}) {
  const activeBg = color || "bg-blue-600";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? activeBg : "bg-slate-300 dark:bg-slate-600"}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}
        `}
      />
    </button>
  );
}

/* ── Types ── */
interface Profile {
  full_name: string;
  role: string;
}

/* ── Main ── */
export default function PermisosPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cambios, setCambios] = useState<Cambios>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "error" } | null>(null);
  const [previewRol, setPreviewRol] = useState<Rol | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "error" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ── Load ── */
  useEffect(() => {
    async function init() {
      const profRes = await fetch("/api/auth/effective-profile").then((r) => r.json()).catch(() => null);
      if (profRes?.full_name) setProfile(profRes);

      const res = await fetch("/api/admin/permisos");
      if (res.ok) {
        const data = await res.json();
        // Convert permisos_rol rows to Cambios map
        const c: Cambios = {};
        for (const p of data.permisos || []) {
          // Only process valid new roles
          if (PERFILES.includes(p.rol as Rol)) {
            c[`${p.rol}:${p.modulo}`] = p.habilitado;
          }
        }
        setCambios(c);
      }
      setLoading(false);
    }
    init();
  }, []);

  /* ── Computed permissions ── */
  const permisosEfectivos = calcularPermisos(cambios);

  function tieneAcceso(rol: Rol, modulo: string): boolean {
    const roles = permisosEfectivos.get(modulo);
    return roles ? roles.has(rol) : false;
  }

  /* ── Toggle handler ── */
  async function alternar(rol: Rol, modulo: string) {
    const key = `${rol}:${modulo}`;
    const actual = tieneAcceso(rol, modulo);
    const nuevo = !actual;

    setSaving(key);

    // Optimistic update
    setCambios((prev) => ({ ...prev, [key]: nuevo }));

    const res = await fetch("/api/admin/permisos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol, modulo, habilitado: nuevo }),
    });

    if (!res.ok) {
      showToast("Error al guardar", "error");
      setCambios((prev) => ({ ...prev, [key]: actual }));
    }
    setSaving(null);
  }

  /* ── Reset ── */
  async function restablecer() {
    if (!confirm("¿Restablecer todos los permisos a sus valores predeterminados?")) return;
    setLoading(true);
    const res = await fetch("/api/admin/permisos", { method: "DELETE" });
    if (res.ok) {
      setCambios({});
      showToast("Permisos restablecidos");
    } else {
      showToast("Error al restablecer", "error");
    }
    setLoading(false);
  }

  /* ── Count for a role ── */
  function countEnabled(rol: Rol): number {
    return CONFIGURABLES.filter((c) => tieneAcceso(rol, c.id)).length;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando permisos…</span>
      </div>
    );
  }

  return (
    <Navbar userName={profile?.full_name ?? ""} userRole={profile?.role ?? "superadmin"}>
      <main className="page-content animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Permisos</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configura el acceso de cada rol a los módulos del sistema
              </p>
            </div>
          </div>
          <button onClick={restablecer} className="btn-secondary text-sm flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in ${
              toast.type === "ok"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <Check className="w-4 h-4" />
            {toast.msg}
          </div>
        )}

        {/* Info banner */}
        <div className="card !p-3 mb-6 bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Superadmin</strong> siempre tiene acceso total y no aparece en esta tabla.
            Los cambios se aplican en tiempo real.
          </p>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[280px]">
                  Módulo
                </th>
                {PERFILES.map((r) => {
                  const c = COLOR[r] || COLOR.visor;
                  return (
                    <th key={r} className="text-center px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${c.bg} ${c.text}`}>
                          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                          {ROL_NOMBRE[r]}
                        </span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {countEnabled(r)}/{CONFIGURABLES.length}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SECCIONES.map((seccion) => {
                const mods = seccion.rutas.filter((r) => r.id !== "permisos");
                if (mods.length === 0) return null;
                return (
                  <Fragment key={seccion.titulo}>
                    <tr>
                      <td
                        colSpan={PERFILES.length + 1}
                        className="bg-slate-100/60 dark:bg-slate-800/30 px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700"
                      >
                        {seccion.titulo}
                      </td>
                    </tr>
                    {mods.map((mod) => {
                      const Icon = ICON_MAP[mod.id] || FileText;
                      return (
                        <tr
                          key={mod.id}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{mod.label}</p>
                                {mod.desc && (
                                  <p className="text-[10px] text-slate-400 leading-tight">{mod.desc}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {PERFILES.map((r) => {
                            const on = tieneAcceso(r, mod.id);
                            const key = `${r}:${mod.id}`;
                            const c = COLOR[r] || COLOR.visor;
                            return (
                              <td key={r} className="text-center px-4 py-2.5">
                                <div className="flex justify-center">
                                  <Toggle
                                    checked={on}
                                    onChange={() => alternar(r, mod.id)}
                                    disabled={saving === key}
                                    color={on ? c.dot : undefined}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden space-y-5">
          {SECCIONES.map((seccion) => {
            const mods = seccion.rutas.filter((r) => r.id !== "permisos");
            if (mods.length === 0) return null;
            return (
              <div key={seccion.titulo}>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {seccion.titulo}
                </h3>
                <div className="space-y-2">
                  {mods.map((mod) => {
                    const Icon = ICON_MAP[mod.id] || FileText;
                    return (
                      <div key={mod.id} className="card !p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{mod.label}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {PERFILES.map((r) => {
                            const on = tieneAcceso(r, mod.id);
                            const key = `${r}:${mod.id}`;
                            const c = COLOR[r] || COLOR.visor;
                            return (
                              <div key={r} className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                  {ROL_NOMBRE[r]}
                                </span>
                                <Toggle
                                  checked={on}
                                  onChange={() => alternar(r, mod.id)}
                                  disabled={saving === key}
                                  color={on ? c.dot : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Menu preview ── */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vista previa del menú
          </h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {PERFILES.map((r) => {
              const c = COLOR[r] || COLOR.visor;
              return (
                <button
                  key={r}
                  onClick={() => setPreviewRol(previewRol === r ? null : r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    previewRol === r
                      ? `${c.dot} text-white`
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {ROL_NOMBRE[r]}
                </button>
              );
            })}
          </div>
          {previewRol && (
            <div className="card !p-4 animate-fade-in">
              <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">
                Módulos visibles para {ROL_NOMBRE[previewRol]}
              </p>
              {SECCIONES.map((seccion) => {
                const mods = seccion.rutas.filter((r) => r.id !== "permisos");
                if (mods.length === 0) return null;
                return (
                  <div key={seccion.titulo} className="mb-4 last:mb-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {seccion.titulo}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {mods.map((mod) => {
                        const on = tieneAcceso(previewRol, mod.id);
                        const Icon = ICON_MAP[mod.id] || FileText;
                        return (
                          <div
                            key={mod.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              on
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700 line-through"
                            }`}
                          >
                            {on ? (
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 shrink-0" />
                            )}
                            {mod.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </Navbar>
  );
}
