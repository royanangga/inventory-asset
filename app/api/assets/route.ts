import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { listAssets } from "../../../lib/queries";
import { bad, cleanAsset } from "../../../lib/api";

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
  const a = cleanAsset(await req.json().catch(() => null));
  if (!a.vendor && !a.item_name && !a.product_code) return bad("Isi minimal Vendor, Nama Barang, atau Product Code");
  const [row] = await sql`insert into assets ${sql(a, ...Object.keys(a))} returning *`;
  return NextResponse.json(row, { status: 201 });
}
