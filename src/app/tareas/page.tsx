"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

type Group = { id: string; grade: number; letter: string; parent_email: string | null };
type Subject = { id: string; name: string; short_name: string; grade: number; counts_for_avg: boolean; sort_order: number };
type SelectedSubject = { subject_id: string; subject_name: string; comment: string };
type Notification = {
  id: string;
  sent_at: string;
  recipient_email: string;
  subjects: { subject_name: string; comment?: string }[];
  profiles: { full_name: string } | null;
  groups: { grade: number; letter: string } | null;
};

export default function TareasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, SelectedSubject>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Record<string, boolean>>({
    padres: true,
    sistemas: true,
    alumnos: true,
  });
  const [customEmails, setCustomEmails] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, role").eq("id", user.id).single();
      if (!prof || prof.role !== "admin") { router.push("/dashboard"); return; }
      setProfile(prof);

      // Load groups
      const { data: grps } = await supabase
        .from("groups")
        .select("id, grade, letter, parent_email")
        .order("grade")
        .order("letter");
      setGroups(grps || []);

      // Load all subjects
      const { data: subs } = await supabase
        .from("subjects")
        .select("id, name, short_name, grade, counts_for_avg, sort_order")
        .order("sort_order");
      setSubjects(subs || []);

      // Load history
      const res = await fetch("/api/tareas/send");
      const data = await res.json();
      setHistory(data.notifications || []);

      setLoading(false);
    }
    init();
  }, []);

  const groupObj = groups.find((g) => g.id === selectedGroup);
  const filteredSubjects = subjects.filter(
    (s) => groupObj && s.grade === groupObj.grade
  );

  const toggleSubject = useCallback((s: Subject) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (copy[s.id]) {
        delete copy[s.id];
      } else {
        copy[s.id] = { subject_id: s.id, subject_name: s.name, comment: "" };
      }
      return copy;
    });
  }, []);

  const setComment = useCallback((subjectId: string, comment: string) => {
    setSelected((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], comment },
    }));
  }, []);

  const handleSend = async () => {
    const subjectsList = Object.values(selected);
    if (!selectedGroup || subjectsList.length === 0) return;

    setSending(true);
    setResult(null);

    const activeRecipients = Object.entries(recipients)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const extraEmails = customEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (activeRecipients.length === 0 && extraEmails.length === 0) {
      setResult({ ok: false, message: "Selecciona al menos un destinatario" });
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/tareas/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: selectedGroup,
          subjects: subjectsList,
          recipients: activeRecipients,
          cc_emails: extraEmails,
          custom_message: customMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: data.message });
        setSelected({});
        setCustomMessage("");
        // Refresh history
        const hRes = await fetch("/api/tareas/send");
        const hData = await hRes.json();
        setHistory(hData.notifications || []);
      } else {
        setResult({ ok: false, message: data.error });
      }
    } catch {
      setResult({ ok: false, message: "Error de conexión" });
    } finally {
      setSending(false);
    }
  };

  const selectedCount = Object.keys(selected).length;
  const recipientCount = Object.values(recipients).filter(Boolean).length
    + (customEmails.split(",").filter((e) => e.trim().includes("@")).length);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={profile.full_name} userRole={profile.role} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Notificación de Tareas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Envía a los padres de familia el aviso de tareas del día
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* ── Formulario principal ── */}
          <div className="space-y-4">
            {/* Selector de grupo */}
            <div className="card p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Selecciona el grupo
              </label>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const isActive = g.id === selectedGroup;
                  const hasEmail = !!g.parent_email;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGroup(g.id);
                        setSelected({});
        setCustomMessage("");
                        setResult(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary-600 text-white shadow-md"
                          : hasEmail
                          ? "bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:bg-primary-50"
                          : "bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!hasEmail}
                      title={!hasEmail ? "Sin correo de padres configurado" : ""}
                    >
                      {g.grade}°{g.letter}
                      {!hasEmail && (
                        <span className="ml-1 text-[10px]">⚠️</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {groupObj && !groupObj.parent_email && (
                <p className="text-xs text-red-500 mt-2">
                  Este grupo no tiene correo de padres configurado.
                </p>
              )}
              {groupObj && groupObj.parent_email && (
                <p className="text-xs text-gray-400 mt-2">
                  Email del grupo: <span className="font-mono">{groupObj.parent_email}</span>
                </p>
              )}
            </div>

            {/* Destinatarios */}
            {selectedGroup && groupObj?.parent_email && (
              <div className="card p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  2. Selecciona los destinatarios
                </label>
                <div className="space-y-2">
                  {[
                    { key: "padres", label: "Padres de familia", desc: groupObj.parent_email },
                    { key: "sistemas", label: "Sistemas", desc: "sistemas@institutodonvasco.edu.mx" },
                    { key: "alumnos", label: "Alumnos Secundaria", desc: "alumnossecundaria@institutodonvasco.edu.mx" },
                  ].map((r) => (
                    <div
                      key={r.key}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                        recipients[r.key]
                          ? "border-primary-300 bg-primary-50"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={() =>
                        setRecipients((prev) => ({ ...prev, [r.key]: !prev[r.key] }))
                      }
                    >
                      <input
                        type="checkbox"
                        checked={recipients[r.key] || false}
                        onChange={() =>
                          setRecipients((prev) => ({ ...prev, [r.key]: !prev[r.key] }))
                        }
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{r.label}</span>
                        <p className="text-xs text-gray-400 font-mono truncate">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Campo para correos adicionales */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Correos adicionales (separados por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. director@institutodonvasco.edu.mx, otro@correo.com"
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Mensaje personalizado */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">
                    Mensaje personalizado (opcional)
                  </label>
                  <textarea
                    placeholder="Ej. Recuerden traer su bata de laboratorio para mañana."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  {customMessage.length > 0 && (
                    <p className="text-[10px] text-gray-400 text-right mt-1">
                      {customMessage.length}/500
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Materias */}
            {selectedGroup && filteredSubjects.length > 0 && (
              <div className="card p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  3. Selecciona las materias con tarea
                </label>
                <div className="space-y-2">
                  {filteredSubjects.map((s) => {
                    const isChecked = !!selected[s.id];
                    return (
                      <div key={s.id} className={`rounded-lg border transition-all ${
                        isChecked ? "border-primary-300 bg-primary-50" : "border-gray-200 bg-white"
                      }`}>
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                          onClick={() => toggleSubject(s)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSubject(s)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-800">{s.name}</span>
                            <span className="ml-2 text-xs text-gray-400 font-mono">{s.short_name}</span>
                          </div>
                          {!s.counts_for_avg && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              No curricular
                            </span>
                          )}
                        </div>
                        {/* Campo de comentario */}
                        {isChecked && (
                          <div className="px-4 pb-3">
                            <input
                              type="text"
                              placeholder="Comentario opcional (ej. Traer materiales para maqueta)"
                              value={selected[s.id]?.comment || ""}
                              onChange={(e) => setComment(s.id, e.target.value)}
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              maxLength={200}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resultado */}
            {result && (
              <div className={`rounded-lg p-4 text-sm ${
                result.ok
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {result.ok ? "✓ " : "✗ "}{result.message}
              </div>
            )}

            {/* Botón enviar */}
            {selectedGroup && selectedCount > 0 && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando correo...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Enviar aviso de tarea ({selectedCount} materia{selectedCount !== 1 ? "s" : ""})
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Historial de envíos ── */}
          <div>
            <div className="card p-4 sticky top-20">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial de envíos
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin envíos registrados</p>
              ) : (
                <div className="space-y-3">
                  {history.map((n) => (
                    <div key={n.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {n.groups ? `${n.groups.grade}°${n.groups.letter}` : "—"}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(n.sent_at)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(n.subjects as any[]).map((s: any, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded"
                            title={s.comment || ""}
                          >
                            {s.subject_name}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {n.profiles?.full_name || "—"} → {n.recipient_email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
