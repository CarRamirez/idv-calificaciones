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

// GET: List all subjects ordered by grade + sort_order
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subjects")
    .select("id, name, short_name, grade, counts_for_avg, sort_order, created_at")
    .order("grade")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Create subject
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { name, short_name, grade, counts_for_avg, sort_order } = await req.json();

  if (!name?.trim() || !short_name?.trim() || !grade) {
    return NextResponse.json({ error: "Nombre, abreviatura y grado son obligatorios" }, { status: 400 });
  }

  if (grade < 1 || grade > 3) {
    return NextResponse.json({ error: "El grado debe ser 1, 2 o 3" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subjects")
    .insert({
      name: name.trim(),
      short_name: short_name.trim().toUpperCase(),
      grade: Number(grade),
      counts_for_avg: counts_for_avg !== false,
      sort_order: Number(sort_order) || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// PUT: Update subject
export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, name, short_name, grade, counts_for_avg, sort_order } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (short_name !== undefined) updates.short_name = short_name.trim().toUpperCase();
  if (grade !== undefined) updates.grade = Number(grade);
  if (counts_for_avg !== undefined) updates.counts_for_avg = counts_for_avg;
  if (sort_order !== undefined) updates.sort_order = Number(sort_order);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subjects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE: Remove subject
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
