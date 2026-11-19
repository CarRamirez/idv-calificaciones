"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Parallax ligero. Escribe en el contenedor:
 *   --px, --py  posición del puntero (-1…1) con suavizado (lerp)
 *   --sy        cuánto se ha desplazado el contenedor hacia arriba (px)
 * Las capas hijas con data-profundidad="1…4" se mueven según esos valores (ver globals.css).
 * No hace nada con "reducir movimiento"; en celular solo usa el scroll.
 */
export default function Parallax({ children, className, puntero = true, scroll = true }: {
  children: ReactNode; className?: string; puntero?: boolean; scroll?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const conPuntero = puntero && matchMedia("(pointer: fine)").matches;

    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const cuadro = () => {
      raf = 0;
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      if (scroll) el.style.setProperty("--sy", String(Math.round(Math.max(0, -el.getBoundingClientRect().top))));
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) pedir();
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(cuadro); };

    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      pedir();
    };
    const salir = () => { tx = 0; ty = 0; pedir(); };

    if (conPuntero) { el.addEventListener("pointermove", mover); el.addEventListener("pointerleave", salir); }
    if (scroll) { addEventListener("scroll", pedir, { passive: true, capture: true }); pedir(); }
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
      removeEventListener("scroll", pedir, { capture: true });
    };
  }, [puntero, scroll]);

  return <div ref={ref} className={className}>{children}</div>;
}

/** Publica el scroll de la página en --scroll-y (html) para el fondo del estilo vidrio. */
export function ScrollGlobal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const raiz = document.documentElement;
    let raf = 0;
    const cuadro = () => { raf = 0; raiz.style.setProperty("--scroll-y", String(Math.round(scrollY))); };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(cuadro); };
    addEventListener("scroll", pedir, { passive: true });
    pedir();
    return () => { cancelAnimationFrame(raf); removeEventListener("scroll", pedir); };
  }, []);
  return null;
}
