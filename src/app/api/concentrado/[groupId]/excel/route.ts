import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { fetchAllGrades } from "@/lib/fetch-all-grades";

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7, 8] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept", 2: "Oct", 3: "Nov-Dic", 4: "Ene-Feb",
  5: "Marzo", 6: "Abril", 7: "Mayo", 8: "Junio",
};

export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
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
  if (effectiveProfile.role === "viewer")
    return NextResponse.json({ error: "No access" }, { status: 403 });

  // ── Fetch data ──
  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", params.groupId)
    .single();

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order")
    .eq("grade", group.grade)
    .order("sort_order");

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num")
    .eq("group_id", params.groupId)
    .eq("status", "activo")
    .order("list_num");

  const studentIds = (students || []).map((s) => s.id);
  const allGrades = studentIds.length > 0
    ? await fetchAllGrades(supabase, studentIds, {
        columns: "student_id, subject_id, period, score, absences",
      })
    : [];

  // Build grade map
  const gradeMap: Record<string, Record<string, Record<number, { score: number | null; absences: number }>>> = {};
  allGrades.forEach((g) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id]) gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = { score: g.score, absences: g.absences };
  });

  const subs = subjects || [];
  const studs = students || [];

  // ── Helper functions ──
  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
  }

  function getAbsences(studentId: string, subjectId: string, period: number): number {
    return gradeMap[studentId]?.[subjectId]?.[period]?.absences ?? 0;
  }

  function getTrimesterAvg(studentId: string, subjectId: string, trimester: { periods: number[] }): number | null {
    const scores = trimester.periods.map((p) => getScore(studentId, subjectId, p)).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  function getSubjectFinal(studentId: string, subjectId: string): number | null {
    const avgs = TRIMESTERS.map((t) => getTrimesterAvg(studentId, subjectId, t)).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function getGeneralAvg(studentId: string): number | null {
    const avgs = subs.filter((s) => s.counts_for_avg).map((s) => getSubjectFinal(studentId, s.id)).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  function getTotalAbsences(studentId: string, subjectId: string): number {
    return [1, 2, 3, 4, 5, 6, 7, 8].reduce((sum, p) => sum + getAbsences(studentId, subjectId, p), 0);
  }

  // ── Build workbook ──
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mnemósine — Instituto Don Vasco";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  const subHeaderFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  const subHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 9 };

  function semaforoFill(score: number | null): ExcelJS.Fill | undefined {
    if (score === null) return undefined;
    if (score < 7) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    if (score < 8) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    return { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  // ═══════════ HOJA 1: RESUMEN GENERAL ═══════════
  const wsGen = wb.addWorksheet(`Concentrado ${group.grade}°${group.letter}`);

  // Title row
  wsGen.mergeCells(1, 1, 1, 2 + subs.length * 2 + 1);
  const titleCell = wsGen.getCell(1, 1);
  titleCell.value = `Concentrado de Calificaciones — ${group.grade}° "${group.letter}" — Ciclo 2026-2027`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: "center" };

  // Headers row 3
  const hRow = 3;
  wsGen.getCell(hRow, 1).value = "N°";
  wsGen.getCell(hRow, 2).value = "Alumno";
  wsGen.getColumn(1).width = 5;
  wsGen.getColumn(2).width = 30;

  let col = 3;
  for (const s of subs) {
    wsGen.mergeCells(hRow, col, hRow, col + 1);
    wsGen.getCell(hRow, col).value = s.short_name + (s.counts_for_avg ? "" : " (N/C)");
    wsGen.getColumn(col).width = 7;
    wsGen.getColumn(col + 1).width = 5;
    col += 2;
  }
  wsGen.getCell(hRow, col).value = "Prom. Gral.";
  wsGen.getColumn(col).width = 10;

  // Sub-headers row 4
  const shRow = 4;
  wsGen.getCell(shRow, 1).value = "";
  wsGen.getCell(shRow, 2).value = "";
  let col2 = 3;
  for (const s of subs) {
    wsGen.getCell(shRow, col2).value = "Cal.";
    wsGen.getCell(shRow, col2 + 1).value = "IA";
    col2 += 2;
  }

  // Style headers
  const lastCol = 2 + subs.length * 2 + 1;
  for (let c = 1; c <= lastCol; c++) {
    const cell3 = wsGen.getCell(hRow, c);
    cell3.fill = headerFill;
    cell3.font = headerFont;
    cell3.alignment = { horizontal: "center", vertical: "middle" };
    cell3.border = thinBorder;

    const cell4 = wsGen.getCell(shRow, c);
    cell4.fill = subHeaderFill;
    cell4.font = subHeaderFont;
    cell4.alignment = { horizontal: "center" };
    cell4.border = thinBorder;
  }

  // Data rows
  studs.forEach((student, idx) => {
    const row = shRow + 1 + idx;
    wsGen.getCell(row, 1).value = student.list_num;
    wsGen.getCell(row, 1).alignment = { horizontal: "center" };
    wsGen.getCell(row, 2).value = student.full_name;
    wsGen.getCell(row, 2).font = { size: 9 };

    let c = 3;
    for (const s of subs) {
      const final = getSubjectFinal(student.id, s.id);
      const abs = getTotalAbsences(student.id, s.id);

      const scoreCell = wsGen.getCell(row, c);
      scoreCell.value = final !== null ? Math.round(final) : null;
      scoreCell.alignment = { horizontal: "center" };
      const fill = semaforoFill(final);
      if (fill) scoreCell.fill = fill;

      const absCell = wsGen.getCell(row, c + 1);
      absCell.value = abs || null;
      absCell.alignment = { horizontal: "center" };
      absCell.font = { size: 9, color: { argb: "FF6B7280" } };

      c += 2;
    }

    const genAvg = getGeneralAvg(student.id);
    const genCell = wsGen.getCell(row, c);
    genCell.value = genAvg !== null ? Math.round(genAvg * 10) / 10 : null;
    genCell.alignment = { horizontal: "center" };
    genCell.font = { bold: true, size: 10 };
    const gFill = semaforoFill(genAvg);
    if (gFill) genCell.fill = gFill;

    // Borders for entire row
    for (let cc = 1; cc <= lastCol; cc++) {
      wsGen.getCell(row, cc).border = thinBorder;
    }
  });

  // ═══════════ HOJAS POR TRIMESTRE ═══════════
  for (const trim of TRIMESTERS) {
    const ws = wb.addWorksheet(`${trim.id}° Trimestre`);

    ws.mergeCells(1, 1, 1, 2 + subs.length * (trim.periods.length * 2 + 2) + 1);
    const tCell = ws.getCell(1, 1);
    tCell.value = `${trim.name} — ${group.grade}° "${group.letter}" — Ciclo 2026-2027`;
    tCell.font = { bold: true, size: 12 };
    tCell.alignment = { horizontal: "center" };

    // Row 3: subject names
    const r1 = 3;
    ws.getCell(r1, 1).value = "N°";
    ws.getCell(r1, 2).value = "Alumno";
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;

    let c = 3;
    for (const s of subs) {
      const span = trim.periods.length * 2 + 2;
      ws.mergeCells(r1, c, r1, c + span - 1);
      ws.getCell(r1, c).value = s.short_name;
      c += span;
    }
    ws.getCell(r1, c).value = "Prom. Trim.";

    // Row 4: period names
    const r2 = 4;
    c = 3;
    for (const s of subs) {
      for (const p of trim.periods) {
        ws.mergeCells(r2, c, r2, c + 1);
        ws.getCell(r2, c).value = PERIOD_NAMES[p];
        ws.getColumn(c).width = 6;
        ws.getColumn(c + 1).width = 4;
        c += 2;
      }
      ws.mergeCells(r2, c, r2, c + 1);
      ws.getCell(r2, c).value = "Prom.";
      ws.getColumn(c).width = 6;
      ws.getColumn(c + 1).width = 4;
      c += 2;
    }
    ws.getColumn(c).width = 10;

    // Row 5: Cal/IA
    const r3 = 5;
    c = 3;
    for (const s of subs) {
      for (const p of trim.periods) {
        ws.getCell(r3, c).value = "Cal.";
        ws.getCell(r3, c + 1).value = "IA";
        c += 2;
      }
      ws.getCell(r3, c).value = "Cal.";
      ws.getCell(r3, c + 1).value = "IA";
      c += 2;
    }

    // Style header rows
    const lastC = c;
    for (let rr = r1; rr <= r3; rr++) {
      for (let cc = 1; cc <= lastC; cc++) {
        const cell = ws.getCell(rr, cc);
        cell.fill = rr === r1 ? headerFill : subHeaderFill;
        cell.font = rr === r1 ? headerFont : subHeaderFont;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = thinBorder;
      }
    }

    // Data
    studs.forEach((student, idx) => {
      const row = r3 + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const s of subs) {
        for (const p of trim.periods) {
          const score = getScore(student.id, s.id, p);
          const abs = getAbsences(student.id, s.id, p);

          const sc = ws.getCell(row, c);
          sc.value = score !== null ? Math.round(score) : null;
          sc.alignment = { horizontal: "center" };
          const f = semaforoFill(score);
          if (f) sc.fill = f;

          const ac = ws.getCell(row, c + 1);
          ac.value = abs || null;
          ac.alignment = { horizontal: "center" };
          ac.font = { size: 9, color: { argb: "FF6B7280" } };

          c += 2;
        }

        const trimAvg = getTrimesterAvg(student.id, s.id, trim);
        const trimAbs = trim.periods.reduce((sum, p) => sum + getAbsences(student.id, s.id, p), 0);

        const tc = ws.getCell(row, c);
        tc.value = trimAvg !== null ? Math.round(trimAvg) : null;
        tc.alignment = { horizontal: "center" };
        tc.font = { bold: true };
        const tf = semaforoFill(trimAvg);
        if (tf) tc.fill = tf;

        const tac = ws.getCell(row, c + 1);
        tac.value = trimAbs || null;
        tac.alignment = { horizontal: "center" };
        tac.font = { size: 9, color: { argb: "FF6B7280" } };

        c += 2;
      }

      // Trim general avg
      const trimGenAvg = (() => {
        const avgs = subs.filter((s) => s.counts_for_avg).map((s) => getTrimesterAvg(student.id, s.id, trim)).filter((a): a is number => a !== null);
        if (avgs.length === 0) return null;
        return avgs.reduce((a, b) => a + b, 0) / avgs.length;
      })();

      const gc = ws.getCell(row, c);
      gc.value = trimGenAvg !== null ? Math.round(trimGenAvg * 10) / 10 : null;
      gc.alignment = { horizontal: "center" };
      gc.font = { bold: true, size: 10 };
      const gf = semaforoFill(trimGenAvg);
      if (gf) gc.fill = gf;

      for (let cc = 1; cc <= lastC; cc++) {
        ws.getCell(row, cc).border = thinBorder;
      }
    });
  }

  // ── Generate buffer ──
  const buffer = await wb.xlsx.writeBuffer();

  const filename = `Concentrado_${group.grade}${group.letter}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
