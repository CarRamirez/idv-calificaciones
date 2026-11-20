/**
 * src/lib/roles.ts
 *
 * Sistema de roles y permisos de Mnemósine.
 * Basado en SIGEFCP — adaptado para Instituto Don Vasco (sin turno).
 *
 * Roles: superadmin | admin | direccion | profesor | secretaria | visor
 */

/* ── Tipos ── */
export type Rol = "superadmin" | "admin" | "direccion" | "profesor" | "secretaria" | "visor";

export const ROLES: Rol[] = ["superadmin", "admin", "direccion", "profesor", "secretaria", "visor"];

/** Roles que pueden configurarse en la pantalla de permisos (no incluye superadmin) */
export const PERFILES: Rol[] = ["admin", "direccion", "profesor", "secretaria", "visor"];

export const ROL_NOMBRE: Record<Rol, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  direccion: "Dirección",
  profesor: "Profesor",
  secretaria: "Secretaría",
  visor: "Visor",
};

export const ROL_COLOR: Record<Rol, { bg: string; text: string; dark_bg: string; dark_text: string }> = {
  superadmin: { bg: "bg-violet-100", text: "text-violet-700", dark_bg: "dark:bg-violet-900/40", dark_text: "dark:text-violet-300" },
  admin: { bg: "bg-blue-100", text: "text-blue-700", dark_bg: "dark:bg-blue-900/40", dark_text: "dark:text-blue-300" },
  direccion: { bg: "bg-emerald-100", text: "text-emerald-700", dark_bg: "dark:bg-emerald-900/40", dark_text: "dark:text-emerald-300" },
  profesor: { bg: "bg-teal-100", text: "text-teal-700", dark_bg: "dark:bg-teal-900/40", dark_text: "dark:text-teal-300" },
  secretaria: { bg: "bg-amber-100", text: "text-amber-700", dark_bg: "dark:bg-amber-900/40", dark_text: "dark:text-amber-300" },
  visor: { bg: "bg-sky-100", text: "text-sky-700", dark_bg: "dark:bg-sky-900/40", dark_text: "dark:text-sky-300" },
};

/* ── Rutas (módulos del sistema) ── */
export interface Ruta {
  id: string;        // clave del módulo en permisos
  href: string;
  label: string;
  desc?: string;
  roles: Rol[];      // roles que tienen acceso por defecto
}

export interface Seccion {
  titulo: string;
  rutas: Ruta[];
}

/**
 * Definición completa de módulos.
 * `roles` = quién tiene acceso POR DEFECTO (superadmin siempre tiene acceso a todo).
 */
export const SECCIONES: Seccion[] = [
  {
    titulo: "Calificaciones",
    rutas: [
      { id: "captura",       href: "/captura",       label: "Captura",       desc: "Captura de calificaciones",    roles: ["admin", "direccion", "profesor", "secretaria"] },
      { id: "avance",        href: "/avance",        label: "Avance",        desc: "Avance de captura",            roles: ["admin", "direccion"] },
      { id: "boleta",        href: "/boleta",        label: "Boletas",       desc: "Boletas de calificaciones",    roles: ["admin", "direccion", "profesor", "secretaria", "visor"] },
      { id: "concentrado",   href: "/concentrados",  label: "Concentrados",  desc: "Concentrados de grupo",        roles: ["admin", "direccion", "profesor", "secretaria", "visor"] },
      { id: "reportes",      href: "/rendimiento",   label: "Reportes",      desc: "Reportes de rendimiento",      roles: ["admin", "direccion", "profesor", "visor"] },
      { id: "periodos",      href: "/periodos",      label: "Periodos",      desc: "Gestión de periodos",          roles: ["admin", "direccion"] },
    ],
  },
  {
    titulo: "Escuela",
    rutas: [
      { id: "lista",         href: "/lista",                 label: "Grupos",              desc: "Lista de grupos",                roles: ["admin", "direccion"] },
      { id: "materias",      href: "/admin/materias",        label: "Materias",            desc: "Catálogo de materias",           roles: ["admin", "direccion"] },
      { id: "profesores",    href: "/admin/profesores",      label: "Profesores",          desc: "Catálogo de profesores",         roles: ["admin", "direccion"] },
      { id: "asignar",       href: "/asignar",               label: "Asignar",             desc: "Asignar materias a profesores",  roles: ["admin", "direccion"] },
      { id: "alumnos",       href: "/admin/alumnos",         label: "Alumnos",             desc: "Gestión de alumnos",             roles: ["admin", "direccion", "secretaria"] },
      { id: "directorio",    href: "/directorio",            label: "Directorio",          desc: "Directorio escolar",             roles: ["admin", "direccion", "profesor", "secretaria", "visor"] },
      { id: "servicios_escolares", href: "/servicios-escolares", label: "Servicios Escolares", desc: "Servicios escolares",        roles: ["admin", "direccion", "secretaria"] },
    ],
  },
  {
    titulo: "Administración",
    rutas: [
      { id: "ciclo",         href: "/admin/ciclo",           label: "Ciclo Escolar",       desc: "Gestión del ciclo escolar",      roles: ["admin"] },
      { id: "usuarios",      href: "/usuarios",              label: "Usuarios",            desc: "Gestión de usuarios",            roles: ["admin"] },
      { id: "sesiones",      href: "/admin/sesiones",        label: "Sesiones",            desc: "Sesiones activas",               roles: ["admin"] },
      { id: "auditoria",     href: "/admin/auditoria",       label: "Auditoría",           desc: "Registro de actividad",          roles: ["admin"] },
      { id: "permisos",      href: "/admin/permisos",        label: "Permisos",            desc: "Gestión de permisos",            roles: ["admin"] },
    ],
  },
];

/** Módulos fijos (no configurables): inicio y permisos */
const FIJOS = new Set(["inicio", "permisos"]);

/** Todos los módulos configurables (pueden togglarse por rol) */
export const CONFIGURABLES: { id: string; label: string; seccion: string }[] = SECCIONES.flatMap((s) =>
  s.rutas.filter((r) => !FIJOS.has(r.id)).map((r) => ({ id: r.id, label: r.label, seccion: s.titulo }))
);

/** Mapa rápido de id → Ruta */
const RUTA_MAP = new Map<string, Ruta>();
for (const s of SECCIONES) for (const r of s.rutas) RUTA_MAP.set(r.id, r);

/* ── Cálculo de permisos efectivos ── */

/**
 * Dado un conjunto de cambios (overrides guardados en permisos_rol),
 * calcula los permisos efectivos para cada módulo × rol.
 *
 * Cambios = Map<`${rol}:${modulo}`, boolean>
 * Retorna = Map<modulo, Set<Rol>>  (qué roles tienen acceso a cada módulo)
 */
export type Cambios = Record<string, boolean>; // `${rol}:${modulo}` → habilitado

export function calcularPermisos(cambios: Cambios): Map<string, Set<Rol>> {
  const permisos = new Map<string, Set<Rol>>();

  for (const s of SECCIONES) {
    for (const ruta of s.rutas) {
      const rolesConAcceso = new Set<Rol>();
      // superadmin siempre tiene acceso
      rolesConAcceso.add("superadmin");

      for (const rol of PERFILES) {
        const key = `${rol}:${ruta.id}`;
        if (key in cambios) {
          // Override guardado
          if (cambios[key]) rolesConAcceso.add(rol);
        } else {
          // Default
          if (ruta.roles.includes(rol)) rolesConAcceso.add(rol);
        }
      }
      permisos.set(ruta.id, rolesConAcceso);
    }
  }

  return permisos;
}

/**
 * Genera la lista de permisos (strings) para un rol dado,
 * dada la tabla de cambios.
 */
export function permisosParaRol(rol: string, cambios: Cambios): string[] {
  const permisos = calcularPermisos(cambios);
  const result: string[] = ["inicio"]; // siempre tiene inicio

  for (const [modulo, roles] of Array.from(permisos)) {
    if (roles.has(rol as Rol)) {
      result.push(modulo);
    }
  }

  // superadmin siempre tiene permisos
  if (rol === "superadmin") {
    result.push("permisos");
  }

  return result;
}

/**
 * Verifica si un rol puede acceder a un módulo.
 */
export function tieneAcceso(rol: string, modulo: string, cambios: Cambios = {}): boolean {
  if (rol === "superadmin") return true;
  if (modulo === "inicio") return true;
  if (modulo === "permisos") return rol === "admin" || rol === "superadmin";

  const ruta = RUTA_MAP.get(modulo);
  if (!ruta) return false;

  const key = `${rol}:${modulo}`;
  if (key in cambios) return cambios[key];
  return ruta.roles.includes(rol as Rol);
}

/** Roles con acceso a funciones administrativas */
export const ADMIN_ROLES: Rol[] = ["superadmin", "admin"];

/** ¿Es un rol administrativo? */
export function esAdmin(rol: string): boolean {
  return ADMIN_ROLES.includes(rol as Rol);
}

/**
 * Construye las secciones del menú lateral para un rol dado.
 */
export function menuLateral(
  rol: string,
  permisos: string[]
): { titulo: string; items: { id: string; href: string; label: string }[] }[] {
  const result: { titulo: string; items: { id: string; href: string; label: string }[] }[] = [];

  // GENERAL siempre visible
  result.push({
    titulo: "GENERAL",
    items: [{ id: "inicio", href: "/dashboard", label: "Inicio" }],
  });

  for (const seccion of SECCIONES) {
    const items = seccion.rutas
      .filter((r) => permisos.includes(r.id))
      .map((r) => ({ id: r.id, href: r.href, label: r.label }));

    if (items.length > 0) {
      result.push({ titulo: seccion.titulo.toUpperCase(), items });
    }
  }

  return result;
}
