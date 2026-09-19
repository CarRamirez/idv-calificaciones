"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ImpersonationBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const [impersonating, setImpersonating] = useState<{
    name: string;
    role: string;
  } | null>(null);

  const checkStatus = useCallback(() => {
    fetch("/api/impersonate/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.active) {
          setImpersonating({ name: data.name, role: data.role });
        } else {
          setImpersonating(null);
        }
      })
      .catch(() => setImpersonating(null));
  }, []);

  // Re-check on every route change
  useEffect(() => {
    checkStatus();
  }, [pathname, checkStatus]);

  // Also listen for a custom event the ImpersonateButton dispatches
  useEffect(() => {
    function onImpersonationChange() {
      checkStatus();
    }
    window.addEventListener("impersonation-changed", onImpersonationChange);
    return () => window.removeEventListener("impersonation-changed", onImpersonationChange);
  }, [checkStatus]);

  if (!impersonating) return null;

  async function handleStop() {
    await fetch("/api/impersonate", { method: "DELETE" });
    setImpersonating(null);
    window.dispatchEvent(new Event("impersonation-changed"));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium z-[60] relative flex items-center justify-center gap-3 flex-wrap">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span>
        Estás viendo como <strong>{impersonating.name}</strong>{" "}
        <span className="opacity-80">({impersonating.role})</span>
      </span>
      <button
        onClick={handleStop}
        className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
      >
        Regresar a mi cuenta
      </button>
    </div>
  );
}
