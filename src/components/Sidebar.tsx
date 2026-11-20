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
  ShieldCheck,
  Calendar,
  Clock,
  Contact,
  Briefcase,
  X,
  ChevronsLeft,
  ChevronsRight,
  Award,
  Link2,
  type LucideIcon,
} from "lucide-react";
import { SECCIONES } from "@/lib/roles";

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

type Props = {
  userRole: string;
  permissions: string[];
  colapsado: boolean;
  drawer?: boolean;
  onCerrar?: () => void;
  onAlternar?: () => void;
};

/* ── Construir secciones dinámicamente desde permisos ── */
function buildSecciones(userRole: string, permissions: string[]) {
  const secciones: { titulo: string; items: { label: string; href: string; icon: LucideIcon; id: string }[] }[] = [];

  // GENERAL siempre
  secciones.push({
    titulo: "GENERAL",
    items: [{ label: "Inicio", href: "/dashboard", icon: Home, id: "inicio" }],
  });

  for (const seccion of SECCIONES) {
    const items = seccion.rutas
      .filter((r) => {
        if (userRole === "superadmin") return true;
        return permissions.includes(r.id);
      })
      .map((r) => ({
        label: r.label,
        href: r.href,
        icon: ICON_MAP[r.id] || FileText,
        id: r.id,
      }));

    if (items.length > 0) {
      secciones.push({ titulo: seccion.titulo.toUpperCase(), items });
    }
  }

  return secciones;
}

/* ── Componente ── */
export default function Sidebar({ userRole, permissions, colapsado, drawer = false, onCerrar, onAlternar }: Props) {
  const ruta = usePathname();
  const [tip, setTip] = useState<{ texto: string; top: number; left: number } | null>(null);

  const secciones = buildSecciones(userRole, permissions);

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
        {secciones.map((s, i) => (
          <div key={s.titulo} className={i ? "mt-4" : ""}>
            <p className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${soloExpandido}`}>
              {s.titulo}
            </p>
            {!drawer && i > 0 && (
              <div className={`mx-3 mb-2 h-px bg-white/10 ${colapsado ? "" : "lg:hidden"}`} aria-hidden />
            )}
            <ul className="space-y-0.5">
              {s.items.map((it) => {
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
                            ? "bg-primary-600 text-white shadow-sm before:absolute before:-left-2.5 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-r before:bg-white"
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
        ))}
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
        <p className={`px-3 pt-2 text-center text-[10px] leading-tight text-slate-500 ${soloExpandido}`}>
          © {new Date().getFullYear()} RCom<br />
          I.S.C. Roberto Carlos Ramírez Sánchez
        </p>
        {(colapsado && !drawer) && (
          <p
            className="hidden lg:block px-1 pt-2 text-center text-[9px] leading-tight text-slate-500"
            title="© RCom - I.S.C. Roberto Carlos Ramírez Sánchez"
          >
            © RCom
          </p>
        )}
      </div>
    </div>
  );
}
