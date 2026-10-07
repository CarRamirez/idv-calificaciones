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

const PENALTY_SHORT_NAMES = new Set(["TAR", "INAS", "INC"]);

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
        columns: "student_id, subject_id, period, score",
      })
    : [];

  // Build grade map
  const gradeMap: Record<string, Record<string, Record<number, { score: number | null }>>> = {};
  allGrades.forEach((g) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id]) gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = { score: g.score };
  });

  const subs = subjects || [];
  const studs = students || [];

  // ── Helper functions ──
  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
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
  wsGen.mergeCells(1, 1, 1, 2 + subs.length + 1);
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
    wsGen.getCell(hRow, col).value = s.short_name + (s.counts_for_avg ? "" : " (N/C)");
    wsGen.getColumn(col).width = 8;
    col += 1;
  }
  wsGen.getCell(hRow, col).value = "Prom. Gral.";
  wsGen.getColumn(col).width = 10;

  // Style headers
  const lastCol = 2 + subs.length + 1;
  for (let c = 1; c <= lastCol; c++) {
    const cell3 = wsGen.getCell(hRow, c);
    cell3.fill = headerFill;
    cell3.font = headerFont;
    cell3.alignment = { horizontal: "center", vertical: "middle" };
    cell3.border = thinBorder;
  }

  // Data rows (start at row 4 — no sub-header row needed)
  studs.forEach((student, idx) => {
    const row = hRow + 1 + idx;
    wsGen.getCell(row, 1).value = student.list_num;
    wsGen.getCell(row, 1).alignment = { horizontal: "center" };
    wsGen.getCell(row, 2).value = student.full_name;
    wsGen.getCell(row, 2).font = { size: 9 };

    let c = 3;
    for (const s of subs) {
      const final = getSubjectFinal(student.id, s.id);

      const scoreCell = wsGen.getCell(row, c);
      scoreCell.value = final !== null ? Math.round(final) : null;
      scoreCell.alignment = { horizontal: "center" };
      const fill = semaforoFill(final);
      if (fill) scoreCell.fill = fill;

      c += 1;
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

  // Penalty totals row (general sheet)
  const penaltyFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  const penaltyFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFDC2626" }, size: 9 };
  if (subs.some((s) => PENALTY_SHORT_NAMES.has(s.short_name))) {
    const pRow = hRow + 1 + studs.length;
    wsGen.getCell(pRow, 1).value = "";
    wsGen.getCell(pRow, 2).value = "TOTAL INCIDENCIAS";
    wsGen.getCell(pRow, 2).font = { bold: true, size: 9 };
    wsGen.getCell(pRow, 2).fill = penaltyFill;
    wsGen.getCell(pRow, 1).fill = penaltyFill;

    let pc = 3;
    for (const s of subs) {
      const cell = wsGen.getCell(pRow, pc);
      if (PENALTY_SHORT_NAMES.has(s.short_name)) {
        const total = studs.reduce((sum, st) => {
          const f = getSubjectFinal(st.id, s.id);
          return sum + (f != null ? Math.round(f) : 0);
        }, 0);
        cell.value = total > 0 ? total : null;
        cell.font = penaltyFont;
      }
      cell.fill = penaltyFill;
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder;
      pc++;
    }
    wsGen.getCell(pRow, pc).fill = penaltyFill;
    wsGen.getCell(pRow, pc).border = thinBorder;
  }

  // ═══════════ HOJAS POR TRIMESTRE ═══════════
  for (const trim of TRIMESTERS) {
    const ws = wb.addWorksheet(`${trim.id}° Trimestre`);

    ws.mergeCells(1, 1, 1, 2 + subs.length * (trim.periods.length + 1) + 1);
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
      const span = trim.periods.length + 1;
      ws.mergeCells(r1, c, r1, c + span - 1);
      ws.getCell(r1, c).value = s.short_name;
      c += span;
    }
    ws.getCell(r1, c).value = "Prom. Trim.";

    // Row 4: period names + Prom
    const r2 = 4;
    c = 3;
    for (const s of subs) {
      for (const p of trim.periods) {
        ws.getCell(r2, c).value = PERIOD_NAMES[p];
        ws.getColumn(c).width = 7;
        c += 1;
      }
      ws.getCell(r2, c).value = "Prom.";
      ws.getColumn(c).width = 7;
      c += 1;
    }
    ws.getColumn(c).width = 10;

    // Style header rows
    const lastC = c;
    for (let rr = r1; rr <= r2; rr++) {
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
      const row = r2 + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const s of subs) {
        for (const p of trim.periods) {
          const score = getScore(student.id, s.id, p);

          const sc = ws.getCell(row, c);
          sc.value = score !== null ? Math.round(score) : null;
          sc.alignment = { horizontal: "center" };
          const f = semaforoFill(score);
          if (f) sc.fill = f;

          c += 1;
        }

        const trimAvg = getTrimesterAvg(student.id, s.id, trim);

        const tc = ws.getCell(row, c);
        tc.value = trimAvg !== null ? Math.round(trimAvg) : null;
        tc.alignment = { horizontal: "center" };
        tc.font = { bold: true };
        const tf = semaforoFill(trimAvg);
        if (tf) tc.fill = tf;

        c += 1;
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

    // Penalty totals row for trimester sheet
    if (subs.some((s) => PENALTY_SHORT_NAMES.has(s.short_name))) {
      const pRow = r2 + 1 + studs.length;
      ws.getCell(pRow, 1).value = "";
      ws.getCell(pRow, 1).fill = penaltyFill;
      ws.getCell(pRow, 2).value = "TOTAL INCIDENCIAS";
      ws.getCell(pRow, 2).font = { bold: true, size: 9 };
      ws.getCell(pRow, 2).fill = penaltyFill;

      let pc = 3;
      for (const s of subs) {
        if (PENALTY_SHORT_NAMES.has(s.short_name)) {
          // Per-period totals
          for (const p of trim.periods) {
            const cell = ws.getCell(pRow, pc);
            const total = studs.reduce((sum, st) => sum + (getScore(st.id, s.id, p) ?? 0), 0);
            cell.value = total > 0 ? total : null;
            cell.font = penaltyFont;
            cell.fill = penaltyFill;
            cell.alignment = { horizontal: "center" };
            cell.border = thinBorder;
            pc++;
          }
          // Trimester avg total
          const cell = ws.getCell(pRow, pc);
          const trimTotal = studs.reduce((sum, st) => {
            const avg = getTrimesterAvg(st.id, s.id, trim);
            return sum + (avg != null ? Math.round(avg) : 0);
          }, 0);
          cell.value = trimTotal > 0 ? trimTotal : null;
          cell.font = penaltyFont;
          cell.fill = penaltyFill;
          cell.alignment = { horizontal: "center" };
          cell.border = thinBorder;
          pc++;
        } else {
          // Empty cells for non-penalty subjects
          for (let i = 0; i <= trim.periods.length; i++) {
            const cell = ws.getCell(pRow, pc);
            cell.fill = penaltyFill;
            cell.border = thinBorder;
            pc++;
          }
        }
      }
      // Prom. Trim. cell
      ws.getCell(pRow, pc).fill = penaltyFill;
      ws.getCell(pRow, pc).border = thinBorder;
    }
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
