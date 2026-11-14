import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { bad, cleanClaim } from "../../../lib/api";

export const dynamic = "force-dynamic";

/** Buat claim untuk sebuah aset (jika sudah ada, datanya diperbarui). Wajib: asset_id dan tanggal jatuh tempo. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const assetId = Number(body?.asset_id);
  if (!Number.isFinite(assetId)) return bad("Aset tidak valid");
  const c = cleanClaim(body);
  if (!c.due_date) return bad("Tanggal jatuh tempo wajib diisi untuk claim ke customer");
  const [asset] = await sql`select id from assets where id = ${assetId}`;
  if (!asset) return bad("Aset tidak ditemukan", 404);
  const row: Record<string, any> = { asset_id: assetId, ...c };
  const cols = Object.keys(row);
  const [saved] = await sql`insert into asset_claims ${sql(row, ...cols)}
    on conflict (asset_id) do update set ${sql(c, ...Object.keys(c))}, updated_at = now() returning *`;
  return NextResponse.json(saved, { status: 201 });
}
