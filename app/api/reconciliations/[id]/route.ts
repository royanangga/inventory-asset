import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { loadRecon } from "../../../../lib/reconData";
import { bad } from "../../../../lib/api";
import { parseNumber } from "../../../../lib/format";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const data = await loadRecon(Number((await params).id));
  return data ? NextResponse.json(data) : bad("Tidak ditemukan", 404);
}

export async function PUT(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Data tidak valid");
  const [cur] = await sql`select status from reconciliations where id = ${id}`;
  if (!cur) return bad("Tidak ditemukan", 404);

  // Buka kembali rekonsiliasi final
  if (cur.status === "final") {
    if (body.status !== "draft") return bad("Rekonsiliasi sudah final. Buka kembali untuk mengubah.", 409);
    await sql`update reconciliations set status = 'draft', finalized_at = null, updated_at = now() where id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return bad("Judul wajib diisi");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.as_of ?? ""))) return bad("Tanggal posisi tidak valid");
  const lines: { gl_account: string; tb_balance: unknown }[] = Array.isArray(body.lines) ? body.lines : [];
  const adjs: { gl_account: string; description: string; amount: unknown }[] = Array.isArray(body.adjustments) ? body.adjustments : [];
  for (const a of adjs) {
    if (!String(a.description ?? "").trim()) return bad("Keterangan penyesuaian wajib diisi");
    if (parseNumber(a.amount as any) === null) return bad("Nilai penyesuaian tidak valid");
  }

  await sql.begin(async (tx: any) => {
    await tx`update reconciliations set title = ${title}, as_of = ${body.as_of}, notes = ${body.notes ? String(body.notes) : null}, updated_at = now() where id = ${id}`;
    for (const l of lines) {
      const tb = l.tb_balance === null || l.tb_balance === "" ? null : parseNumber(l.tb_balance as any);
      await tx`insert into reconciliation_lines (reconciliation_id, gl_account, gl_name, tb_balance)
               select ${id}::int, g.code, g.name, ${tb}::numeric from gl_accounts g where g.code = ${l.gl_account}
               on conflict (reconciliation_id, gl_account) do update set tb_balance = excluded.tb_balance, gl_name = excluded.gl_name`;
    }
    await tx`delete from reconciliation_adjustments where reconciliation_id = ${id}`;
    for (const a of adjs) {
      await tx`insert into reconciliation_adjustments (reconciliation_id, gl_account, description, amount)
               values (${id}, ${a.gl_account}, ${String(a.description).trim()}, ${parseNumber(a.amount as any)})`;
    }
    if (body.status === "final") {
      // simpan snapshot saldo sistem saat ini agar hasil final tidak berubah bila aset diedit kemudian
      await tx`insert into reconciliation_lines (reconciliation_id, gl_account, gl_name)
               select ${id}::int, code, name from gl_accounts on conflict do nothing`;
      await tx`update reconciliation_lines l set
                 system_balance = coalesce((select sum(amount) from assets a where a.gl_account = l.gl_account), 0),
                 system_count = (select count(*)::int from assets a where a.gl_account = l.gl_account)
               where l.reconciliation_id = ${id}`;
      await tx`update reconciliations set status = 'final', finalized_at = now() where id = ${id}`;
    }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const r = await sql`delete from reconciliations where id = ${id} returning id`;
  return r.length ? NextResponse.json({ ok: true }) : bad("Tidak ditemukan", 404);
}
