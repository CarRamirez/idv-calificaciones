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

export async function sendHomeworkEmail({
  to,
  cc,
  groupLabel,
  subjects,
  date,
  customMessage,
}: {
  to: string | string[];
  cc?: string[];
  groupLabel: string;
  subjects: { name: string; comment?: string }[];
  date: string;
  customMessage?: string;
}) {
  const subjectLines = subjects
    .map((s) => {
      const comment = s.comment ? ` — ${s.comment}` : "";
      return `• ${s.name}${comment}`;
    })
    .join("\n");

  const subjectLinesHtml = subjects
    .map((s) => {
      const comment = s.comment
        ? `<span style="color:#666;"> — ${s.comment}</span>`
        : "";
      return `<li style="margin-bottom:6px;"><strong>${s.name}</strong>${comment}</li>`;
    })
    .join("");

  const text = `Estimado padre de familia,

Le informamos que el día ${date}, su hijo(a) del grupo ${groupLabel} lleva tarea de:

${subjectLines}

${customMessage ? `\nNota adicional: ${customMessage}\n` : ""}Agradecemos su apoyo para que cumpla con sus actividades escolares.

Atentamente,
Prefectura — Instituto Don Vasco
Secundaria | Ciclo 2026-2027`;

  const customMessageHtml = customMessage
    ? `<div style="background:#fef9e7;border-left:4px solid #d4a017;padding:12px 16px;border-radius:0 6px 6px 0;margin:16px 0;">
      <p style="color:#7a6c0a;font-size:14px;margin:0;"><strong>Nota:</strong> ${customMessage}</p>
    </div>`
    : "";

  const html = `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1e3a5f;border-radius:10px 10px 0 0;padding:20px 24px;text-align:center;">
    <h2 style="color:#fff;margin:0;font-size:18px;">Instituto Don Vasco</h2>
    <p style="color:#ccd6e0;margin:4px 0 0;font-size:13px;">Secundaria — Prefectura</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px;">
    <p style="color:#333;font-size:15px;margin-top:0;">Estimado padre de familia,</p>
    <p style="color:#333;font-size:15px;">
      Le informamos que el día <strong>${date}</strong>, su hijo(a) del grupo
      <strong>${groupLabel}</strong> lleva tarea de:
    </p>
    <ul style="list-style:none;padding:0;margin:16px 0;">
      ${subjectLinesHtml}
    </ul>
    ${customMessageHtml}
    <p style="color:#333;font-size:15px;">
      Agradecemos su apoyo para que cumpla con sus actividades escolares.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
    <p style="color:#999;font-size:12px;margin-bottom:0;text-align:center;">
      Atentamente, Prefectura — Instituto Don Vasco<br/>
      Camino, Verdad, Vida — Ciclo 2026-2027
    </p>
  </div>
</div>`;

  await transporter.sendMail({
    from: `"Prefectura IDV" <${process.env.SMTP_USER}>`,
    to,
    ...(cc && cc.length > 0 ? { cc } : {}),
    subject: `Tarea del día ${date} — ${groupLabel} | Instituto Don Vasco`,
    text,
    html,
  });
}

// ── Period notification email ──

interface PeriodNotificationData {
  periodName: string;
  openDate: string | null;
  closeDate: string | null;
}

function formatDateMX(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });
}

function buildPeriodEmailHTML(data: PeriodNotificationData): string {
  const { periodName, openDate, closeDate } = data;

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 32px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.025em;">
            Instituto Don Vasco
          </h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
            Sistema de Calificaciones — Mnemósine
          </p>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="margin-bottom:24px;">
            <span style="display:inline-block;background-color:#ecfdf5;color:#059669;font-size:12px;font-weight:700;padding:6px 14px;border-radius:99px;letter-spacing:0.025em;">
              ● PERIODO ABIERTO
            </span>
          </div>
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:800;">
            ${periodName}
          </h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
            Se ha abierto un nuevo periodo de captura de calificaciones. Por favor registra las calificaciones de tus alumnos dentro del plazo establecido.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              ${openDate ? `
              <td style="width:50%;padding-right:8px;vertical-align:top;">
                <div style="background-color:#f0fdf4;border-radius:12px;padding:16px;">
                  <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Apertura</p>
                  <p style="margin:0;color:#166534;font-size:13px;font-weight:600;">${formatDateMX(openDate)}</p>
                </div>
              </td>` : ""}
              ${closeDate ? `
              <td style="width:50%;padding-left:8px;vertical-align:top;">
                <div style="background-color:#fef2f2;border-radius:12px;padding:16px;">
                  <p style="margin:0 0 4px;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Cierre</p>
                  <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600;">${formatDateMX(closeDate)}</p>
                </div>
              </td>` : ""}
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 16px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://idv-calificaciones.vercel.app"}/dashboard"
                 style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">
                Ir a capturar calificaciones →
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
            Este correo fue enviado automáticamente por el sistema de calificaciones del Instituto Don Vasco.
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
            Instituto Don Vasco · Uruapan, Michoacán
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPeriodNotification(
  recipients: { email: string; fullName: string }[],
  periodData: PeriodNotificationData
): Promise<{ sent: number; failed: string[] }> {
  const html = buildPeriodEmailHTML(periodData);
  const subject = `📋 Periodo abierto: ${periodData.periodName} — Instituto Don Vasco`;

  let sent = 0;
  const failed: string[] = [];

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: `"IDV Calificaciones" <${process.env.SMTP_USER}>`,
        to: recipient.email,
        subject,
        html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err);
      failed.push(recipient.email);
    }
  }

  return { sent, failed };
}
