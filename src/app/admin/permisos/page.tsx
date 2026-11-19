"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  Shield,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

/* ───── types ───── */
interface Permiso {
  id: string;
  rol: string;
  modulo: string;
  habilitado: boolean;
}

interface Profile {
  full_name: string;
  role: string;
}

/* ───── constants ───── */
const ROLES = ["directora_anita", "teacher", "viewer"] as const;
const ROLE_LABELS: Record<string, string> = {
  directora_anita: "Dirección",
  teacher: "Profesor",
  viewer: "Visor",
};

interface ModuloDef {
  clave: string;
  label: string;
  seccion: string;
}

const SECCIONES = [
  "Calificaciones",
  "Escuela",
  "Administración",
];

const MODULOS: ModuloDef[] = [
  // Calificaciones
  { clave: "dashboard", label: "Panel de inicio", seccion: "Calificaciones" },
  { clave: "captura", label: "Captura de calificaciones", seccion: "Calificaciones" },
  { clave: "boleta", label: "Boletas", seccion: "Calificaciones" },
  { clave: "concentrado", label: "Concentrado", seccion: "Calificaciones" },
  { clave: "avance", label: "Avance académico", seccion: "Calificaciones" },
  { clave: "reportes", label: "Reportes", seccion: "Calificaciones" },
  { clave: "periodos", label: "Periodos", seccion: "Calificaciones" },
  // Escuela
  { clave: "lista", label: "Grupos", seccion: "Escuela" },
  { clave: "alumnos", label: "Alumnos", seccion: "Escuela" },
  { clave: "materias", label: "Materias", seccion: "Escuela" },
  { clave: "profesores", label: "Profesores", seccion: "Escuela" },
  { clave: "asignar", label: "Asignar", seccion: "Escuela" },
  { clave: "directorio", label: "Directorio", seccion: "Escuela" },
  { clave: "servicios_escolares", label: "Servicios Escolares", seccion: "Escuela" },
  // Administración
  { clave: "ciclo", label: "Ciclo Escolar", seccion: "Administración" },
  { clave: "usuarios", label: "Usuarios", seccion: "Administración" },
  { clave: "roles", label: "Roles", seccion: "Administración" },
  { clave: "sesiones", label: "Sesiones", seccion: "Administración" },
  { clave: "auditoria", label: "Auditoría", seccion: "Administración" },
];

/* ───── Toggle component ───── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
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
        ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}
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

/* ───── Main page ───── */
export default function PermisosPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [effectiveProfile, setEffectiveProfile] = useState<Profile | null>(null);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "error" } | null>(null);
  const [previewRol, setPreviewRol] = useState<string | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "error" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* load */
  useEffect(() => {
    fetch("/api/auth/effective-profile")
      .then((r) => r.json())
      .then((data) => { if (data.full_name) setEffectiveProfile(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      const profRes = await fetch("/api/auth/effective-profile").then((r) => r.json()).catch(() => null);
      if (profRes?.full_name) setProfile(profRes);
      const res = await fetch("/api/admin/permisos");
      if (res.ok) {
        const data = await res.json();
        setPermisos(data.permisos);
      }
      setLoading(false);
    }
    init();
  }, []);

  /* helpers */
  function getPermiso(rol: string, modulo: string): boolean {
    const p = permisos.find((x) => x.rol === rol && x.modulo === modulo);
    return p ? p.habilitado : false;
  }

  async function togglePermiso(rol: string, modulo: string, habilitado: boolean) {
    const key = `${rol}-${modulo}`;
    setSaving(key);

    // Optimistic update
    setPermisos((prev) => {
      const idx = prev.findIndex((x) => x.rol === rol && x.modulo === modulo);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], habilitado };
        return copy;
      }
      return [...prev, { id: "", rol, modulo, habilitado }];
    });

    const res = await fetch("/api/admin/permisos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol, modulo, habilitado }),
    });

    if (!res.ok) {
      showToast("Error al guardar", "error");
      // Revert
      setPermisos((prev) => {
        const idx = prev.findIndex((x) => x.rol === rol && x.modulo === modulo);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], habilitado: !habilitado };
          return copy;
        }
        return prev;
      });
    }
    setSaving(null);
  }

  async function resetDefaults() {
    if (!confirm("¿Restablecer todos los permisos a sus valores predeterminados?")) return;
    setLoading(true);
    const res = await fetch("/api/admin/permisos", { method: "DELETE" });
    if (res.ok) {
      const refetch = await fetch("/api/admin/permisos");
      if (refetch.ok) {
        const data = await refetch.json();
        setPermisos(data.permisos);
      }
      showToast("Permisos restablecidos");
    } else {
      showToast("Error al restablecer", "error");
    }
    setLoading(false);
  }

  /* count enabled for a role */
  function countEnabled(rol: string): number {
    return permisos.filter((p) => p.rol === rol && p.habilitado).length;
  }

  const displayProfile = effectiveProfile || profile;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-slate-500">Cargando permisos…</span>
      </div>
    );
  }

  return (
    <Navbar userName={displayProfile?.full_name ?? ""} userRole={displayProfile?.role ?? "admin"}>
      <main className="page-content animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Permisos</h1>
              <p className="text-sm text-slate-500">
                Gestiona el acceso de cada rol a los módulos del sistema
              </p>
            </div>
          </div>
          <button onClick={resetDefaults} className="btn-secondary text-sm flex items-center gap-1.5">
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
        <div className="card !p-3 mb-6 bg-blue-50/50 border-blue-100">
          <p className="text-xs text-blue-700">
            <strong>Admin</strong> siempre tiene acceso total. Los cambios se aplican en tiempo real.
          </p>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden md:block card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-[280px]">
                  Módulo
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3"
                  >
                    <div>{ROLE_LABELS[r]}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                      {countEnabled(r)}/{MODULOS.length} activos
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECCIONES.map((seccion) => {
                const mods = MODULOS.filter((m) => m.seccion === seccion);
                return (
                  <Fragment key={seccion}>
                    <tr>
                      <td
                        colSpan={ROLES.length + 1}
                        className="bg-slate-100/60 px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100"
                      >
                        {seccion}
                      </td>
                    </tr>
                    {mods.map((mod) => (
                      <tr
                        key={mod.clave}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">
                          {mod.label}
                        </td>
                        {ROLES.map((r) => {
                          const on = getPermiso(r, mod.clave);
                          const key = `${r}-${mod.clave}`;
                          return (
                            <td key={r} className="text-center px-4 py-2.5">
                              <div className="flex justify-center">
                                <Toggle
                                  checked={on}
                                  onChange={(v) => togglePermiso(r, mod.clave, v)}
                                  disabled={saving === key}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden space-y-4">
          {SECCIONES.map((seccion) => {
            const mods = MODULOS.filter((m) => m.seccion === seccion);
            return (
              <div key={seccion}>
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {seccion}
                </h3>
                <div className="space-y-2">
                  {mods.map((mod) => (
                    <div key={mod.clave} className="card !p-3">
                      <p className="text-sm font-semibold text-slate-700 mb-2">{mod.label}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {ROLES.map((r) => {
                          const on = getPermiso(r, mod.clave);
                          const key = `${r}-${mod.clave}`;
                          return (
                            <div key={r} className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-400">{ROLE_LABELS[r]}</span>
                              <Toggle
                                checked={on}
                                onChange={(v) => togglePermiso(r, mod.clave, v)}
                                disabled={saving === key}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Menu preview ── */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vista previa del menú
          </h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setPreviewRol(previewRol === r ? null : r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  previewRol === r
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          {previewRol && (
            <div className="card !p-4 animate-fade-in">
              <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-semibold">
                Módulos visibles para {ROLE_LABELS[previewRol]}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {MODULOS.map((mod) => {
                  const on = getPermiso(previewRol, mod.clave);
                  return (
                    <div
                      key={mod.clave}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        on
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-slate-50 text-slate-400 border border-slate-100 line-through"
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
          )}
        </div>
      </main>
    </Navbar>
  );
}

