import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { getAccounts } from "../../../lib/queries";
import { bad } from "../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAccounts());
}

export async function POST(req: Request) {
  const { code, name } = await req.json().catch(() => ({}));
  const c = String(code ?? "").trim(), n = String(name ?? "").trim();
  if (!c || !n) return bad("Kode dan nama akun wajib diisi");
  const [{ next }] = await sql`select coalesce(max(sort_order),0)+1 as next from gl_accounts`;
  const r = await sql`insert into gl_accounts (code, name, sort_order) values (${c}, ${n}, ${next})
    on conflict (code) do update set name = excluded.name returning *`;
  return NextResponse.json(r[0], { status: 201 });
}
