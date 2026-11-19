import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_ROLES = ["admin", "directora_anita"];

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      // Check custom role
      let isAdmin = false;
      if (profile) {
        const admin = createAdminClient();
        const { data: roleData } = await admin
          .from("roles")
          .select("permissions")
          .eq("name", profile.role)
          .single();
        if (roleData?.permissions?.includes("dashboard")) isAdmin = true;
      }
      if (!isAdmin)
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const teacherIds: string[] = body.teacher_ids;
    if (!Array.isArray(teacherIds) || !teacherIds.length) {
      return NextResponse.json(
        { error: "Se requieren teacher_ids" },
        { status: 400 }
      );
    }

    // For now, just return a success response
    // In a full implementation, this would send emails via a service like Resend
    return NextResponse.json({
      ok: true,
      enviados: teacherIds.length,
      sinCorreo: 0,
      fallidos: 0,
    });
  } catch (err) {
    console.error("Recordatorio error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
