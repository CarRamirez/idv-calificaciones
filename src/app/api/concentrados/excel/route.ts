import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/impersonation";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { fetchAllGrades } from "@/lib/fetch-all-grades";

const ADMIN_ROLES = ["admin", "directora_anita"];

const TRIMESTERS = [
  { id: 1, name: "1er Trimestre", periods: [1, 2] },
  { id: 2, name: "2do Trimestre", periods: [3, 4] },
  { id: 3, name: "3er Trimestre", periods: [5, 6, 7, 8] },
];

const PERIOD_NAMES: Record<number, string> = {
  1: "Sept", 2: "Oct", 3: "Nov-Dic", 4: "Ene-Feb",
  5: "Marzo", 6: "Abril", 7: "Mayo", 8: "Junio",
};

export async function GET(req: NextRequest) {
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
  if (!ADMIN_ROLES.includes(effectiveProfile.role))
    return NextResponse.json({ error: "No access" }, { status: 403 });

  // ── Query params ──
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const filterMode = searchParams.get("filterMode") || "general"; // month | trimester | general
  const periodParam = searchParams.get("period"); // 1-8
  const trimesterParam = searchParams.get("trimester"); // 1-3
  const subjectIdParam = searchParams.get("subjectId"); // uuid or "all"

  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  // ── Fetch data ──
  const { data: group } = await supabase
    .from("groups")
    .select("id, grade, letter")
    .eq("id", groupId)
    .single();

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const { data: allSubjects } = await supabase
    .from("subjects")
    .select("id, name, short_name, counts_for_avg, sort_order, grade")
    .eq("grade", group.grade)
    .order("sort_order");

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, list_num")
    .eq("group_id", groupId)
    .eq("status", "activo")
    .order("list_num");

  const subs = (allSubjects || []);
  const studs = students || [];
  const displaySubjects = subjectIdParam && subjectIdParam !== "all"
    ? subs.filter((s) => s.id === subjectIdParam)
    : subs;

  const studentIds = studs.map((s) => s.id);
  const allGrades = studentIds.length > 0
    ? await fetchAllGrades(supabase, studentIds, {
        columns: "student_id, subject_id, period, score",
      })
    : [];

  // Grade map
  const gradeMap: Record<string, Record<string, Record<number, { score: number | null }>>> = {};
  allGrades.forEach((g: any) => {
    if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
    if (!gradeMap[g.student_id][g.subject_id]) gradeMap[g.student_id][g.subject_id] = {};
    gradeMap[g.student_id][g.subject_id][g.period] = { score: g.score };
  });

  function getScore(studentId: string, subjectId: string, period: number): number | null {
    return gradeMap[studentId]?.[subjectId]?.[period]?.score ?? null;
  }
  function getTrimesterAvg(studentId: string, subjectId: string, periods: number[]): number | null {
    const scores = periods.map((p) => getScore(studentId, subjectId, p)).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  function getSubjectFinal(studentId: string, subjectId: string): number | null {
    const avgs = TRIMESTERS.map((t) => getTrimesterAvg(studentId, subjectId, t.periods)).filter((a): a is number => a !== null);
    if (avgs.length === 0) return null;
    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
  }

  // ── Workbook setup ──
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mnemósine — Instituto Don Vasco";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4E9E" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
  const subHeaderFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
  const subHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 9 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

  function semaforoFill(score: number | null): ExcelJS.Fill | undefined {
    if (score === null) return undefined;
    if (score < 7) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    if (score < 8) return { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    return { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  }

  function applyStyle(ws: ExcelJS.Worksheet, row: number, cols: number, isSub = false) {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getCell(row, c);
      cell.fill = isSub ? subHeaderFill : headerFill;
      cell.font = isSub ? subHeaderFont : headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    }
  }

  const now = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "long" });

  // ═══════════ MONTH VIEW ═══════════
  if (filterMode === "month" && periodParam) {
    const period = parseInt(periodParam);
    const periodName = PERIOD_NAMES[period] || `P${period}`;
    const ws = wb.addWorksheet(`${periodName}`);

    const lastCol = 2 + displaySubjects.length;
    ws.mergeCells(1, 1, 1, lastCol);
    ws.getCell(1, 1).value = `Concentrado — ${group.grade}° "${group.letter}" — ${periodName} — Ciclo 2026-2027`;
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, lastCol);
    ws.getCell(2, 1).value = `Generado: ${now}`;
    ws.getCell(2, 1).font = { size: 9, italic: true, color: { argb: "FF666666" } };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    const hRow = 4;
    ws.getCell(hRow, 1).value = "N°";
    ws.getCell(hRow, 2).value = "Alumno";
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;

    let col = 3;
    for (const s of displaySubjects) {
      ws.getCell(hRow, col).value = s.short_name + (s.counts_for_avg ? "" : " (N/C)");
      ws.getColumn(col).width = 8;
      col += 1;
    }

    applyStyle(ws, hRow, lastCol);

    studs.forEach((student, idx) => {
      const row = hRow + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const s of displaySubjects) {
        const score = getScore(student.id, s.id, period);

        const sc = ws.getCell(row, c);
        sc.value = score !== null ? Math.round(score) : null;
        sc.alignment = { horizontal: "center" };
        const f = semaforoFill(score);
        if (f) sc.fill = f;

        c += 1;
      }

      for (let cc = 1; cc <= lastCol; cc++) ws.getCell(row, cc).border = thinBorder;
    });
  }

  // ═══════════ TRIMESTER VIEW ═══════════
  if (filterMode === "trimester" && trimesterParam) {
    const trimId = parseInt(trimesterParam);
    const trim = TRIMESTERS.find((t) => t.id === trimId);
    if (!trim) return NextResponse.json({ error: "Invalid trimester" }, { status: 400 });

    const ws = wb.addWorksheet(trim.name);
    const colsPerSubject = trim.periods.length + 1; // period cols + prom
    const lastCol = 2 + displaySubjects.length * colsPerSubject + 1; // +1 for trim general avg

    ws.mergeCells(1, 1, 1, lastCol);
    ws.getCell(1, 1).value = `Concentrado — ${group.grade}° "${group.letter}" — ${trim.name} — Ciclo 2026-2027`;
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, lastCol);
    ws.getCell(2, 1).value = `Generado: ${now}`;
    ws.getCell(2, 1).font = { size: 9, italic: true, color: { argb: "FF666666" } };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    // Row 4: subject names
    const r1 = 4;
    ws.getCell(r1, 1).value = "N°";
    ws.getCell(r1, 2).value = "Alumno";
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;

    let c = 3;
    for (const s of displaySubjects) {
      ws.mergeCells(r1, c, r1, c + colsPerSubject - 1);
      ws.getCell(r1, c).value = s.short_name + (s.counts_for_avg ? "" : " (N/C)");
      c += colsPerSubject;
    }
    ws.getCell(r1, c).value = "Prom. Trim.";
    ws.getColumn(c).width = 10;

    // Row 5: period names + prom
    const r2 = 5;
    c = 3;
    for (const _s of displaySubjects) {
      for (const p of trim.periods) {
        ws.getCell(r2, c).value = PERIOD_NAMES[p];
        ws.getColumn(c).width = 7;
        c += 1;
      }
      ws.getCell(r2, c).value = "Prom.";
      ws.getColumn(c).width = 7;
      c += 1;
    }

    for (let rr = r1; rr <= r2; rr++) applyStyle(ws, rr, lastCol, rr > r1);

    studs.forEach((student, idx) => {
      const row = r2 + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const s of displaySubjects) {
        for (const p of trim.periods) {
          const score = getScore(student.id, s.id, p);
          const sc = ws.getCell(row, c);
          sc.value = score !== null ? Math.round(score) : null;
          sc.alignment = { horizontal: "center" };
          const f = semaforoFill(score);
          if (f) sc.fill = f;
          c += 1;
        }
        const trimAvg = getTrimesterAvg(student.id, s.id, trim.periods);
        const tc = ws.getCell(row, c);
        tc.value = trimAvg !== null ? Math.round(trimAvg) : null;
        tc.alignment = { horizontal: "center" };
        tc.font = { bold: true };
        const tf = semaforoFill(trimAvg);
        if (tf) tc.fill = tf;
        c += 1;
      }

      // Trim general avg
      const curAvgs = subs
        .filter((s) => s.counts_for_avg)
        .map((s) => getTrimesterAvg(student.id, s.id, trim.periods))
        .filter((a): a is number => a !== null);
      const trimGenAvg = curAvgs.length > 0 ? curAvgs.reduce((a, b) => a + b, 0) / curAvgs.length : null;
      const gc = ws.getCell(row, c);
      gc.value = trimGenAvg !== null ? Math.round(trimGenAvg * 10) / 10 : null;
      gc.alignment = { horizontal: "center" };
      gc.font = { bold: true, size: 10 };
      const gf = semaforoFill(trimGenAvg);
      if (gf) gc.fill = gf;

      for (let cc = 1; cc <= lastCol; cc++) ws.getCell(row, cc).border = thinBorder;
    });
  }

  // ═══════════ GENERAL VIEW ═══════════
  if (filterMode === "general") {
    const ws = wb.addWorksheet(`General ${group.grade}°${group.letter}`);
    const lastCol = 2 + displaySubjects.length + 1;

    ws.mergeCells(1, 1, 1, lastCol);
    ws.getCell(1, 1).value = `Concentrado General — ${group.grade}° "${group.letter}" — Ciclo 2026-2027`;
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(1, 1).alignment = { horizontal: "center" };

    ws.mergeCells(2, 1, 2, lastCol);
    ws.getCell(2, 1).value = `Generado: ${now}`;
    ws.getCell(2, 1).font = { size: 9, italic: true, color: { argb: "FF666666" } };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    const hRow = 4;
    ws.getCell(hRow, 1).value = "N°";
    ws.getCell(hRow, 2).value = "Alumno";
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 30;

    let col = 3;
    for (const s of displaySubjects) {
      ws.getCell(hRow, col).value = s.short_name + (s.counts_for_avg ? "" : " (N/C)");
      ws.getColumn(col).width = 8;
      col += 1;
    }
    ws.getCell(hRow, col).value = "Prom. Gral.";
    ws.getColumn(col).width = 10;

    applyStyle(ws, hRow, lastCol);

    studs.forEach((student, idx) => {
      const row = hRow + 1 + idx;
      ws.getCell(row, 1).value = student.list_num;
      ws.getCell(row, 1).alignment = { horizontal: "center" };
      ws.getCell(row, 2).value = student.full_name;
      ws.getCell(row, 2).font = { size: 9 };

      let c = 3;
      for (const s of displaySubjects) {
        const final = getSubjectFinal(student.id, s.id);

        const sc = ws.getCell(row, c);
        sc.value = final !== null ? Math.round(final) : null;
        sc.alignment = { horizontal: "center" };
        const f = semaforoFill(final);
        if (f) sc.fill = f;

        c += 1;
      }

      const curAvgs = subs
        .filter((s) => s.counts_for_avg)
        .map((s) => getSubjectFinal(student.id, s.id))
        .filter((a): a is number => a !== null);
      const genAvg = curAvgs.length > 0 ? curAvgs.reduce((a, b) => a + b, 0) / curAvgs.length : null;

      const gc = ws.getCell(row, c);
      gc.value = genAvg !== null ? Math.round(genAvg * 10) / 10 : null;
      gc.alignment = { horizontal: "center" };
      gc.font = { bold: true, size: 10 };
      const gf = semaforoFill(genAvg);
      if (gf) gc.fill = gf;

      for (let cc = 1; cc <= lastCol; cc++) ws.getCell(row, cc).border = thinBorder;
    });
  }

  // ── Generate ──
  const buffer = await wb.xlsx.writeBuffer();
  const modeLabel = filterMode === "month" ? PERIOD_NAMES[parseInt(periodParam || "1")]
    : filterMode === "trimester" ? `T${trimesterParam}`
    : "General";
  const filename = `Concentrado_${group.grade}${group.letter}_${modeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
