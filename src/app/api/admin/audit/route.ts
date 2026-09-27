import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROLES = ["admin", "directora_anita"];
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const { effectiveProfile } = await getEffectiveProfile(user.id, profile);
  if (!ADMIN_ROLES.includes(effectiveProfile.role))
    return NextResponse.json({ error: "No access" }, { status: 403 });

  // ── Parse query params ──
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const teacherId = sp.get("teacher") || null;
  const studentId = sp.get("student") || null;
  const period = sp.get("period") ? parseInt(sp.get("period")!) : null;
  const action = sp.get("action") || null;
  const dateFrom = sp.get("from") || null;
  const dateTo = sp.get("to") || null;

  // ── Build query ──
  let query = supabase
    .from("grade_audit_log")
    .select(
      `id, student_id, subject_id, period, action,
       old_score, new_score, old_absences, new_absences,
       changed_by, changed_at,
       students!inner ( full_name, group_id, groups!inner ( grade, letter ) ),
       subjects!inner ( name, short_name ),
       profiles!grade_audit_log_changed_by_fkey ( full_name )`,
      { count: "exact" }
    )
    .order("changed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (teacherId) query = query.eq("changed_by", teacherId);
  if (studentId) query = query.eq("student_id", studentId);
  if (period) query = query.eq("period", period);
  if (action) query = query.eq("action", action);
  if (dateFrom) query = query.gte("changed_at", dateFrom);
  if (dateTo) query = query.lte("changed_at", dateTo + "T23:59:59Z");

  const { data, count, error } = await query;

  if (error) {
    console.error("Audit query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE),
  });
}
