"use client";

import { useEffect, useState } from "react";

interface PeriodBannerProps {
  periodName: string;
  openDate: string | null;
  closeDate: string | null;
  compact?: boolean;
}

function formatDateMX(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
}

function getTimeRemaining(closeDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  const total = new Date(closeDate).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

export default function PeriodBanner({ periodName, openDate, closeDate, compact = false }: PeriodBannerProps) {
  const [remaining, setRemaining] = useState(() =>
    closeDate ? getTimeRemaining(closeDate) : null
  );

  useEffect(() => {
    if (!closeDate) return;
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(closeDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [closeDate]);

  const isUrgent = remaining && remaining.total > 0 && remaining.days < 2;
  const isExpired = remaining && remaining.total <= 0;

  if (compact) {
    return (
      <div
        className={`mb-4 glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${
          isExpired
            ? "!border-red-200/60 !bg-red-50/60"
            : isUrgent
            ? "!border-amber-200/60 !bg-amber-50/60"
            : "!border-emerald-200/60 !bg-emerald-50/60"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isExpired
              ? "bg-red-100/80"
              : isUrgent
              ? "bg-amber-100/80"
              : "bg-emerald-100/80"
          }`}
        >
          {isExpired ? (
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className={`w-4 h-4 ${isUrgent ? "text-amber-600" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-semibold ${isExpired ? "text-red-700" : isUrgent ? "text-amber-700" : "text-emerald-700"}`}>
            {periodName}
          </span>
          {isExpired ? (
            <span className="text-red-600 ml-2">— Periodo cerrado</span>
          ) : remaining && remaining.total > 0 ? (
            <span className={`ml-2 ${isUrgent ? "text-amber-600" : "text-gray-500"}`}>
              — Cierra en{" "}
              {remaining.days > 0 && `${remaining.days}d `}
              {remaining.hours > 0 && `${remaining.hours}h `}
              {remaining.minutes}m
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // Full banner for dashboard
  return (
    <div
      className={`mb-6 glass rounded-2xl overflow-hidden border ${
        isExpired
          ? "!border-red-200/60"
          : isUrgent
          ? "!border-amber-200/60"
          : "!border-emerald-200/60"
      }`}
    >
      <div
        className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
          isExpired
            ? "!bg-red-50/60"
            : isUrgent
            ? "!bg-amber-50/60"
            : "!bg-emerald-50/60"
        }`}
      >
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isExpired
                ? "bg-red-100/80"
                : isUrgent
                ? "bg-amber-100/80"
                : "bg-emerald-100/80"
            }`}
          >
            {isExpired ? (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${isUrgent ? "text-amber-600" : "text-emerald-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-sm font-bold ${isExpired ? "text-red-700" : isUrgent ? "text-amber-700" : "text-emerald-700"}`}>
              {isExpired ? "Periodo cerrado" : "Periodo abierto para captura"}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{periodName}</span>
              {openDate && closeDate && (
                <span className="text-gray-400">
                  {" "}· {formatDateMX(openDate)} → {formatDateMX(closeDate)}
                </span>
              )}
              {openDate && !closeDate && (
                <span className="text-gray-400"> · Desde {formatDateMX(openDate)}</span>
              )}
              {!openDate && closeDate && (
                <span className="text-gray-400"> · Hasta {formatDateMX(closeDate)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: countdown */}
        {remaining && remaining.total > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className={`text-xs font-medium ${isUrgent ? "text-amber-600" : "text-gray-400"}`}>
              Cierra en
            </span>
            <div className="flex gap-1.5">
              {remaining.days > 0 && (
                <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[3rem] ${
                  isUrgent ? "bg-amber-100/80" : "bg-white/80"
                }`}>
                  <p className={`text-lg font-extrabold leading-none ${isUrgent ? "text-amber-700" : "text-gray-800"}`}>
                    {remaining.days}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">días</p>
                </div>
              )}
              <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[3rem] ${
                isUrgent ? "bg-amber-100/80" : "bg-white/80"
              }`}>
                <p className={`text-lg font-extrabold leading-none ${isUrgent ? "text-amber-700" : "text-gray-800"}`}>
                  {String(remaining.hours).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">hrs</p>
              </div>
              <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[3rem] ${
                isUrgent ? "bg-amber-100/80" : "bg-white/80"
              }`}>
                <p className={`text-lg font-extrabold leading-none ${isUrgent ? "text-amber-700" : "text-gray-800"}`}>
                  {String(remaining.minutes).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">min</p>
              </div>
              <div className={`rounded-lg px-2.5 py-1.5 text-center min-w-[3rem] ${
                isUrgent ? "bg-amber-100/80" : "bg-white/80"
              }`}>
                <p className={`text-lg font-extrabold leading-none ${isUrgent ? "text-amber-700" : "text-gray-800"}`}>
                  {String(remaining.seconds).padStart(2, "0")}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">seg</p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-red-100/80 text-red-700">
              Captura finalizada
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
