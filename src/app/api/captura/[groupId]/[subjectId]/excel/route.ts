import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7, 8] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Septiembre", 2: "Octubre", 3: "Nov-Dic", 4: "Ene-Feb",
  5: "Marzo", 6: "Abril", 7: "Mayo", 8: "Junio",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string; subjectId: string } }
) {
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

  // ── Fetch data ──
  const [groupRes, subjectRes, studentsRes] = await Promise.all([
    supabase.from("groups").select("id, grade, letter").eq("id", params.groupId).single(),
    supabase.from("subjects").select("id, name, short_name, input_type, counts_for_avg").eq("id", params.subjectId).single(),
    supabase
      .from("students")
      .select("id, full_name, list_num")
      .eq("group_id", params.groupId)
      .eq("status", "activo")
      .order("list_num"),
  ]);

  const group = groupRes.data;
  const subject = subjectRes.data;
  const students = studentsRes.data || [];

  if (!group || !subject) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const studentIds = students.map((s: any) => s.id);
  let allGrades: any[] = [];
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("grades")
      .select("student_id, period, score, comment")
      .eq("subject_id", params.subjectId)
      .in("student_id", studentIds);
    allGrades = data || [];
  }

  // Build grade map
  const gradeMap: Record<string, Record<number, { score: number | null; comment?: string }>> = {};
  allGrades.forEach((g: any) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    gradeMap[g.student_id][g.period] = { score: g.score, comment: g.comment || undefined };
  });

  const inputType = subject.input_type || "score";
  const isCounter = inputType === "counter" || inputType === "counter_max";

  function getScore(studentId: string, period: number): number | null {
    return gradeMap[studentId]?.[period]?.score ?? null;
  }
  function getComment(studentId: string, period: number): string | undefined {
    return gradeMap[studentId]?.[period]?.comment;
  }
  function getTrimAvg(studentId: string, periods: number[]): number | null {
    const scores = periods.map((p) => getScore(studentId, p)).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    if (isCounter) return scores.reduce((a, b) => a + b, 0);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  function getFinal(studentId: string): number | null {
    const avgs = TRIMESTERS.map((t) => {
      const scores = t.periods.map((p) => getScore(studentId, p)).filter((s): s is number => s !== null);
      if (scores.length === 0) return null;
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  // ── Build workbook ──
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mnemósine — Instituto Don Vasco";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4E9E" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  function semaforoFill(score: number | null): ExcelJS.Fill | undefined {
    if (score === null || isCounter) return undefined;
    if (score < 7) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    if (score < 8) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    return { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  }

  function applyHeaderStyle(ws: ExcelJS.Worksheet, row: number, cols: number) {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(row, c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    }
  }

  // ═══════════ HOJAS POR TRIMESTRE ═══════════
  for (const trim of TRIMESTERS) {
    const ws = wb.addWorksheet(trim.name);
    // Columns: N° | Nombre | period1 | period2 | ... | Prom/Total
    const totalCols = 2 + trim.periods.length + 1;

    ws.mergeCells(1, 1, 1, totalCols);
    const tCell = ws.getCell(1, 1);
    tCell.value = `${subject.name} — ${group.grade}° "${group.letter}" — ${trim.name}`;
    tCell.font = { bold: true, size: 12 };
    tCell.alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, totalCols);
    const infoCell = ws.getCell(2, 1);
    const now = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long" });
    infoCell.value = `Profesor: ${effectiveProfile.full_name} · Generado: ${now}`;
    infoCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
    infoCell.alignment = { horizontal: "center" };

    const hRow = 4;
    ws.getCell(hRow, 1).value = "N°";
    ws.getCell(hRow, 2).value = "Nombre del Alumno";
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 32;

    let col = 3;
    for (const p of trim.periods) {
      ws.getCell(hRow, col).value = PERIOD_NAMES[p];
      ws.getColumn(col).width = 10;
      col++;
    }
    ws.getCell(hRow, col).value = isCounter ? "Total" : "Prom.";
    ws.getColumn(col).width = 10;

    applyHeaderStyle(ws, hRow, totalCols);

    students.forEach((student: any, idx: number) => {
      const row = hRow + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const p of trim.periods) {
        const score = getScore(student.id, p);
        const comment = getComment(student.id, p);

        const sc = ws.getCell(row, c);
        sc.value = score !== null ? (isCounter ? score : Math.round(score)) : null;
        sc.alignment = { horizontal: "center" };
        const f = semaforoFill(score);
        if (f) sc.fill = f;
        if (comment) {
          sc.note = { texts: [{ text: comment, font: { size: 9, name: "Arial" } }] };
        }

        c++;
      }

      const trimVal = getTrimAvg(student.id, trim.periods);

      const tc = ws.getCell(row, c);
      tc.value = trimVal !== null ? (isCounter ? trimVal : Math.round(trimVal)) : null;
      tc.alignment = { horizontal: "center" };
      tc.font = { bold: true };
      const tf = semaforoFill(trimVal);
      if (tf) tc.fill = tf;

      for (let cc = 1; cc <= totalCols; cc++) {
        ws.getCell(row, cc).border = thinBorder;
      }
    });
  }

  // ═══════════ HOJA RESUMEN ═══════════
  const wsRes = wb.addWorksheet("Resumen Anual");
  // Columns: N° | Nombre | 1erTrim | 2doTrim | 3erTrim | Prom.Final
  const resCols = 6;

  wsRes.mergeCells(1, 1, 1, resCols);
  const resTitle = wsRes.getCell(1, 1);
  resTitle.value = `${subject.name} — ${group.grade}° "${group.letter}" — Resumen Anual`;
  resTitle.font = { bold: true, size: 12 };
  resTitle.alignment = { horizontal: "center" };

  wsRes.mergeCells(2, 1, 2, resCols);
  const resInfo = wsRes.getCell(2, 1);
  const nowRes = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long" });
  resInfo.value = `Profesor: ${effectiveProfile.full_name} · Generado: ${nowRes}`;
  resInfo.font = { size: 9, italic: true, color: { argb: "FF666666" } };
  resInfo.alignment = { horizontal: "center" };

  const rh = 4;
  wsRes.getCell(rh, 1).value = "N°";
  wsRes.getCell(rh, 2).value = "Nombre del Alumno";
  wsRes.getCell(rh, 3).value = "1er Trim.";
  wsRes.getCell(rh, 4).value = "2do Trim.";
  wsRes.getCell(rh, 5).value = "3er Trim.";
  wsRes.getCell(rh, 6).value = "Prom. Final";

  wsRes.getColumn(1).width = 5;
  wsRes.getColumn(2).width = 32;
  for (let c = 3; c <= 5; c++) wsRes.getColumn(c).width = 10;
  wsRes.getColumn(6).width = 12;

  applyHeaderStyle(wsRes, rh, resCols);

  students.forEach((student: any, idx: number) => {
    const row = rh + 1 + idx;
    wsRes.getCell(row, 1).value = student.list_num;
    wsRes.getCell(row, 1).alignment = { horizontal: "center" };
    wsRes.getCell(row, 2).value = student.full_name;
    wsRes.getCell(row, 2).font = { size: 9 };

    for (const trim of TRIMESTERS) {
      const colOffset = trim.id + 2;
      const avg = getTrimAvg(student.id, trim.periods);

      const ac = wsRes.getCell(row, colOffset);
      ac.value = avg !== null ? (isCounter ? avg : Math.round(avg)) : null;
      ac.alignment = { horizontal: "center" };
      ac.font = { bold: true };
      const f = semaforoFill(avg);
      if (f) ac.fill = f;
    }

    const final = getFinal(student.id);
    const fc = wsRes.getCell(row, 6);
    fc.value = final !== null ? (isCounter ? Math.round(final) : Math.round(final * 10) / 10) : null;
    fc.alignment = { horizontal: "center" };
    fc.font = { bold: true, size: 10 };
    const ff = semaforoFill(final);
    if (ff) fc.fill = ff;

    for (let cc = 1; cc <= resCols; cc++) {
      wsRes.getCell(row, cc).border = thinBorder;
    }
  });

  // ── Generate buffer ──
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `Registro_${subject.short_name}_${group.grade}${group.letter}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
