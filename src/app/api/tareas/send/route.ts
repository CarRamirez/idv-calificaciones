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
  if (!profile) return null;
  if (profile.role === "admin") return profile;
  // Check custom role permissions
  const admin = createAdminClient();
  const { data: roleData } = await admin
    .from("roles")
    .select("permissions")
    .eq("name", profile.role)
    .single();
  if (roleData?.permissions?.includes("tareas")) return profile;
  return null;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { group_id, subjects, recipients, cc_emails, custom_message } = await req.json();

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
    // Build recipient list from selected checkboxes
    const toAddresses: string[] = [];
    const ccAddresses: string[] = [];

    if (recipients && Array.isArray(recipients)) {
      for (const r of recipients) {
        if (r === "padres" && group.parent_email) {
          toAddresses.push(group.parent_email);
        }
      }
    } else {
      // Fallback: send to parent email only
      if (group.parent_email) toAddresses.push(group.parent_email);
    }

    // Add custom emails
    if (cc_emails && Array.isArray(cc_emails)) {
      for (const email of cc_emails) {
        const trimmed = email.trim();
        if (trimmed && trimmed.includes("@")) {
          ccAddresses.push(trimmed);
        }
      }
    }

    if (toAddresses.length === 0 && ccAddresses.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos un destinatario" },
        { status: 400 }
      );
    }

    // If no "to" but has CC, move first CC to "to"
    const finalTo = toAddresses.length > 0 ? toAddresses : [ccAddresses.shift()!];

    await sendHomeworkEmail({
      to: finalTo,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      groupLabel,
      subjects: subjects.map((s: any) => ({
        name: s.subject_name,
        comment: s.comment || undefined,
      })),
      date: today,
      customMessage: custom_message || undefined,
    });

    // Log the notification
    const allRecipients = [...finalTo, ...ccAddresses].join(", ");
    await supabaseAdmin.from("homework_notifications").insert({
      group_id: group.id,
      sent_by: admin.id,
      subjects: subjects,
      recipient_email: allRecipients,
    });

    return NextResponse.json({
      ok: true,
      message: `Correo enviado a ${allRecipients} para ${groupLabel}`,
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


// DELETE: Eliminar notificación del historial
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("homework_notifications")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
