"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type EvalPeriod = {
  id: string;
  period_number: number;
  name: string;
  trimester: number;
  is_open: boolean;
  open_date: string | null;
  close_date: string | null;
};

const TRIMESTER_LABELS: Record<number, string> = {
  1: "1er Trimestre",
  2: "2do Trimestre",
  3: "3er Trimestre",
  0: "Evaluación Final",
};

export default function PeriodosPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [periods, setPeriods] = useState<EvalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!prof || prof.role !== "admin") { router.push("/dashboard"); return; }
      setProfile(prof);
      setLoading(false);
    }
    init();
  }, []);

  const loadPeriods = useCallback(async () => {
    const res = await fetch("/api/admin/periods");
    const data = await res.json();
    if (data.periods) setPeriods(data.periods);
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  async function togglePeriod(period: EvalPeriod) {
    setToggling(period.id);
    const res = await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: period.id, is_open: !period.is_open }),
    });
    if (res.ok) {
      setPeriods((prev) =>
        prev.map((p) => (p.id === period.id ? { ...p, is_open: !p.is_open } : p))
      );
    }
    setToggling(null);
  }

  async function updateDates(periodId: string, openDate: string, closeDate: string) {
    await fetch("/api/admin/periods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: periodId,
        open_date: openDate || null,
        close_date: closeDate || null,
      }),
    });
    loadPeriods();
  }

  // Group by trimester
  const grouped = periods.reduce<Record<number, EvalPeriod[]>>((acc, p) => {
    if (!acc[p.trimester]) acc[p.trimester] = [];
    acc[p.trimester].push(p);
    return acc;
  }, {});

  const trimesterOrder = [1, 2, 3, 0];

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    );
  }

  const openCount = periods.filter((p) => p.is_open).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Periodos de Evaluación</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {openCount === 0
                ? "Todos los periodos están cerrados"
                : `${openCount} periodo${openCount > 1 ? "s" : ""} abierto${openCount > 1 ? "s" : ""} para captura`}
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Inicio</Link>
        </div>

        <div className="space-y-6">
          {trimesterOrder.map((trimId) => {
            const group = grouped[trimId];
            if (!group) return null;
            const allOpen = group.every((p) => p.is_open);
            const someOpen = group.some((p) => p.is_open);

            return (
              <div key={trimId} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900">
                      {TRIMESTER_LABELS[trimId]}
                    </h2>
                    {someOpen && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        allOpen
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {allOpen ? "Todos abiertos" : "Parcial"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {group.map((period) => (
                    <PeriodRow
                      key={period.id}
                      period={period}
                      toggling={toggling === period.id}
                      onToggle={() => togglePeriod(period)}
                      onUpdateDates={(od, cd) => updateDates(period.id, od, cd)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          <strong>Nota:</strong> Cuando un periodo está cerrado, los profesores solo podrán consultar las calificaciones
          registradas, pero no podrán modificarlas. Solo el administrador puede capturar en periodos cerrados.
        </div>
      </main>
    </div>
  );
}

function PeriodRow({
  period,
  toggling,
  onToggle,
  onUpdateDates,
}: {
  period: EvalPeriod;
  toggling: boolean;
  onToggle: () => void;
  onUpdateDates: (openDate: string, closeDate: string) => void;
}) {
  const [showDates, setShowDates] = useState(false);
  const [openDate, setOpenDate] = useState(period.open_date?.slice(0, 16) || "");
  const [closeDate, setCloseDate] = useState(period.close_date?.slice(0, 16) || "");

  function handleSaveDates() {
    onUpdateDates(openDate, closeDate);
    setShowDates(false);
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors ${
      period.is_open
        ? "bg-green-50 border-green-200"
        : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          period.is_open ? "bg-green-500" : "bg-gray-300"
        }`} />
        <div>
          <span className="text-sm font-medium text-gray-900">{period.name}</span>
          <span className="text-xs text-gray-400 ml-2">Periodo {period.period_number}</span>
          {(period.open_date || period.close_date) && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {period.open_date && `Abre: ${new Date(period.open_date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`}
              {period.open_date && period.close_date && " — "}
              {period.close_date && `Cierra: ${new Date(period.close_date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <button
          onClick={() => setShowDates(!showDates)}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          title="Configurar fechas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            period.is_open ? "bg-green-500" : "bg-gray-300"
          } ${toggling ? "opacity-50" : ""}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            period.is_open ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      {showDates && (
        <div className="w-full mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Fecha apertura</label>
            <input
              type="datetime-local"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">Fecha cierre</label>
            <input
              type="datetime-local"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
            <button onClick={() => setShowDates(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button onClick={handleSaveDates} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Guardar fechas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
