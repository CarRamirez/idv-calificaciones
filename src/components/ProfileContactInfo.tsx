"use client";

import { useState, useEffect, useCallback } from "react";

type Props = {
  profileId: string;
  isStudent: boolean;
  canEdit: boolean;
};

export default function ProfileContactInfo({ profileId, isStudent, canEdit }: Props) {
  const [celular, setCelular] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [correoPersonal, setCorreoPersonal] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Original values for cancel
  const [origCelular, setOrigCelular] = useState("");
  const [origTelefono, setOrigTelefono] = useState("");
  const [origCorreo, setOrigCorreo] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile?id=${profileId}`);
      const data = await res.json();
      if (data.profile) {
        setCelular(data.profile.celular || "");
        setTelefonoEmergencia(data.profile.telefono_emergencia || "");
        setCorreoPersonal(data.profile.correo_personal || "");
        setOrigCelular(data.profile.celular || "");
        setOrigTelefono(data.profile.telefono_emergencia || "");
        setOrigCorreo(data.profile.correo_personal || "");
      }
    } catch {
      // Silent fail
    } finally {
      setLoaded(true);
    }
  }, [profileId]);

  useEffect(() => {
    if (!isStudent) fetchData();
    else setLoaded(true);
  }, [isStudent, fetchData]);

  if (isStudent || !loaded) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profileId,
          celular,
          telefono_emergencia: telefonoEmergencia,
          correo_personal: correoPersonal,
        }),
      });
      if (res.ok) {
        setOrigCelular(celular);
        setOrigTelefono(telefonoEmergencia);
        setOrigCorreo(correoPersonal);
        setEditing(false);
      }
    } catch {
      // Error silently
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCelular(origCelular);
    setTelefonoEmergencia(origTelefono);
    setCorreoPersonal(origCorreo);
    setEditing(false);
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10
      ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      : phone;
  };

  const whatsappUrl = celular
    ? `https://wa.me/52${celular.replace(/\D/g, "")}`
    : null;

  const hasSomeData = celular || telefonoEmergencia || correoPersonal;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Datos de contacto
        </h2>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="10 dígitos"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono de emergencia</label>
            <input
              type="tel"
              value={telefonoEmergencia}
              onChange={(e) => setTelefonoEmergencia(e.target.value)}
              placeholder="10 dígitos"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo personal</label>
            <input
              type="email"
              value={correoPersonal}
              onChange={(e) => setCorreoPersonal(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="input-field"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : hasSomeData ? (
        <div className="space-y-3">
          {celular && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Celular</p>
                <p className="text-sm font-medium text-gray-800">{formatPhone(celular)}</p>
              </div>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors shadow-sm"
                  title="Enviar mensaje por WhatsApp"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {telefonoEmergencia && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Tel. emergencia</p>
                <p className="text-sm font-medium text-gray-800">{formatPhone(telefonoEmergencia)}</p>
              </div>
            </div>
          )}

          {correoPersonal && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Correo personal</p>
                <p className="text-sm font-medium text-gray-800">{correoPersonal}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          Sin datos de contacto registrados
          {canEdit && (
            <>
              {" — "}
              <button onClick={() => setEditing(true)} className="text-primary-600 hover:underline">
                agregar
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
