"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Types ── */
type Res = {
  tipo: "alumno" | "profesor" | "grupo" | "materia";
  titulo: string;
  detalle: string;
  href: string;
};

const TITULO: Record<string, string> = {
  alumno: "Alumnos",
  profesor: "Personal",
  grupo: "Grupos",
  materia: "Materias",
};

const ICONO_SVG: Record<string, JSX.Element> = {
  alumno: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  ),
  profesor: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  ),
  grupo: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  materia: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  directora_anita: "Dirección",
  teacher: "Profesor",
  viewer: "Consulta",
};

/* ── Index types & cache ── */
type Indice = {
  verBoleta: boolean;
  role: string;
  grupos: [number, number, string][]; // [id, grade, letter]
  alumnos: [string, number, string, number, number, string][]; // [id, group_id, full_name, list_num, baja, control_number]
  profesores: [string, string, string, string][]; // [id, full_name, role, label]
  materias: [number, string, number][]; // [id, name, grade]
  _txt?: string[];
};

const VIGENCIA = 5 * 60_000;
let cache: { datos: Indice; t: number } | null = null;
let pendiente: Promise<Indice> | null = null;

/** Mayúsculas y sin acentos */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

function cargarIndice(): Promise<Indice> {
  if (cache && Date.now() - cache.t < VIGENCIA) return Promise.resolve(cache.datos);
  pendiente ??= fetch("/api/search/indice")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<Indice>;
    })
    .then((d) => {
      d._txt = d.alumnos.map((a) => norm(`${a[2]} ${a[5]}`));
      cache = { datos: d, t: Date.now() };
      return d;
    })
    .finally(() => {
      pendiente = null;
    });
  return pendiente;
}

function buscar(ix: Indice, q: string): Res[] {
  const out: Res[] = [];
  const gMap = new Map(ix.grupos.map((g) => [g[0], g]));

  // Grupos: "2a", "2°A", "2 a", "2-A"
  const mg = q
    .trim()
    .toUpperCase()
    .match(/^([1-3])\s*[°º\-]?\s*([A-L])$/);
  if (mg)
    ix.grupos
      .filter((g) => g[1] === Number(mg[1]) && g[2] === mg[2])
      .forEach((g) =>
        out.push({
          tipo: "grupo",
          titulo: `${g[1]}°${g[2]}`,
          detalle: "Ver concentrado",
          href: `/concentrados?grupo=${g[0]}`,
        })
      );

  const palabras = norm(q)
    .replace(/[^A-Z0-9Ñ\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 2)
    .slice(0, 5);
  if (!palabras.length) return out;
  const coincide = (txt: string) => palabras.every((p) => txt.includes(p));

  // Alumnos
  const txt = ix._txt ?? [];
  const hallados: { i: number; peso: number }[] = [];
  for (let i = 0; i < ix.alumnos.length; i++) {
    if (!coincide(txt[i])) continue;
    const a = ix.alumnos[i];
    const peso = (txt[i].startsWith(palabras[0]) ? 0 : 1) + a[4] * 2;
    hallados.push({ i, peso });
  }
  hallados.sort((x, y) => x.peso - y.peso || txt[x.i].localeCompare(txt[y.i]));
  hallados.slice(0, 8).forEach(({ i }) => {
    const [id, grupoId, fullName, listNum, baja, nc] = ix.alumnos[i];
    const g = gMap.get(grupoId);
    if (!g) return;
    out.push({
      tipo: "alumno",
      titulo: fullName,
      detalle: `${g[1]}°${g[2]} · #${listNum}${baja ? " · baja" : ""}${nc ? ` · N° ${nc}` : ""}`,
      href: ix.verBoleta ? `/boleta/${id}` : `/concentrados?grupo=${grupoId}`,
    });
  });

  // Profesores
  ix.profesores
    .filter((p) => coincide(norm(p[1])))
    .slice(0, 5)
    .forEach((p) =>
      out.push({
        tipo: "profesor",
        titulo: p[1],
        detalle: ROLE_LABELS[p[2]] ?? p[3] ?? p[2],
        href: `/perfil/${p[0]}`,
      })
    );

  // Materias
  ix.materias
    .filter((m) => coincide(norm(m[1])))
    .slice(0, 4)
    .forEach((m) =>
      out.push({
        tipo: "materia",
        titulo: m[1],
        detalle: `Se imparte en ${m[2]}° grado`,
        href: `/dashboard`,
      })
    );

  return out;
}

/* ── Component ── */
export default function Buscador() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Click outside
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setAbierto(true);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  // Preload index
  const [indice, setIndice] = useState<Indice | null>(cache?.datos ?? null);
  useEffect(() => {
    const t = setTimeout(() => cargarIndice().then(setIndice).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, []);

  // Search
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes([]);
      return;
    }
    if (!indice) {
      setCargando(true);
      cargarIndice()
        .then((d) => {
          setIndice(d);
          setCargando(false);
        })
        .catch(() => setCargando(false));
      return;
    }
    setRes(buscar(indice, q));
    setSel(0);
    setCargando(false);
  }, [q, indice]);

  function ir(r: Res) {
    setAbierto(false);
    setQ("");
    setRes([]);
    router.push(r.href);
  }

  const tipos = (["grupo", "alumno", "profesor", "materia"] as const).filter((t) =>
    res.some((r) => r.tipo === t)
  );
  const ordenados = tipos.flatMap((t) => res.filter((r) => r.tipo === t));

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={input}
        value={q}
        placeholder="Buscar alumnos, grupos, materias..."
        aria-label="Buscar en el sistema"
        type="search"
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => {
          setAbierto(true);
          cargarIndice().then(setIndice).catch(() => {});
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, ordenados.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          }
          if (e.key === "Enter" && ordenados[sel]) ir(ordenados[sel]);
          if (e.key === "Escape") {
            setAbierto(false);
            input.current?.blur();
          }
        }}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:shadow-glow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-primary-500 dark:focus:bg-slate-900"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-block rounded border border-slate-200 dark:border-slate-700 px-1.5 text-[10px] font-medium text-slate-400">
        ⌘K
      </kbd>

      {abierto && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] sm:min-w-[320px] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 shadow-float animate-slide-down">
          {cargando && !res.length && (
            <p className="p-3 text-sm text-slate-400">Buscando...</p>
          )}
          {!cargando && !res.length && (
            <p className="p-3 text-sm text-slate-400">
              Sin resultados para &ldquo;{q}&rdquo;.
            </p>
          )}
          {tipos.map((t) => (
            <div key={t} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {TITULO[t]}
              </p>
              {res
                .filter((r) => r.tipo === t)
                .map((r) => {
                  const i = ordenados.indexOf(r);
                  return (
                    <button
                      key={r.href + r.titulo}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => ir(r)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                        i === sel
                          ? "bg-primary-50 dark:bg-primary-500/15"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {ICONO_SVG[r.tipo]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {r.titulo}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {r.detalle}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
