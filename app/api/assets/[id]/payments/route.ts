import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import { bad } from "../../../../../lib/api";
import { cleanPayment, isUnique, recalcAsset } from "../../../../../lib/payments";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const rows = await sql`select id, asset_id, stage, amount, pay_date from asset_payments where asset_id = ${Number(id)} order by id`;
  return NextResponse.json(rows);
}

/** Tambah pembayaran (DP berikutnya / FINAL). Nominalnya otomatis ditambahkan ke Inventory Asset (Purchase). */
export async function POST(req: Request, { params }: Ctx) {
  const assetId = Number((await params).id);
  const p = cleanPayment(await req.json().catch(() => null));
  if (p.error) return p.error;
  try {
    const result = await sql.begin(async (tx: any) => {
      const [asset] = await tx`select id from assets where id = ${assetId} for update`;
      if (!asset) return { err: bad("Aset tidak ditemukan", 404) };
      const [fin] = await tx`select 1 from asset_payments where asset_id = ${assetId} and stage = 'FINAL'`;
      if (fin) return { err: bad("Pembayaran sudah FINAL, tidak bisa menambah tahap lagi") };
      await tx`insert into asset_payments (asset_id, stage, amount, pay_date) values (${assetId}, ${p.data!.stage}, ${p.data!.amount}, ${p.data!.pay_date})`;
      return { asset: await recalcAsset(tx, assetId) };
    });
    if (result.err) return result.err;
    return NextResponse.json(result.asset, { status: 201 });
  } catch (e) {
    if (isUnique(e)) return bad(`${p.data!.stage} sudah tercatat untuk aset ini`);
    throw e;
  }
}
