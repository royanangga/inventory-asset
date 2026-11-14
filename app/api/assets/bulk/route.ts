import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { bad } from "../../../../lib/api";
import { isPaymentStatus } from "../../../../lib/types";

export async function POST(req: Request) {
  const { ids, gl_account, action, due_date, payment_status } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) return bad("Pilih minimal satu aset");
  const list = ids.map(Number).filter(Number.isFinite);
  if (action === "delete") {
    const r = await sql`delete from assets where id in ${sql(list)} returning id`;
    return NextResponse.json({ affected: r.length });
  }
  if (action === "due") {
    if (due_date !== null && due_date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(String(due_date))) return bad("Tanggal tidak valid");
    const r = await sql`update assets set due_date = ${due_date || null}, updated_at = now() where id in ${sql(list)} returning id`;
    return NextResponse.json({ affected: r.length });
  }
  if (action === "payment") {
    if (!isPaymentStatus(payment_status)) return bad("Status pembayaran tidak valid");
    const r = await sql`update assets set payment_status = ${payment_status}, updated_at = now() where id in ${sql(list)} returning id`;
    return NextResponse.json({ affected: r.length });
  }
  const [acc] = gl_account ? await sql`select code from gl_accounts where code = ${gl_account}` : [null];
  if (!acc) return bad("Akun GL tidak valid");
  const r = await sql`update assets set gl_account = ${gl_account}, updated_at = now() where id in ${sql(list)} returning id`;
  return NextResponse.json({ affected: r.length });
}
