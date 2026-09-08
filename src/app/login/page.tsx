"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo-idv.png"
            alt="Instituto Don Vasco"
            
            
            className="mx-auto mb-4 rounded-full shadow-lg ring-4 ring-white/20 w-24 h-24"
          />
          <h1 className="text-2xl font-bold text-white">
            Instituto
          </h1>
          <h2 className="text-lg font-semibold text-accent-300">
            &ldquo;Don Vasco&rdquo;
          </h2>
          <p className="text-sm text-primary-200 mt-2">
            Sistema de Calificaciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-xs text-primary-300 mt-6">
          Camino, Verdad, Vida — Ciclo 2026-2027
        </p>
      </div>
    </div>
  );
}
