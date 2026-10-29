"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  PenLine,
  TrendingUp,
  FileText,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  GraduationCap,
  UserCog,
  Layers,
  BookMarked,
  Shield,
  Calendar,
  Clock,
  Contact,
  Briefcase,
  X,
  ChevronsLeft,
  ChevronsRight,
  Award,
  type LucideIcon,
} from "lucide-react";

/* ── Tipos ── */
type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: string | string[]; // permiso requerido (string = uno, array = cualquiera)
  roleOnly?: string;        // solo si userRole NO es este valor
};

type NavSection = {
  titulo: string;
  items: NavItem[];
};

type Props = {
  userRole: string;
  permissions: string[];
  colapsado: boolean;
  drawer?: boolean;
  onCerrar?: () => void;
  onAlternar?: () => void;
};

/* ── Secciones del menú ── */
function buildSecciones(userRole: string): NavSection[] {
  const isAdmin = ["admin", "directora_anita"].includes(userRole);

  const secciones: NavSection[] = [
    {
      titulo: "GENERAL",
      items: [
        { label: "Inicio", href: "/dashboard", icon: Home },
      ],
    },
    {
      titulo: "CALIFICACIONES",
      items: [
        { label: "Captura", href: "/captura", icon: PenLine, perm: ["calificaciones", "captura"] },
        { label: "Avance", href: "/avance", icon: TrendingUp, perm: "captura" },
        { label: "Calificaciones", href: "/calificaciones", icon: FileText, perm: ["calificaciones", "captura"] },
        { label: "Boletas", href: "/boleta", icon: BookOpen, perm: "boleta", roleOnly: "teacher" },
        { label: "Concentrados", href: "/concentrados", icon: ClipboardList, perm: "concentrado" },
        { label: "Rendimiento", href: "/rendimiento", icon: BarChart3, perm: "rendimiento" },
      ],
    },
  ];

  if (isAdmin) {
    secciones.push({
      titulo: "ESCUELA",
      items: [
        { label: "Usuarios", href: "/usuarios", icon: Users, perm: ["admin_profesores", "admin_alumnos"] },
        { label: "Profesores", href: "/admin/profesores", icon: GraduationCap, perm: "admin_profesores" },
        { label: "Alumnos", href: "/admin/alumnos", icon: UserCog, perm: "admin_alumnos" },
        { label: "Grupos", href: "/lista", icon: Layers, perm: "admin_grupos" },
        { label: "Materias", href: "/admin/materias", icon: BookMarked, perm: "admin_materias" },
        { label: "Directorio", href: "/directorio", icon: Contact },
        { label: "Servicios Escolares", href: "/servicios-escolares", icon: Briefcase },
      ],
    });
    secciones.push({
      titulo: "ADMINISTRACIÓN",
      items: [
        { label: "Periodos", href: "/periodos", icon: Calendar, perm: "periodos" },
        { label: "Horario", href: "/horario", icon: Clock },
        { label: "Ciclo Escolar", href: "/admin/ciclo", icon: Award },
        { label: "Roles", href: "/admin/roles", icon: Shield, perm: "admin_roles" },
        { label: "Sesiones", href: "/admin/sesiones", icon: Clock, perm: "admin_sesiones" },
        { label: "Auditoría", href: "/admin/auditoria", icon: ClipboardList, perm: "admin_sesiones" },
        { label: "Tareas", href: "/tareas", icon: ClipboardList },
      ],
    });
  } else {
    // Profesor / viewer
    const escuela: NavItem[] = [
      { label: "Directorio", href: "/directorio", icon: Contact },
      { label: "Horario", href: "/horario", icon: Clock },
      { label: "Servicios Escolares", href: "/servicios-escolares", icon: Briefcase },
    ];
    if (escuela.length) {
      secciones.push({ titulo: "ESCUELA", items: escuela });
    }
  }

  return secciones;
}

/* ── Componente ── */
export default function Sidebar({ userRole, permissions, colapsado, drawer = false, onCerrar, onAlternar }: Props) {
  const ruta = usePathname();
  const [tip, setTip] = useState<{ texto: string; top: number; left: number } | null>(null);

  const secciones = buildSecciones(userRole);

  const can = (perm: string) => permissions.includes(perm);
  const canAny = (...perms: string[]) => perms.some((p) => permissions.includes(p));

  const mostrar = (el: HTMLElement, texto: string) => {
    if (drawer) return;
    const soloIconos = colapsado || !window.matchMedia("(min-width: 1024px)").matches;
    if (!soloIconos) return;
    const r = el.getBoundingClientRect();
    setTip({ texto, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const ocultar = () => setTip(null);

  const etiqueta = drawer ? "" : colapsado ? "sr-only" : "sr-only lg:not-sr-only";
  const soloExpandido = drawer ? "" : colapsado ? "hidden" : "hidden lg:block";

  const activo = (href: string) => {
    if (href === "/dashboard") return ruta === "/dashboard";
    return ruta === href || ruta.startsWith(href + "/");
  };

  const visible = (item: NavItem): boolean => {
    if (item.roleOnly && userRole === item.roleOnly) return false;
    if (!item.perm) return true;
    if (Array.isArray(item.perm)) return canAny(...item.perm);
    return can(item.perm);
  };

  return (
    <div className="sidebar-fondo flex h-full w-full flex-col text-slate-200">
      {/* Encabezado */}
      <div
        className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 ${
          drawer ? "px-4" : colapsado ? "justify-center" : "justify-center lg:justify-start lg:px-4"
        }`}
      >
        <Image
          src="/logo-idv.png"
          alt="Instituto Don Vasco"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        <div className={`min-w-0 leading-tight ${soloExpandido}`}>
          <p className="text-base font-extrabold tracking-tight text-white">Mnemósine</p>
          <p className="truncate text-[11px] text-slate-300">Instituto Don Vasco</p>
        </div>
        {drawer && (
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav
        aria-label="Menú principal"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 [scrollbar-width:thin]"
      >
        {secciones.map((s, i) => {
          const itemsVisibles = s.items.filter(visible);
          if (!itemsVisibles.length) return null;

          return (
            <div key={s.titulo} className={i ? "mt-4" : ""}>
              <p className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${soloExpandido}`}>
                {s.titulo}
              </p>
              {!drawer && i > 0 && (
                <div className={`mx-3 mb-2 h-px bg-white/10 ${colapsado ? "" : "lg:hidden"}`} aria-hidden />
              )}
              <ul className="space-y-0.5">
                {itemsVisibles.map((it) => {
                  const Icono = it.icon;
                  const on = activo(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        prefetch={false}
                        href={it.href}
                        onClick={onCerrar}
                        aria-current={on ? "page" : undefined}
                        aria-label={it.label}
                        onMouseEnter={(e) => mostrar(e.currentTarget, it.label)}
                        onMouseLeave={ocultar}
                        onFocus={(e) => mostrar(e.currentTarget, it.label)}
                        onBlur={ocultar}
                        className={`group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium outline-none transition
                          focus-visible:ring-2 focus-visible:ring-white/70
                          ${drawer ? "" : colapsado ? "justify-center" : "justify-center lg:justify-start"}
                          ${
                            on
                              ? "bg-white/20 text-white shadow-sm before:absolute before:-left-2.5 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-r before:bg-white"
                              : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                          }`}
                      >
                        <Icono size={19} className="shrink-0" aria-hidden />
                        <span className={`truncate ${etiqueta}`}>{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {tip && (
        <span
          role="tooltip"
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-float dark:bg-slate-700"
        >
          {tip.texto}
        </span>
      )}

      {/* Pie */}
      <div className="shrink-0 space-y-1 border-t border-white/10 p-2.5">
        <p className={`px-3 pb-1 text-[11px] text-slate-400 ${soloExpandido}`}>
          Ciclo escolar 2026–2027
        </p>
        {!drawer && (
          <button
            onClick={onAlternar}
            aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
            title={colapsado ? "Expandir menú" : "Contraer menú"}
            className={`hidden min-h-[40px] w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-400 hover:bg-white/[0.08] hover:text-white lg:flex ${
              colapsado ? "justify-center" : ""
            }`}
          >
            {colapsado ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> Contraer menú</>}
          </button>
        )}
      </div>
    </div>
  );
}
