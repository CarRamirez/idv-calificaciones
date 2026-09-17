"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

type Role = {
  id: string;
  name: string;
  display_name: string;
  permissions: string[];
  created_at: string;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  label: string | null;
};

const ALL_MODULES = [
  { slug: "dashboard", label: "Dashboard", desc: "Página principal con estadísticas" },
  { slug: "captura", label: "Captura", desc: "Captura de calificaciones" },
  { slug: "calificaciones", label: "Calificaciones", desc: "Módulo de calificaciones" },
  { slug: "boleta", label: "Boleta", desc: "Consulta de boletas" },
  { slug: "tareas", label: "Tareas", desc: "Notificación de tareas a padres" },
  { slug: "periodos", label: "Periodos", desc: "Gestión de periodos de evaluación" },
  { slug: "admin_alumnos", label: "Admin: Alumnos", desc: "Alta, baja y cambios de alumnos" },
  { slug: "admin_profesores", label: "Admin: Profesores", desc: "Gestión de cuentas de profesor" },
  { slug: "admin_grupos", label: "Admin: Grupos", desc: "Gestión de grupos" },
  { slug: "admin_materias", label: "Admin: Materias", desc: "Gestión de materias" },
  { slug: "admin_sesiones", label: "Admin: Sesiones", desc: "Historial de inicios de sesión" },
  { slug: "admin_roles", label: "Admin: Roles", desc: "Gestión de roles y permisos" },
];

export default function AdminRolesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "users">("roles");

  // Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPerms, setFormPerms] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // User role assignment modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [assignRole, setAssignRole] = useState("");

  // Delete
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    if (!data || data.role !== "admin") { router.push("/dashboard"); return; }
    setProfile(data);
  }, [supabase, router]);

  const loadRoles = useCallback(async () => {
    const res = await fetch("/api/admin/roles");
    if (res.ok) setRoles(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/roles?tab=users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([loadProfile(), loadRoles(), loadUsers()]).then(() => setLoading(false));
  }, [loadProfile, loadRoles, loadUsers]);

  function openNewRole() {
    setEditingRole(null);
    setFormDisplayName("");
    setFormSlug("");
    setFormPerms({});
    setError("");
    setShowRoleModal(true);
  }

  function openEditRole(r: Role) {
    setEditingRole(r);
    setFormDisplayName(r.display_name);
    setFormSlug(r.name);
    const perms: Record<string, boolean> = {};
    for (const p of r.permissions) perms[p] = true;
    setFormPerms(perms);
    setError("");
    setShowRoleModal(true);
  }

  async function handleSaveRole() {
    if (!formDisplayName.trim()) {
      setError("El nombre visible es obligatorio");
      return;
    }

    setSaving(true);
    setError("");

    const permissions = Object.entries(formPerms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const body = editingRole
      ? { id: editingRole.id, display_name: formDisplayName.trim(), permissions }
      : { name: formSlug.trim() || formDisplayName.trim(), display_name: formDisplayName.trim(), permissions };

    const res = await fetch("/api/admin/roles", {
      method: editingRole ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowRoleModal(false);
      loadRoles();
    } else {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    }
    setSaving(false);
  }

  async function handleDeleteRole(r: Role) {
    const res = await fetch("/api/admin/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, name: r.name }),
    });
    if (res.ok) {
      setDeletingRole(null);
      loadRoles();
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar");
      setDeletingRole(null);
    }
  }

  function openAssignUser(u: User) {
    setEditingUser(u);
    setAssignRole(u.role);
    setShowUserModal(true);
  }

  async function handleAssignRole() {
    if (!editingUser) return;
    setSaving(true);
    const res = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: editingUser.id, role: assignRole }),
    });
    if (res.ok) {
      setShowUserModal(false);
      loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Error al asignar rol");
    }
    setSaving(false);
  }

  const isBuiltIn = (name: string) => ["admin", "teacher", "viewer"].includes(name);

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Roles y Permisos</h1>
            <p className="text-sm text-gray-500">Gestiona roles y asigna permisos por módulo</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">← Volver</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "roles"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "users"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Usuarios ({users.length})
          </button>
        </div>

        {/* ═══ ROLES TAB ═══ */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={openNewRole} className="btn-primary text-sm">+ Nuevo rol</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{r.display_name}</h3>
                      <p className="text-xs text-gray-400 font-mono">{r.name}</p>
                    </div>
                    {isBuiltIn(r.name) && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        Sistema
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {r.permissions.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Sin permisos asignados</span>
                    ) : (
                      r.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded"
                        >
                          {ALL_MODULES.find((m) => m.slug === p)?.label || p}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditRole(r)}
                      className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                    >
                      Editar permisos
                    </button>
                    {!isBuiltIn(r.name) && (
                      <>
                        {deletingRole === r.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteRole(r)}
                              className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded font-medium"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletingRole(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingRole(r.id)}
                            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                          >
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {activeTab === "users" && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Correo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleObj = roles.find((r) => r.name === u.role);
                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{u.full_name}</span>
                        {u.label && (
                          <span className="ml-2 text-xs text-gray-400">{u.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700">
                          {roleObj?.display_name || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openAssignUser(u)}
                          className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded"
                        >
                          Cambiar rol
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ═══ ROLE MODAL ═══ */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editingRole ? `Editar: ${editingRole.display_name}` : "Nuevo rol"}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre visible
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Ej. Directora, Secretaria, Prefectura"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {!editingRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (identificador interno)
                    </label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      placeholder="directora"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Se genera automáticamente si lo dejas vacío
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permisos por módulo
                  </label>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {ALL_MODULES.map((m) => (
                      <div
                        key={m.slug}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          formPerms[m.slug]
                            ? "border-primary-300 bg-primary-50"
                            : "border-gray-200 bg-white"
                        }`}
                        onClick={() =>
                          setFormPerms((prev) => ({ ...prev, [m.slug]: !prev[m.slug] }))
                        }
                      >
                        <input
                          type="checkbox"
                          checked={formPerms[m.slug] || false}
                          onChange={() =>
                            setFormPerms((prev) => ({ ...prev, [m.slug]: !prev[m.slug] }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">{m.label}</span>
                          <p className="text-xs text-gray-400">{m.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        ALL_MODULES.forEach((m) => (all[m.slug] = true));
                        setFormPerms(all);
                      }}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPerms({})}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Quitar todos
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowRoleModal(false)} className="btn-secondary text-sm" disabled={saving}>
                Cancelar
              </button>
              <button onClick={handleSaveRole} disabled={saving} className="btn-primary text-sm">
                {saving ? "Guardando..." : editingRole ? "Actualizar" : "Crear rol"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ USER ROLE ASSIGNMENT MODAL ═══ */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar rol</h2>
              <p className="text-sm text-gray-500 mb-4">{editingUser.full_name}</p>

              <div className="space-y-2">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                      assignRole === r.name
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => setAssignRole(r.name)}
                  >
                    <input
                      type="radio"
                      name="role"
                      checked={assignRole === r.name}
                      onChange={() => setAssignRole(r.name)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{r.display_name}</span>
                      <p className="text-xs text-gray-400">
                        {r.permissions.length} permiso{r.permissions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowUserModal(false)} className="btn-secondary text-sm" disabled={saving}>
                Cancelar
              </button>
              <button onClick={handleAssignRole} disabled={saving} className="btn-primary text-sm">
                {saving ? "Guardando..." : "Asignar rol"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
