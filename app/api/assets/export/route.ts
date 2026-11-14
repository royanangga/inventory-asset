import ExcelJS from "exceljs";
import { allAssets } from "../../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rows = await allAssets({ q: p.get("q") ?? undefined, gl: p.get("gl") ?? undefined, project: p.get("project") ?? undefined,
    plant: p.get("plant") ?? undefined, check: p.get("check") ?? undefined, due: p.get("due") ?? undefined, dueon: p.get("dueon") ?? undefined, pay: p.get("pay") ?? undefined });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventory Asset");
  ws.columns = [
    { header: "GL", key: "gl_account", width: 10 }, { header: "Nama Akun", key: "gl_name", width: 26 },
    { header: "Trans", key: "trans_no", width: 10 }, { header: "Vendor", key: "vendor", width: 32 },
    { header: "Project / Model", key: "project", width: 18 }, { header: "Ringgisho", key: "ringgisho_no", width: 14 },
    { header: "PO", key: "po_no", width: 14 }, { header: "Div#Plant", key: "div_plant", width: 10 },
    { header: "Tgl", key: "tgl", width: 12 }, { header: "Product Code", key: "product_code", width: 18 },
    { header: "Part Number", key: "part_number", width: 16 }, { header: "Nama Barang", key: "item_name", width: 48 },
    { header: "Qty", key: "qty", width: 7 }, { header: "Ringgisho PUR (LC)", key: "ringgisho_lc", width: 18 },
    { header: "Kesaisho - Sales", key: "kesaisho_sales", width: 18 }, { header: "Inventory Asset", key: "amount", width: 18 },
    { header: "Claim", key: "claim_to", width: 14 }, { header: "Jatuh Tempo", key: "due_date", width: 12 },
    { header: "Status Pembayaran", key: "payment_status", width: 18 },
  ];
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const k of ["ringgisho_lc", "kesaisho_sales", "amount"]) ws.getColumn(k).numFmt = "#,##0.00";
  const last = ws.rowCount + 1;
  const tot = ws.addRow({ item_name: "TOTAL", amount: { formula: `SUM(P2:P${last - 1})` } as any });
  tot.font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventory-asset-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
