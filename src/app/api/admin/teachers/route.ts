import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Verify caller is admin
async function verifyAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

// POST: Create teacher account
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { email, password, full_name } = await req.json();
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
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
      role: "teacher",
    });

  if (profileError) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: authData.user.id, email: authData.user.email });
}

// DELETE: Remove teacher account
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
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
