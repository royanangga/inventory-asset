import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { SCHEMA_SQL } from "../../../lib/schema";

export const dynamic = "force-dynamic";

async function status() {
  const [t] = await sql`select to_regclass('public.assets') is not null as ready`;
  if (!t.ready) return { ready: false, assets: 0 };
  const [c] = await sql`select count(*)::int as n from assets`;
  return { ready: true, assets: c.n as number };
}

export async function GET() {
  try { return NextResponse.json(await status()); }
  catch (e: any) { return NextResponse.json({ error: "Tidak bisa terhubung ke database: " + (e?.message ?? "") }, { status: 500 }); }
}

/** Membuat tabel (aman dijalankan berulang) */
export async function POST() {
  try {
    await sql.unsafe(SCHEMA_SQL);
    return NextResponse.json(await status());
  } catch (e: any) {
    return NextResponse.json({ error: "Gagal membuat tabel: " + (e?.message ?? "") }, { status: 500 });
  }
}
