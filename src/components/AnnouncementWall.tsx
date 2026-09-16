"use client";

import { useState, useEffect, useCallback } from "react";

type Announcement = {
  id: string;
  content: string;
  category: string;
  author_name: string;
  created_at: string;
};

const CATEGORIES = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-700" },
  { value: "academico", label: "Académico", color: "bg-blue-100 text-blue-700" },
  { value: "administrativo", label: "Administrativo", color: "bg-amber-100 text-amber-700" },
];

function getCategoryStyle(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.color || "bg-gray-100 text-gray-700";
}

function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label || "General";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function AnnouncementWall() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  async function handlePost() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), category }),
      });
      if (res.ok) {
        const newAnn = await res.json();
        setAnnouncements((prev) => [newAnn, ...prev]);
        setContent("");
        setCategory("general");
        setShowForm(false);
      }
    } catch {
      // silencioso
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silencioso
    }
  }

  const filtered =
    filter === "todos"
      ? announcements
      : announcements.filter((a) => a.category === filter);

  return (
    <div className="card flex flex-col h-full max-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Muro de Avisos
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
          >
            {showForm ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Publicar
              </>
            )}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("todos")}
            className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
              filter === "todos"
                ? "bg-primary-100 text-primary-700 font-medium"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                filter === c.value
                  ? `${c.color} font-medium`
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* New announcement form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un aviso..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{content.length}/500</span>
              <button
                onClick={handlePost}
                disabled={posting || !content.trim()}
                className="text-xs font-medium px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {posting ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <p className="text-xs text-gray-400">
              {filter === "todos" ? "No hay avisos aún" : "Sin avisos en esta categoría"}
            </p>
          </div>
        ) : (
          filtered.map((ann) => (
            <div
              key={ann.id}
              className="group relative bg-white border border-gray-100 rounded-lg px-3 py-2.5 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryStyle(ann.category)}`}>
                      {getCategoryLabel(ann.category)}
                    </span>
                    <span className="text-[10px] text-gray-400">{timeAgo(ann.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line break-words">
                    {ann.content}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {ann.author_name.split(" ").slice(0, 2).join(" ")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  title="Eliminar aviso"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] text-gray-400 text-center">
          {filtered.length} aviso{filtered.length !== 1 ? "s" : ""}
          {filter !== "todos" ? ` en ${getCategoryLabel(filter).toLowerCase()}` : ""}
        </p>
      </div>
    </div>
  );
}
