"use client";

import { useState } from "react";

type Props = {
  profileId: string;
  initialName: string;
  initialEmail: string;
  initialLabel: string;
  isOwnProfile: boolean;
};

export default function ProfileSelfEdit({ profileId, initialName, initialEmail, initialLabel, isOwnProfile }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [label, setLabel] = useState(initialLabel);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Keep originals for cancel
  const [origName] = useState(initialName);
  const [origLabel] = useState(initialLabel);

  if (!isOwnProfile) return null;

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile/self", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          label: label.trim(),
          ...(newPassword ? { new_password: newPassword } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        setSaving(false);
        return;
      }

      setSuccess("Datos actualizados correctamente");
      setEditing(false);
      setNewPassword("");
      setCurrentPassword("");

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(origName);
    setLabel(origLabel);
    setNewPassword("");
    setCurrentPassword("");
    setError("");
    setSuccess("");
    setEditing(false);
  };

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Mis datos
        </h2>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setSuccess(""); }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      {success && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          {success}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={initialEmail}
              disabled
              className="input-field bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">El correo no puede ser modificado.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta / descripción</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="input-field"
              placeholder="Ej: Matemáticas — 2° grado"
            />
          </div>
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Cambiar contraseña (opcional)</p>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field pr-14"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showNewPass ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Déjalo vacío si no deseas cambiar tu contraseña.</p>
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-20">Nombre:</span>
            <span className="text-sm text-gray-800 font-medium">{initialName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-20">Correo:</span>
            <span className="text-sm text-gray-600">{initialEmail}</span>
          </div>
          {initialLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20">Etiqueta:</span>
              <span className="text-sm text-gray-600 italic">{initialLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
