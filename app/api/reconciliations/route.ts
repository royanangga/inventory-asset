import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { listRecons } from "../../../lib/reconData";
import { bad } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listRecons());
}

export async function POST(req: Request) {
  const { title, as_of } = await req.json().catch(() => ({}));
  const t = String(title ?? "").trim();
  if (!t) return bad("Judul wajib diisi");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(as_of ?? ""))) return bad("Tanggal posisi tidak valid");
  const id = await sql.begin(async (tx: any) => {
    const [r] = await tx`insert into reconciliations (title, as_of) values (${t}, ${as_of}) returning id`;
    await tx`insert into reconciliation_lines (reconciliation_id, gl_account, gl_name)
             select ${r.id}::int, code, name from gl_accounts`;
    return r.id as number;
  });
  return NextResponse.json({ id }, { status: 201 });
}
