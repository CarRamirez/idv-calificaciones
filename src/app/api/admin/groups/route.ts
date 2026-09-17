import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("groups")
    .select("id, grade, letter, parent_email, created_at")
    .order("grade")
    .order("letter");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { grade, letter, parent_email } = await req.json();
  if (!grade || !letter) {
    return NextResponse.json({ error: "Grado y letra son obligatorios" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("groups").select("id").eq("grade", grade).eq("letter", letter.toUpperCase()).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `El grupo ${grade}°${letter.toUpperCase()} ya existe` }, { status: 409 });
  }
  const { data, error } = await admin
    .from("groups")
    .insert({ grade, letter: letter.toUpperCase(), parent_email: parent_email || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id, grade, letter, parent_email } = await req.json();
  if (!id || !grade || !letter) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("groups").select("id").eq("grade", grade).eq("letter", letter.toUpperCase()).neq("id", id).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `El grupo ${grade}°${letter.toUpperCase()} ya existe` }, { status: 409 });
  }
  const { data, error } = await admin
    .from("groups")
    .update({ grade, letter: letter.toUpperCase(), parent_email: parent_email || null })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  const admin = createAdminClient();
  const { count } = await admin
    .from("students").select("id", { count: "exact", head: true }).eq("group_id", id);
  if (count && count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: el grupo tiene ${count} alumno(s) asignado(s). Reasígnalos primero.` },
      { status: 400 }
    );
  }
  const { error } = await admin.from("groups").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
