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
  groupLabel,
  subjects,
  date,
}: {
  to: string;
  groupLabel: string;
  subjects: { name: string; comment?: string }[];
  date: string;
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

Agradecemos su apoyo para que cumpla con sus actividades escolares.

Atentamente,
Prefectura — Instituto Don Vasco
Secundaria | Ciclo 2026-2027`;

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
    subject: `Tarea del día ${date} — ${groupLabel} | Instituto Don Vasco`,
    text,
    html,
  });
}
