import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { bad, cleanClaim } from "../../../../lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const c = cleanClaim(await req.json().catch(() => null));
  const [row] = await sql`update asset_claims set ${sql(c, ...Object.keys(c))}, updated_at = now() where id = ${Number(id)} returning *`;
  if (!row) return bad("Claim tidak ditemukan", 404);
  return NextResponse.json(row);
}

/** Batalkan claim (aset tetap ada di inventory) */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const r = await sql`delete from asset_claims where id = ${Number(id)} returning id`;
  if (!r.length) return bad("Claim tidak ditemukan", 404);
  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const [row] = await sql`select * from asset_claims where id = ${Number(id)}`;
  if (!row) return bad("Claim tidak ditemukan", 404);
  return NextResponse.json(row);
}
