import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return user;
}

// GET: List all evaluation periods for current school year
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("evaluation_periods")
    .select("*, school_years!inner(name, is_current)")
    .eq("school_years.is_current", true)
    .order("period_number");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ periods: data || [] });
}

// PATCH: Toggle period open/close
export async function PATCH(req: NextRequest) {
  const adminUser = await verifyAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, is_open, open_date, close_date } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Falta ID del periodo" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const updateData: Record<string, unknown> = {
    updated_by: adminUser.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof is_open === "boolean") updateData.is_open = is_open;
  if (open_date !== undefined) updateData.open_date = open_date;
  if (close_date !== undefined) updateData.close_date = close_date;

  const { data, error } = await supabase
    .from("evaluation_periods")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ period: data });
}
