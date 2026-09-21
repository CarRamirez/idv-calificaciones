import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyPermission() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return false;

  // Check impersonation
  const cookieStore = cookies();
  const impersonateAs = cookieStore.get("impersonate_as")?.value;
  const impersonateAdminId = cookieStore.get("impersonate_admin_id")?.value;

  let effectiveRole = profile.role;

  if (impersonateAs && impersonateAdminId === user.id && profile.role === "admin") {
    const admin = createAdminClient();
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", impersonateAs)
      .single();
    if (targetProfile) effectiveRole = targetProfile.role;
  }

  const ROLES_WITH_PERM = ["admin", "directora_anita"];
  if (ROLES_WITH_PERM.includes(effectiveRole)) return true;

  // Check custom role
  const adminClient = createAdminClient();
  const { data: roleData } = await adminClient
    .from("roles")
    .select("permissions")
    .eq("name", effectiveRole)
    .single();
  return roleData?.permissions?.includes("admin_profesores") || false;
}

// POST: Create assignment
export async function POST(req: NextRequest) {
  if (!(await verifyPermission())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { teacher_id, group_id, subject_id } = await req.json();
  if (!teacher_id || !group_id || !subject_id) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check duplicate
  const { data: existing } = await admin
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacher_id)
    .eq("group_id", group_id)
    .eq("subject_id", subject_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "La asignación ya existe" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("teacher_assignments")
    .insert({ teacher_id, group_id, subject_id })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id });
}

// DELETE: Remove assignment
export async function DELETE(req: NextRequest) {
  if (!(await verifyPermission())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("teacher_assignments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// GET: List all assignments
export async function GET() {
  if (!(await verifyPermission())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teacher_assignments")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ assignments: data || [] });
}
