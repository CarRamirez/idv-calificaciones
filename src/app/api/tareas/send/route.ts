import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHomeworkEmail } from "@/lib/email";

async function verifyAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return profile;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { group_id, subjects } = await req.json();

  // subjects: [{ subject_id, subject_name, comment? }]
  if (!group_id || !subjects || subjects.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una materia" }, { status: 400 });
  }

  // Get group info + parent_email
  const supabaseAdmin = createAdminClient();
  const { data: group } = await supabaseAdmin
    .from("groups")
    .select("id, grade, letter, parent_email")
    .eq("id", group_id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
  }

  if (!group.parent_email) {
    return NextResponse.json(
      { error: `El grupo ${group.grade}°${group.letter} no tiene correo de padres configurado. Ve a Administración de Grupos para agregarlo.` },
      { status: 400 }
    );
  }

  const groupLabel = `${group.grade}°${group.letter}`;
  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    await sendHomeworkEmail({
      to: group.parent_email,
      groupLabel,
      subjects: subjects.map((s: any) => ({
        name: s.subject_name,
        comment: s.comment || undefined,
      })),
      date: today,
    });

    // Log the notification
    await supabaseAdmin.from("homework_notifications").insert({
      group_id: group.id,
      sent_by: admin.id,
      subjects: subjects,
      recipient_email: group.parent_email,
    });

    return NextResponse.json({
      ok: true,
      message: `Correo enviado a ${group.parent_email} para ${groupLabel}`,
    });
  } catch (err: any) {
    console.error("Error enviando correo:", err);
    return NextResponse.json(
      { error: `Error al enviar correo: ${err.message}` },
      { status: 500 }
    );
  }
}

// GET: Historial de notificaciones
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("homework_notifications")
    .select("id, group_id, subjects, recipient_email, sent_at, profiles:sent_by(full_name), groups:group_id(grade, letter)")
    .order("sent_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data || [] });
}
