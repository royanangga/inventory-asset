import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { listAssets } from "../../../lib/queries";
import { bad, cleanAsset } from "../../../lib/api";
import { cleanPayment, isUnique } from "../../../lib/payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Math.min(Number(p.get("limit") ?? 50) || 50, 1000);
  const data = await listAssets(
    { q: p.get("q") ?? undefined, gl: p.get("gl") ?? undefined, project: p.get("project") ?? undefined,
      plant: p.get("plant") ?? undefined, check: p.get("check") ?? undefined, due: p.get("due") ?? undefined, dueon: p.get("dueon") ?? undefined, pay: p.get("pay") ?? undefined },
    Number(p.get("page") ?? 1) || 1, limit);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const a = cleanAsset(body);
  if (!a.vendor && !a.item_name && !a.product_code) return bad("Isi minimal Vendor, Nama Barang, atau Product Code");
  // Pembayaran pertama (DP 1 dst. atau FINAL) → nominalnya menjadi Inventory Asset (Purchase)
  const p = cleanPayment({ stage: body?.payment_status, amount: body?.payment_amount, pay_date: body?.payment_date });
  if (p.error) return p.error;
  a.amount = p.data!.amount;
  a.payment_status = p.data!.stage;
  try {
    const row = await sql.begin(async (tx: any) => {
      const [asset] = await tx`insert into assets ${tx(a, ...Object.keys(a))} returning *`;
      await tx`insert into asset_payments (asset_id, stage, amount, pay_date) values (${asset.id}, ${p.data!.stage}, ${p.data!.amount}, ${p.data!.pay_date})`;
      return asset;
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (isUnique(e)) return bad("Tahap pembayaran sudah ada");
    throw e;
  }
}
