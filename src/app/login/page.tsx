"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ESCUELA } from "@/lib/escuela";
import Parallax from "@/components/Parallax";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ver, setVer] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    // Sesión nueva: limpiar datos de sesión anterior
    try { localStorage.removeItem("sgf_limite_sesion"); } catch { /* sin almacenamiento */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    fetch("/api/auth/log-login", { method: "POST" }).catch(() => {});
    router.replace("/dashboard");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel institucional: parallax con el puntero */}
      <Parallax scroll={false} className="relative hidden overflow-hidden bg-primary-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Fotos de la escuela: se alternan con zoom lento */}
        <div data-profundidad="1" className="pointer-events-none absolute -inset-8">
          <Image src="/login/escuela-2.jpg" alt="" fill priority sizes="60vw" className="login-foto object-cover" />
          <Image src="/login/escuela-1.jpg" alt="" fill sizes="60vw" className="login-foto login-foto-alterna object-cover" />
        </div>
        {/* Velo de color del tema */}
        <div className="pointer-events-none absolute inset-0 login-velo" />
        {/* Barra tricolor mexicana */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-white to-red-500 opacity-90" />

        <p data-profundidad="2" className="entrada relative text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          Ciclo escolar 2026 – 2027
        </p>

        <div className="escalonado relative" style={{ "--offset": "120ms", "--paso": "90ms" } as React.CSSProperties}>
          <div data-profundidad="4" className="entrada-pop w-fit">
            <div className="inline-grid place-items-center rounded-[2rem] bg-white/95 p-5 shadow-float">
              <Image src="/logo-idv.png" alt="Escudo del Instituto Don Vasco" width={130} height={130} priority className="h-[130px] w-auto" />
            </div>
          </div>
          <h1 data-profundidad="3" className="mt-8 text-6xl font-extrabold tracking-tight">{ESCUELA.sistema}</h1>
          <p data-profundidad="2" className="mt-3 max-w-md text-xl font-semibold leading-snug text-white/95">
            {ESCUELA.nombre}
          </p>
          <p data-profundidad="2" className="mt-2 text-sm text-white/75">Sistema de calificaciones</p>
        </div>

        <div className="escalonado relative space-y-1.5 text-sm text-white/80" style={{ "--offset": "550ms" } as React.CSSProperties}>
          <p className="text-xs text-white/60">Camino, Verdad, Vida</p>
        </div>
      </Parallax>

      {/* Formulario */}
      <section className="flex justify-center px-6 pb-12 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          {/* Header móvil con parallax */}
          <Parallax puntero={false} className="relative -mx-6 mb-8 overflow-hidden rounded-b-3xl px-6 pb-7 pt-10 text-center text-white shadow-card lg:hidden">
            <div data-profundidad="3" className="pointer-events-none absolute -inset-y-16 inset-x-0">
              <Image src="/login/escuela-2.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
            </div>
            <div className="pointer-events-none absolute inset-0 login-velo" />
            <div className="escalonado relative flex flex-col items-center">
              <span className="entrada-pop inline-grid place-items-center rounded-3xl bg-white/95 p-3 shadow-float">
                <Image src="/logo-idv.png" alt="Escudo del Instituto Don Vasco" width={72} height={72} priority className="h-[72px] w-auto" />
              </span>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{ESCUELA.sistema}</h1>
              <p className="mt-1 font-semibold">{ESCUELA.nombreCorto}</p>
            </div>
          </Parallax>

          <div className="escalonado" style={{ "--offset": "200ms", "--paso": "70ms" } as React.CSSProperties}>
            <h2 className="text-3xl font-extrabold">¡Hola de nuevo!</h2>
            <p className="mt-1 muted">Entra con tu correo y contraseña.</p>

            <form onSubmit={handleSubmit} className="escalonado mt-8 space-y-5" style={{ "--offset": "380ms", "--paso": "70ms" } as React.CSSProperties}>
              <label className="block">
                <span className="text-sm font-semibold">Correo</span>
                <span className="relative mt-1.5 block">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="input rounded-xl py-3 pl-10 text-[15px]"
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Contraseña</span>
                <span className="relative mt-1.5 block">
                  <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
                  <input
                    type={ver ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input rounded-xl py-3 pl-10 pr-11 text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => setVer(!ver)}
                    aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 muted hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {ver ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-[15px]">
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="mt-6 block w-full text-center text-xs muted hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <p className="mt-2 text-center text-xs muted">Camino, Verdad, Vida</p>
          </div>
        </div>
      </section>

      {/* Forgot password modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock size={20} className="text-amber-600" />
              </div>
              <h2 className="text-base font-bold">Recuperar contraseña</h2>
            </div>
            <p className="text-sm muted leading-relaxed mb-2">
              Para restablecer tu contraseña, comunícate con el administrador del sistema:
            </p>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 mb-4">
              <p className="text-sm font-semibold">Dirección Escolar</p>
              <p className="text-sm muted mt-1">{ESCUELA.nombreCorto}</p>
              <p className="text-xs muted mt-1">Acude directamente a la dirección o envía un mensaje al administrador para solicitar el restablecimiento de tu contraseña.</p>
            </div>
            <button
              onClick={() => setShowForgot(false)}
              className="btn-primary w-full text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
