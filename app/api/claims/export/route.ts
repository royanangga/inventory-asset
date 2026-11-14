import ExcelJS from "exceljs";
import { listClaims } from "../../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rows = await listClaims({ q: p.get("q") ?? undefined, claim_to: p.get("claim_to") ?? undefined, status: p.get("status") ?? undefined });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Claim Customer");
  ws.columns = [
    { header: "Claim ke", key: "claim_to", width: 14 }, { header: "Jatuh Tempo", key: "due_date", width: 12 },
    { header: "GL", key: "gl_account", width: 10 }, { header: "Vendor", key: "vendor", width: 32 },
    { header: "Project / Model", key: "project", width: 18 }, { header: "PO", key: "po_no", width: 14 },
    { header: "Nama Barang", key: "item_name", width: 44 }, { header: "Inventory Asset", key: "amount", width: 18 },
    { header: "Trans", key: "trans_ref", width: 12 }, { header: "COA Expense", key: "expense_coa", width: 12 },
    { header: "Sales Tooling", key: "sales_tooling", width: 16 }, { header: "Expense", key: "expense_amount", width: 16 },
    { header: "FA Amount", key: "fa_amount", width: 16 }, { header: "FA Date", key: "fa_date", width: 12 },
    { header: "Remark", key: "remark", width: 40 }, { header: "MVD", key: "mvd_status", width: 30 }, { header: "MVD (ket.)", key: "mvd_note", width: 18 },
  ];
  for (const r of rows) ws.addRow(r);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const k of ["amount", "sales_tooling", "expense_amount", "fa_amount"]) ws.getColumn(k).numFmt = "#,##0.00";
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="claim-customer-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
