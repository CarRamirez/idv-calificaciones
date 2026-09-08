"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  userName: string;
  userRole: string;
};

export default function Navbar({ userName, userRole }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Nombre */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo-idv.png"
              alt="Instituto Don Vasco"
              width={36}
              height={36}
              className="rounded-full"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-primary-700">Instituto Don Vasco</span>
              <span className="text-[10px] text-accent-600 font-medium hidden sm:block">Sistema de Calificaciones</span>
            </div>
          </Link>

          {/* Links de navegación - Desktop */}
          <div className="hidden sm:flex items-center gap-4">
            {(userRole === "teacher" || userRole === "admin") && (
              <Link href="/captura" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                Captura
              </Link>
            )}
            {(userRole === "admin" || userRole === "viewer") && (
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                Concentrado
              </Link>
            )}
            {userRole === "admin" && (
              <Link href="/admin/alumnos" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">
                Admin
              </Link>
            )}

            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <span className="text-xs text-gray-500">{userName}</span>
              <button onClick={handleLogout} className="text-xs text-red-600 hover:text-red-700">
                Salir
              </button>
            </div>
          </div>

          {/* Menú móvil */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menú móvil expandido */}
        {menuOpen && (
          <div className="sm:hidden pb-3 space-y-1">
            {(userRole === "teacher" || userRole === "admin") && (
              <Link href="/captura" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                Captura
              </Link>
            )}
            {(userRole === "admin" || userRole === "viewer") && (
              <Link href="/dashboard" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                Concentrado
              </Link>
            )}
            {userRole === "admin" && (
              <Link href="/admin/alumnos" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                Admin
              </Link>
            )}
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{userName}</span>
              <button onClick={handleLogout} className="text-xs text-red-600">Salir</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
