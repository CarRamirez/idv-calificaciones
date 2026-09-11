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

type TeacherRow = { full_name: string; email: string; password: string };
type ResultRow = { email: string; ok: boolean; error?: string };

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { teachers } = (await req.json()) as { teachers: TeacherRow[] };

  if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
    return NextResponse.json({ error: "No se recibieron profesores" }, { status: 400 });
  }

  if (teachers.length > 100) {
    return NextResponse.json({ error: "Maximo 100 profesores por carga" }, { status: 400 });
  }

  const admin = createAdminClient();
  const results: ResultRow[] = [];

  for (const t of teachers) {
    const email = (t.email || "").trim().toLowerCase();
    const full_name = (t.full_name || "").trim().toUpperCase();
    const password = (t.password || "").trim();

    if (!email || !full_name || !password) {
      results.push({ email: email || "(vacio)", ok: false, error: "Campos incompletos" });
      continue;
    }

    if (password.length < 6) {
      results.push({ email, ok: false, error: "Contrasena menor a 6 caracteres" });
      continue;
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      results.push({ email, ok: false, error: authError.message });
      continue;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authData.user.id,
      full_name,
      email,
      role: "teacher",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      results.push({ email, ok: false, error: profileError.message });
      continue;
    }

    results.push({ email, ok: true });
  }

  const created = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({ created, failed, results });
}
