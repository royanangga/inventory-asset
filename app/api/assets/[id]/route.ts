import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { bad, cleanAsset } from "../../../../lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const a = cleanAsset(await req.json().catch(() => null));
  const [row] = await sql`update assets set ${sql(a, ...Object.keys(a))}, updated_at = now() where id = ${Number(id)} returning *`;
  if (!row) return bad("Aset tidak ditemukan", 404);
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const r = await sql`delete from assets where id = ${Number(id)} returning id`;
  if (!r.length) return bad("Aset tidak ditemukan", 404);
  return NextResponse.json({ ok: true });
}
