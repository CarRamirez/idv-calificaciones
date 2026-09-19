import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ results: [] });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const admin = createAdminClient();
  const results: Array<{
    id: string;
    name: string;
    type: "student" | "teacher";
    detail: string;
    href: string;
  }> = [];

  // Search students — all roles can search students
  const { data: students } = await admin
    .from("students")
    .select("id, full_name, group_id, groups!inner(grade, letter)")
    .eq("is_active", true)
    .ilike("full_name", `%${q}%`)
    .limit(8);

  for (const s of students || []) {
    const g = (s as any).groups;
    results.push({
      id: s.id,
      name: s.full_name,
      type: "student",
      detail: `${g.grade}°${g.letter}`,
      href: `/boleta/${s.id}`,
    });
  }

  // Search teachers/profiles — all roles can search
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, label")
    .ilike("full_name", `%${q}%`)
    .limit(8);

  for (const p of profiles || []) {
    const roleLabel = p.role === "admin" ? "Admin" : p.role === "teacher" ? "Profesor" : p.label || p.role;
    results.push({
      id: p.id,
      name: p.full_name,
      type: "teacher",
      detail: roleLabel,
      href: `/perfil/${p.id}`,
    });
  }

  return NextResponse.json({ results });
}
