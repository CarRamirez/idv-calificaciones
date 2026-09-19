import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Verify caller has admin_profesores permission
async function verifyTeacherAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  if (profile.role === "admin") return { role: "admin", isAdmin: true };
  // Check if custom role has admin_profesores permission
  const { data: roleData } = await supabase
    .from("roles")
    .select("permissions")
    .eq("name", profile.role)
    .single();
  if (roleData?.permissions?.includes("admin_profesores")) {
    return { role: profile.role, isAdmin: false };
  }
  return null;
}

// POST: Create teacher account
export async function POST(req: NextRequest) {
  const caller = await verifyTeacherAdmin();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { email, password, full_name, role, label } = await req.json();
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  // Validate role — non-admin callers can only create teachers
  const validRoles = ["admin", "teacher"];
  let finalRole = validRoles.includes(role) ? role : "teacher";
  if (!caller.isAdmin && finalRole === "admin") {
    finalRole = "teacher";
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create profile with teacher role
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: authData.user.id,
      full_name: full_name.toUpperCase(),
      email: email.toLowerCase(),
      role: finalRole,
      ...(label ? { label: label.trim() } : {}),
    });

  if (profileError) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: authData.user.id, email: authData.user.email });
}

// DELETE: Remove teacher account

// PUT: Update teacher profile
export async function PUT(req: NextRequest) {
  const caller = await verifyTeacherAdmin();
  if (!caller) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, full_name, email, role, label, password } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  const admin = createAdminClient();

  // Non-admin callers cannot edit admin profiles
  if (!caller.isAdmin) {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (targetProfile?.role === "admin") {
      return NextResponse.json(
        { error: "No tienes permiso para editar administradores" },
        { status: 403 }
      );
    }
  }

  // Build profile update
  const updates: Record<string, any> = {};
  if (full_name !== undefined) updates.full_name = full_name.trim().toUpperCase();
  if (email !== undefined) updates.email = email.trim().toLowerCase();
  if (label !== undefined) updates.label = label.trim() || null;
  if (role !== undefined) {
    // Non-admin callers cannot assign admin role
    if (!caller.isAdmin && role === "admin") {
      updates.role = "teacher";
    } else {
      updates.role = role;
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: profileError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", id);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  // Update auth email if changed
  if (email) {
    await admin.auth.admin.updateUserById(id, { email: email.trim().toLowerCase() });
  }

  // Reset password if provided
  if (password && password.length >= 6) {
    const { error: passError } = await admin.auth.admin.updateUserById(id, { password });
    if (passError) {
      return NextResponse.json({ error: passError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyTeacherAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  const admin = createAdminClient();

  // Delete profile (cascades assignments)
  await admin.from("profiles").delete().eq("id", id);
  // Delete auth user
  await admin.auth.admin.deleteUser(id);

  return NextResponse.json({ ok: true });
}
