import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPeriodNotification } from "@/lib/email";

const ADMIN_ROLES = ["admin", "directora_anita"];

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { periodName, openDate, closeDate } = await req.json();
    if (!periodName) {
      return NextResponse.json({ error: "Falta periodName" }, { status: 400 });
    }

    // Get all teachers with email
    const admin = createAdminClient();
    const { data: teachers, error } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "teacher")
      .not("email", "is", null);

    if (error) {
      console.error("Error fetching teachers:", error);
      return NextResponse.json({ error: "Error consultando maestros" }, { status: 500 });
    }

    const recipients = (teachers || [])
      .filter((t: any) => t.email && t.email.trim() !== "")
      .map((t: any) => ({ email: t.email, fullName: t.full_name }));

    if (recipients.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: [],
        message: "No hay maestros con correo registrado",
      });
    }

    const result = await sendPeriodNotification(recipients, {
      periodName,
      openDate,
      closeDate,
    });

    return NextResponse.json({
      ...result,
      total: recipients.length,
      message: `Notificación enviada a ${result.sent} de ${recipients.length} maestro(s)`,
    });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
