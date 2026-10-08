"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";

/* ──────────────────── DATA ──────────────────── */

type CellData = { subject: string; teacher?: string };

const GROUPS = ["1°A", "1°B", "2°A", "2°B", "3°A", "3°B", "3°C"] as const;

const TIME_SLOTS = [
  { start: "07:20", end: "08:10" },
  { start: "08:10", end: "09:00" },
  { start: "09:00", end: "09:50" },
  { type: "break" as const, label: "RECESO", start: "09:50", end: "10:10" },
  { start: "10:10", end: "11:00" },
  { start: "11:00", end: "11:50" },
  { type: "break" as const, label: "RECESO", start: "11:50", end: "12:10" },
  { start: "12:10", end: "13:00" },
  { start: "13:00", end: "13:50" },
  { start: "13:50", end: "14:40" },
] as const;

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

// Schedule data: schedule[day][slotIndex][groupIndex]
// slotIndex skips break rows (which are displayed separately)
// This is placeholder data — replace with the real schedule
const SCHEDULE: Record<string, CellData[][]> = {
  Lunes: [
    [{ subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "HISTORIA" }, { subject: "MATE" }, { subject: "INGLES" }, { subject: "" }, { subject: "" }],
    [{ subject: "GEO" }, { subject: "ORTO" }, { subject: "MATE" }, { subject: "HISTORIA" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "VALORES" }],
    [{ subject: "ESPAÑOL" }, { subject: "MATE" }, { subject: "CIENCIAS" }, { subject: "VALORES" }, { subject: "MATE" }, { subject: "CIENCIAS" }, { subject: "HISTORIA" }],
    [{ subject: "MATE" }, { subject: "HISTORIA" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "TECNO" }],
    [{ subject: "VALORES" }, { subject: "GEO" }, { subject: "ORTO" }, { subject: "ESPAÑOL" }, { subject: "TECNO" }, { subject: "HISTORIA" }, { subject: "CIENCIAS" }],
    [{ subject: "BRENDA" }, { subject: "VALORES" }, { subject: "ANGEL" }, { subject: "TECNO" }, { subject: "HISTORIA" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }],
    [{ subject: "INGLES" }, { subject: "" }, { subject: "TECNO" }, { subject: "CIENCIAS" }, { subject: "VALORES" }, { subject: "FCE" }, { subject: "MATE" }],
    [{ subject: "HISTORIA" }, { subject: "CIENCIAS" }, { subject: "INGLES" }, { subject: "" }, { subject: "MATE" }, { subject: "TECNO" }, { subject: "ESPAÑOL" }],
  ],
  Martes: [
    [{ subject: "TECNO" }, { subject: "FCE" }, { subject: "INGLES" }, { subject: "" }, { subject: "SALUD" }, { subject: "ESPAÑOL" }, { subject: "ANGEL" }],
    [{ subject: "INGLES" }, { subject: "" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "TECNO" }, { subject: "HISTORIA" }, { subject: "CIENCIAS" }],
    [{ subject: "MATE" }, { subject: "GINA" }, { subject: "HISTORIA" }, { subject: "TECNO" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "ESPAÑOL" }],
    [{ subject: "TECNO" }, { subject: "MATE" }, { subject: "ESPAÑOL" }, { subject: "BETO" }, { subject: "HISTORIA" }, { subject: "CIENCIAS" }, { subject: "MATE" }],
    [{ subject: "ESPAÑOL" }, { subject: "GEO" }, { subject: "MATE" }, { subject: "HISTORIA" }, { subject: "DEPORTES" }, { subject: "" }, { subject: "" }],
    [{ subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "DEPORTES" }, { subject: "" }, { subject: "TECNO" }, { subject: "ORTO" }, { subject: "HISTORIA" }],
    [{ subject: "DEPORTES" }, { subject: "" }, { subject: "TECNO" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "FCE" }, { subject: "CIENCIAS" }],
    [{ subject: "CIENCIAS" }, { subject: "TECNO" }, { subject: "SALUD" }, { subject: "MATE" }, { subject: "INGLES" }, { subject: "" }, { subject: "" }],
  ],
  Miércoles: [
    [{ subject: "INGLES" }, { subject: "" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "ARTES" }, { subject: "BETO" }, { subject: "HISTORIA" }],
    [{ subject: "VIDA" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "HISTORIA" }, { subject: "ARTES" }],
    [{ subject: "CIENCIAS" }, { subject: "GEO" }, { subject: "MATE" }, { subject: "ARTES" }, { subject: "HISTORIA" }, { subject: "VIDA" }, { subject: "ESPAÑOL" }],
    [{ subject: "GEO" }, { subject: "ESPAÑOL" }, { subject: "ARTES" }, { subject: "FCE" }, { subject: "VIDA" }, { subject: "MATE" }, { subject: "TECNO" }],
    [{ subject: "MATE" }, { subject: "HISTORIA" }, { subject: "INGLES" }, { subject: "" }, { subject: "ESPAÑOL" }, { subject: "ARTES" }, { subject: "VIDA" }],
    [{ subject: "HISTORIA" }, { subject: "ARTES" }, { subject: "VIDA" }, { subject: "ORTO" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "TECNO" }],
    [{ subject: "ARTES" }, { subject: "TECNO" }, { subject: "FCE" }, { subject: "VIDA" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "SALUD" }],
    [{ subject: "FCE" }, { subject: "VIDA" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "INGLES" }, { subject: "" }, { subject: "" }],
  ],
  Jueves: [
    [{ subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "HISTORIA" }, { subject: "ARTES" }, { subject: "INGLES" }, { subject: "" }, { subject: "" }],
    [{ subject: "CIENCIAS" }, { subject: "ARTES" }, { subject: "INGLES" }, { subject: "" }, { subject: "FCE" }, { subject: "ESPAÑOL" }, { subject: "MATE" }],
    [{ subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "MATE" }, { subject: "FCE" }, { subject: "ANGEL" }, { subject: "VALORES" }, { subject: "ARTES" }],
    [{ subject: "TECNO" }, { subject: "ESPAÑOL" }, { subject: "ARTES" }, { subject: "SALUD" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "HISTORIA" }],
    [{ subject: "ARTES" }, { subject: "MATE" }, { subject: "ESPAÑOL" }, { subject: "MATE" }, { subject: "DEPORTES" }, { subject: "" }, { subject: "" }],
    [{ subject: "DEPORTES" }, { subject: "" }, { subject: "VALORES" }, { subject: "ESPAÑOL" }, { subject: "ARTES" }, { subject: "TECNO" }, { subject: "FCE" }],
    [{ subject: "FCE" }, { subject: "MATE" }, { subject: "DEPORTES" }, { subject: "" }, { subject: "MATE" }, { subject: "ARTES" }, { subject: "CIENCIAS" }],
    [{ subject: "INGLES" }, { subject: "" }, { subject: "TECNO" }, { subject: "HISTORIA" }, { subject: "ESPAÑOL" }, { subject: "CIENCIAS" }, { subject: "MATE" }],
  ],
  Viernes: [
    [{ subject: "ARTES" }, { subject: "GEO" }, { subject: "ESPAÑOL" }, { subject: "HISTORIA" }, { subject: "INGLES" }, { subject: "" }, { subject: "" }],
    [{ subject: "GEO" }, { subject: "MATE" }, { subject: "FCE" }, { subject: "ARTES" }, { subject: "ORTO" }, { subject: "SALUD" }, { subject: "ESPAÑOL" }],
    [{ subject: "ORTO" }, { subject: "ESPAÑOL" }, { subject: "MATE" }, { subject: "CIENCIAS" }, { subject: "CIENCIAS" }, { subject: "HISTORIA" }, { subject: "ARTES" }],
    [{ subject: "MATE" }, { subject: "TECNO" }, { subject: "CIENCIAS" }, { subject: "MATE" }, { subject: "HISTORIA" }, { subject: "ARTES" }, { subject: "ESPAÑOL" }],
    [{ subject: "GEO" }, { subject: "CIENCIAS" }, { subject: "ARTES" }, { subject: "TECNO" }, { subject: "MATE" }, { subject: "ESPAÑOL" }, { subject: "FCE" }],
    [{ subject: "MATE" }, { subject: "ARTES" }, { subject: "CIENCIAS" }, { subject: "ESPAÑOL" }, { subject: "FCE" }, { subject: "MATE" }, { subject: "CIENCIAS" }],
    [{ subject: "INGLES" }, { subject: "" }, { subject: "HISTORIA" }, { subject: "CIENCIAS" }, { subject: "ARTES" }, { subject: "CIENCIAS" }, { subject: "ORTO" }],
    [{ subject: "ESPAÑOL" }, { subject: "FCE" }, { subject: "INGLES" }, { subject: "" }, { subject: "CIENCIAS" }, { subject: "TECNO" }, { subject: "MATE" }],
  ],
};

/* ──────────────────── SUBJECT DISPLAY NAMES ──────────────────── */

const SUBJECT_DISPLAY: Record<string, string> = {
  MATE: "Matemáticas",
  ESPAÑOL: "Español",
  CIENCIAS: "Ciencias",
  HISTORIA: "Historia",
  GEO: "Geografía",
  ARTES: "Artes",
  TECNO: "Tecnologías",
  FCE: "FCE",
  INGLES: "Inglés",
  ORTO: "Ortografía",
  SALUD: "S. Mental",
  VIDA: "V. Saludable",
  VALORES: "Valores",
  DEPORTES: "Deportes",
  BRENDA: "Tutorías",
  GINA: "Tutorías",
  BETO: "Tutorías",
  ANGEL: "Tutorías",
};

/* ──────────────────── SUBJECT COLORS ──────────────────── */

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  MATE:     { bg: "bg-blue-100", text: "text-blue-800" },
  ESPAÑOL:  { bg: "bg-amber-100", text: "text-amber-800" },
  "CIENCIAS": { bg: "bg-green-100", text: "text-green-800" },
  HISTORIA: { bg: "bg-orange-100", text: "text-orange-800" },
  GEO:      { bg: "bg-teal-100", text: "text-teal-800" },
  ARTES:    { bg: "bg-pink-100", text: "text-pink-800" },
  TECNO:    { bg: "bg-slate-200", text: "text-slate-800" },
  FCE:      { bg: "bg-violet-100", text: "text-violet-800" },
  INGLES:   { bg: "bg-red-100", text: "text-red-800" },
  ORTO:     { bg: "bg-cyan-100", text: "text-cyan-800" },
  SALUD:    { bg: "bg-lime-100", text: "text-lime-800" },
  VIDA:     { bg: "bg-emerald-100", text: "text-emerald-800" },
  VALORES:  { bg: "bg-indigo-100", text: "text-indigo-800" },
  DEPORTES: { bg: "bg-yellow-100", text: "text-yellow-800" },
  BRENDA:   { bg: "bg-gray-200", text: "text-gray-700" },
  GINA:     { bg: "bg-gray-200", text: "text-gray-700" },
  BETO:     { bg: "bg-gray-200", text: "text-gray-700" },
  ANGEL:    { bg: "bg-gray-200", text: "text-gray-700" },
};

const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700" };

/* ──────────────────── DAY COLORS (for week view) ──────────────────── */

const DAY_COLORS: Record<string, { header: string; bg: string }> = {
  Lunes:     { header: "bg-blue-600",    bg: "bg-blue-50" },
  Martes:    { header: "bg-emerald-600", bg: "bg-emerald-50" },
  Miércoles: { header: "bg-purple-600",  bg: "bg-purple-50" },
  Jueves:    { header: "bg-orange-600",  bg: "bg-orange-50" },
  Viernes:   { header: "bg-rose-600",    bg: "bg-rose-50" },
};

/* ──────────────────── COMPONENT ──────────────────── */

type ViewMode = "day" | "week";

export default function HorarioPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date().getDay();
    if (today >= 1 && today <= 5) return DAYS[today - 1];
    return "Lunes";
  });
  const [selectedGroup, setSelectedGroup] = useState<string>("all");



  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) { router.replace("/login"); return; }
          setUserName(data.full_name);
          setUserRole(data.role);
          setLoading(false);

          // Override with effective profile (handles impersonation)
          fetch("/api/auth/effective-profile")
            .then((r) => r.json())
            .then((ep) => {
              if (ep.full_name) {
                setUserName(ep.full_name);
                setUserRole(ep.role);
              }
            })
            .catch(() => {});
        });
    });
  }, [router, supabase]);

  // Build class slots (skip breaks in data, but show break rows in table)
  const classSlots = useMemo(() => {
    const slots: { start: string; end: string; isBreak: boolean; label?: string; dataIndex?: number }[] = [];
    let dataIdx = 0;
    for (const slot of TIME_SLOTS) {
      if ("type" in slot && slot.type === "break") {
        slots.push({ start: slot.start, end: slot.end, isBreak: true, label: slot.label });
      } else {
        slots.push({ start: slot.start, end: slot.end, isBreak: false, dataIndex: dataIdx });
        dataIdx++;
      }
    }
    return slots;
  }, []);

  // Current time tracking for highlighting active class
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  // Get current time in Mexico City timezone
  const mexicoTime = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "long",
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const weekday = parts.find((p) => p.type === "weekday")?.value || "";
    return { timeStr: `${hour}:${minute}`, weekday };
  }, [now]);

  // Map English weekday to Spanish
  const WEEKDAY_MAP: Record<string, string> = {
    Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles",
    Thursday: "Jueves", Friday: "Viernes",
  };
  const todayName = WEEKDAY_MAP[mexicoTime.weekday] || "";

  // Find active slot index (among classSlots, not just data slots)
  const activeSlotIdx = useMemo(() => {
    const [h, m] = mexicoTime.timeStr.split(":").map(Number);
    const nowMins = h * 60 + m;
    return classSlots.findIndex((slot) => {
      if (slot.isBreak) return false;
      const [sh, sm] = slot.start.split(":").map(Number);
      const [eh, em] = slot.end.split(":").map(Number);
      return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
    });
  }, [mexicoTime.timeStr, classSlots]);

  const dayData = SCHEDULE[selectedDay] || [];

  // Filtered groups for the week view
  const filteredGroups = selectedGroup === "all" ? [...GROUPS] : [selectedGroup];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navbar userName={userName} userRole={userRole} />

      <main className="page-content animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-lg hover:bg-white/80 text-gray-500 hover:text-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Horario Escolar</h1>
              <p className="text-sm text-gray-500">Ciclo escolar 2026-2027 — Instituto Don Vasco</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white/60 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("day")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "day"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-primary-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Día</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "week"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-primary-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Semana</span>
            </button>
          </div>
        </div>

        {/* ──────────── DAY VIEW ──────────── */}
        {viewMode === "day" && (
          <>
            {/* Day Tabs */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
              {DAYS.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-primary-600 text-white shadow-md"
                        : "bg-white/60 text-gray-600 hover:bg-white hover:text-primary-600 border border-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Schedule Grid — single day */}
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-primary-600 text-white">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-20">
                        Horario
                      </th>
                      {GROUPS.map((g) => (
                        <th key={g} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide">
                          {g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classSlots.map((slot, idx) => {
                      if (slot.isBreak) {
                        return (
                          <tr key={`break-${idx}`} className="bg-amber-50">
                            <td
                              colSpan={GROUPS.length + 1}
                              className="px-3 py-1.5 text-center text-xs font-bold text-amber-700 uppercase tracking-widest"
                            >
                              {slot.label} ({slot.start} - {slot.end})
                            </td>
                          </tr>
                        );
                      }

                      const rowData = slot.dataIndex !== undefined ? dayData[slot.dataIndex] : [];

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 transition-colors ${
                            idx === activeSlotIdx && selectedDay === todayName
                              ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400"
                              : "hover:bg-gray-50/50"
                          }`}
                        >
                          <td className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
                            idx === activeSlotIdx && selectedDay === todayName
                              ? "text-indigo-700 font-bold"
                              : "text-gray-500"
                          }`}>
                            {idx === activeSlotIdx && selectedDay === todayName && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mr-1 align-middle" />
                            )}
                            {slot.start} - {slot.end}
                          </td>
                          {GROUPS.map((_, gi) => {
                            const cell = rowData?.[gi];
                            if (!cell || !cell.subject) {
                              return (
                                <td key={gi} className="px-1 py-1.5 text-center">
                                  <span className="text-gray-300">—</span>
                                </td>
                              );
                            }
                            const colors = SUBJECT_COLORS[cell.subject] || DEFAULT_COLOR;
                            const displayName = SUBJECT_DISPLAY[cell.subject] || cell.subject;
                            return (
                              <td key={gi} className="px-1 py-1.5 text-center">
                                <span
                                  className={`inline-block px-2 py-1 rounded-lg text-[11px] font-semibold ${colors.bg} ${colors.text} min-w-[60px]`}
                                >
                                  {displayName}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ──────────── WEEK VIEW ──────────── */}
        {viewMode === "week" && (
          <>
            {/* Group filter */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Grupo:</span>
              <button
                onClick={() => setSelectedGroup("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedGroup === "all"
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-white/60 text-gray-600 hover:bg-white hover:text-primary-600 border border-gray-200"
                }`}
              >
                Todos
              </button>
              {GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    selectedGroup === g
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-white/60 text-gray-600 hover:bg-white hover:text-primary-600 border border-gray-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Full week grid */}
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: selectedGroup === "all" ? "1200px" : "600px" }}>
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-20 sticky left-0 bg-gray-800 z-10">
                        Horario
                      </th>
                      {DAYS.map((day) => {
                        const dayColor = DAY_COLORS[day];
                        if (selectedGroup !== "all") {
                          return (
                            <th key={day} className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${dayColor.header} text-white`}>
                              {day}
                            </th>
                          );
                        }
                        return (
                          <th
                            key={day}
                            colSpan={filteredGroups.length}
                            className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${dayColor.header} text-white`}
                          >
                            {day}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Group sub-headers when showing all groups */}
                    {selectedGroup === "all" && (
                      <tr className="bg-gray-100">
                        <th className="sticky left-0 bg-gray-100 z-10" />
                        {DAYS.map((day) =>
                          filteredGroups.map((g) => (
                            <th key={`${day}-${g}`} className="px-1 py-1.5 text-center text-[10px] font-semibold text-gray-600 uppercase">
                              {g}
                            </th>
                          ))
                        )}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {classSlots.map((slot, idx) => {
                      if (slot.isBreak) {
                        const totalCols = selectedGroup === "all"
                          ? 1 + DAYS.length * filteredGroups.length
                          : 1 + DAYS.length;
                        return (
                          <tr key={`break-${idx}`} className="bg-amber-50">
                            <td
                              colSpan={totalCols}
                              className="px-3 py-1 text-center text-[10px] font-bold text-amber-700 uppercase tracking-widest"
                            >
                              {slot.label} ({slot.start} - {slot.end})
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 transition-colors ${
                            idx === activeSlotIdx
                              ? "bg-indigo-50/70 ring-1 ring-inset ring-indigo-300"
                              : "hover:bg-gray-50/30"
                          }`}
                        >
                          <td className={`px-2 py-1.5 text-[10px] font-medium whitespace-nowrap sticky left-0 z-10 ${
                            idx === activeSlotIdx
                              ? "bg-indigo-50 text-indigo-700 font-bold"
                              : "bg-white text-gray-500"
                          }`}>
                            {idx === activeSlotIdx && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mr-0.5 align-middle" />
                            )}
                            {slot.start}
                            <br />
                            <span className="text-gray-400">{slot.end}</span>
                          </td>
                          {DAYS.map((day) => {
                            const daySchedule = SCHEDULE[day] || [];
                            const rowData = slot.dataIndex !== undefined ? daySchedule[slot.dataIndex] : [];
                            const dayBg = DAY_COLORS[day]?.bg || "";

                            return filteredGroups.map((g) => {
                              const gi = GROUPS.indexOf(g as typeof GROUPS[number]);
                              const cell = rowData?.[gi];
                              if (!cell || !cell.subject) {
                                return (
                                  <td key={`${day}-${g}`} className={`px-0.5 py-1 text-center ${dayBg}`}>
                                    <span className="text-gray-300 text-[10px]">—</span>
                                  </td>
                                );
                              }
                              const colors = SUBJECT_COLORS[cell.subject] || DEFAULT_COLOR;
                              const displayName = SUBJECT_DISPLAY[cell.subject] || cell.subject;
                              return (
                                <td key={`${day}-${g}`} className={`px-0.5 py-1 text-center ${dayBg}`}>
                                  <span
                                    className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold ${colors.bg} ${colors.text} leading-tight`}
                                  >
                                    {displayName}
                                  </span>
                                </td>
                              );
                            });
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Legend */}
        <div className="mt-5 card p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Materias</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SUBJECT_COLORS)
              .filter(([key]) => !["GINA", "BETO", "ANGEL"].includes(key))
              .map(([subject, colors]) => {
                const displayName = SUBJECT_DISPLAY[subject] || subject;
                return (
                  <span key={subject} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                    {displayName}
                  </span>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
