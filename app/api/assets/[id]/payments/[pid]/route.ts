import { NextResponse } from "next/server";
import { sql } from "../../../../../../lib/db";
import { bad } from "../../../../../../lib/api";
import { cleanPayment, isUnique, recalcAsset } from "../../../../../../lib/payments";

type Ctx = { params: Promise<{ id: string; pid: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id, pid } = await params;
  const assetId = Number(id), payId = Number(pid);
  const p = cleanPayment(await req.json().catch(() => null));
  if (p.error) return p.error;
  try {
    const result = await sql.begin(async (tx: any) => {
      await tx`select id from assets where id = ${assetId} for update`;
      const r = await tx`update asset_payments set stage = ${p.data!.stage}, amount = ${p.data!.amount}, pay_date = ${p.data!.pay_date}, updated_at = now()
        where id = ${payId} and asset_id = ${assetId} returning id`;
      if (!r.length) return { err: bad("Pembayaran tidak ditemukan", 404) };
      return { asset: await recalcAsset(tx, assetId) };
    });
    if (result.err) return result.err;
    return NextResponse.json(result.asset);
  } catch (e) {
    if (isUnique(e)) return bad(`${p.data!.stage} sudah tercatat untuk aset ini`);
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, pid } = await params;
  const assetId = Number(id), payId = Number(pid);
  const result = await sql.begin(async (tx: any) => {
    await tx`select id from assets where id = ${assetId} for update`;
    const [{ n }] = await tx`select count(*)::int as n from asset_payments where asset_id = ${assetId}`;
    if (n <= 1) return { err: bad("Minimal harus ada satu pembayaran. Untuk menghapus seluruhnya, hapus asetnya.") };
    const r = await tx`delete from asset_payments where id = ${payId} and asset_id = ${assetId} returning id`;
    if (!r.length) return { err: bad("Pembayaran tidak ditemukan", 404) };
    return { asset: await recalcAsset(tx, assetId) };
  });
  if (result.err) return result.err;
  return NextResponse.json(result.asset);
}
