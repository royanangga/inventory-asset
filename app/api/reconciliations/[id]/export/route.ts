import ExcelJS from "exceljs";
import { loadRecon } from "../../../../../lib/reconData";
import { allAssets } from "../../../../../lib/queries";
import { computeLine } from "../../../../../lib/recon";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const data = await loadRecon(Number((await params).id));
  if (!data) return new Response("Tidak ditemukan", { status: 404 });
  const { recon, lines, adjustments, unassigned } = data;
  const res = lines.map((l) => computeLine(l, adjustments));
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Rekonsiliasi");
  ws.addRow([recon.title]).font = { bold: true, size: 14 };
  ws.addRow([`Posisi per ${recon.as_of} · Status: ${recon.status === "final" ? "FINAL" : "DRAFT"}`]);
  ws.addRow([]);
  const head = ws.addRow(["Akun GL", "Nama Akun", "Saldo TB", "Saldo Sistem", "Jml Item", "Selisih (TB - Sistem)", "Dijelaskan", "Belum Dijelaskan", "Status"]);
  head.font = { bold: true };
  head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }));
  const statusText = { empty: "Belum diisi", match: "Sesuai", explained: "Selisih terjelaskan", diff: "Ada selisih" } as const;
  const first = ws.rowCount + 1;
  for (const l of res) ws.addRow([l.gl_account, l.gl_name, l.tb_balance, l.system_balance, l.system_count, l.diff, l.explained, l.unexplained, statusText[l.status]]);
  const last = ws.rowCount;
  const tot = ws.addRow(["", "TOTAL", { formula: `SUM(C${first}:C${last})` }, { formula: `SUM(D${first}:D${last})` }, { formula: `SUM(E${first}:E${last})` },
    { formula: `SUM(F${first}:F${last})` }, { formula: `SUM(G${first}:G${last})` }, { formula: `SUM(H${first}:H${last})` }, ""] as any);
  tot.font = { bold: true };
  for (const k of [3, 4, 6, 7, 8]) ws.getColumn(k).numFmt = "#,##0.00;[Red]-#,##0.00";
  [10, 28, 20, 20, 10, 22, 18, 20, 20].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  if (unassigned.count) ws.addRow([`Catatan: ${unassigned.count} aset senilai ${unassigned.amount} belum punya akun GL dan tidak ikut direkonsiliasi.`]);
  if (recon.notes) { ws.addRow([]); ws.addRow(["Catatan:", recon.notes]); }

  const wa = wb.addWorksheet("Penyesuaian");
  wa.addRow(["Akun GL", "Keterangan", "Nilai"]).font = { bold: true };
  for (const a of adjustments) wa.addRow([a.gl_account, a.description, a.amount]);
  wa.getColumn(3).numFmt = "#,##0.00;[Red]-#,##0.00";
  [10, 70, 20].forEach((w, i) => (wa.getColumn(i + 1).width = w));

  const wd = wb.addWorksheet("Detail Aset (saat ini)");
  wd.addRow(["Akun GL", "Vendor", "Project", "PO", "Product Code", "Nama Barang", "Inventory Asset"]).font = { bold: true };
  for (const a of (await allAssets({})) as any[]) wd.addRow([a.gl_account, a.vendor, a.project, a.po_no, a.product_code, a.item_name, a.amount]);
  wd.getColumn(7).numFmt = "#,##0.00;[Red]-#,##0.00";
  [10, 32, 16, 14, 18, 50, 18].forEach((w, i) => (wd.getColumn(i + 1).width = w));

  const buf = await wb.xlsx.writeBuffer();
  const safe = recon.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "rekonsiliasi";
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe}.xlsx"`,
    },
  });
}
