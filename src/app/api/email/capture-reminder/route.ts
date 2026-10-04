import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const ADMIN_ROLES = ["admin", "directora_anita"];

function buildReminderHTML(teacherName: string, periodName: string, pendingDetails: string[]): string {
  const detailsHtml = pendingDetails
    .map((d) => `<li style="margin-bottom:6px;color:#374151;font-size:14px;">${d}</li>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); padding: 32px 32px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.025em;">
            Instituto Don Vasco
          </h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
            Sistema de Calificaciones — Mnemósine
          </p>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="margin-bottom:24px;">
            <span style="display:inline-block;background-color:#fef3c7;color:#d97706;font-size:12px;font-weight:700;padding:6px 14px;border-radius:99px;letter-spacing:0.025em;">
              ⏰ RECORDATORIO
            </span>
          </div>
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">
            Captura de calificaciones pendiente
          </h2>
          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
            Estimado(a) <strong>${teacherName}</strong>, le recordamos que tiene calificaciones pendientes de capturar para el periodo <strong>${periodName}</strong>.
          </p>
          ${pendingDetails.length > 0 ? `
          <div style="background-color:#fffbeb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 10px;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Asignaciones pendientes:</p>
            <ul style="list-style:none;padding:0;margin:0;">
              ${detailsHtml}
            </ul>
          </div>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 16px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://idv-calificaciones.vercel.app"}/captura"
                 style="display:inline-block;background:linear-gradient(135deg,#d97706,#ea580c);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">
                Ir a capturar calificaciones →
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
            Este correo fue enviado como recordatorio por la dirección del Instituto Don Vasco.
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
            Instituto Don Vasco · Secundaria<br/>Dirección Secundaria — Ciclo 2026-2027
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
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
  if (!ADMIN_ROLES.includes(effectiveProfile.role)) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherIds, periodName } = body as {
    teacherIds: string[];
    periodName: string;
  };

  if (!teacherIds || teacherIds.length === 0 || !periodName) {
    return NextResponse.json({ error: "Missing teacherIds or periodName" }, { status: 400 });
  }

  // Fetch teacher emails and pending details
  const { data: teachers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", teacherIds);

  if (!teachers || teachers.length === 0) {
    return NextResponse.json({ error: "No teachers found" }, { status: 404 });
  }

  // Get pending details from the stats captureAlerts (we need to recompute for the specific teachers)
  // For simplicity, the client sends pendingDetails per teacher
  const pendingMap: Record<string, string[]> = body.pendingMap || {};

  let sent = 0;
  const failed: string[] = [];
  const noEmail: string[] = [];

  for (const teacher of teachers) {
    if (!teacher.email) {
      noEmail.push(teacher.full_name);
      continue;
    }

    const pending = pendingMap[teacher.id] || [];
    const html = buildReminderHTML(teacher.full_name, periodName, pending);

    try {
      await transporter.sendMail({
        from: `"Dirección IDV" <${process.env.SMTP_USER}>`,
        to: teacher.email,
        subject: `⏰ Recordatorio: Calificaciones pendientes — ${periodName} | Instituto Don Vasco`,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder to ${teacher.email}:`, err);
      failed.push(teacher.full_name);
    }
  }

  return NextResponse.json({ sent, failed, noEmail });
}
